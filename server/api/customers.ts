import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from '../db/prisma';
import {createWithFreeLegacyId, isUniqueConflict, nextCustomerLegacyId} from '../db/legacy-id';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbCustomerToFrontend, frontendPaymentMethodToDb} from '../db/mappers';
import {notifySlackOpsError} from '../notify/slack';
import type {Customer, PointHistoryType} from '../../client/features/customers/model';
import {DELETED_CUSTOMER_NAME, normalizeTel} from '../../client/features/customers/model';
import {RECEIVED_PAYMENT_METHODS} from '../../client/features/reservations/model';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const dbCustomers = await prisma.customer.findMany({
            where: {storeId: session.storeId},
            include: {
                memoTags: true,
                pointHistories: {
                    orderBy: {createdAt: 'asc'},
                    include: {relatedReservation: {select: {legacyId: true}}},
                },
            },
            orderBy: {legacyId: 'asc'},
        });

        const customers = dbCustomers.map(dbCustomerToFrontend);
        return res.status(200).json({customers});
    }

    if (req.method === 'POST') {
        // 단일 고객 빠른 저장 — 신규 고객을 만든 직후 예약을 추가할 때, 전체 목록
        // PUT(느림)이 끝나기 전에 예약 POST가 먼저 도착해 'Customer not found'(400)가
        // 나던 문제를 막기 위함. 호출 측은 이 응답을 await한 뒤 예약을 POST한다.
        if (!requireRole(session, 'staff', res)) return;

        const {customer} = req.body as { customer: Customer };
        if (!customer || !Number.isInteger(customer.id) || customer.id <= 0
            || typeof customer.name !== 'string' || !customer.name.trim() || typeof (customer.tel ?? '') !== 'string') {
            return res.status(400).json({error: 'Invalid customer payload'});
        }

        const data = {
            name: customer.name,
            tel: normalizeTel(customer.tel ?? ''),
            points: customer.points ?? 0,
            firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
        };

        // 생성 전용 — 같은 번호의 다른 고객을 **덮어쓰지 않는다**(예전 upsert 는 화면과 서버 번호가 겹치면 남의 고객을 바꿨다).
        const existing = await prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: customer.id}},
            select: {name: true, tel: true, deletedAt: true},
        });
        // 같은 요청의 재시도(이미 같은 사람으로 저장됨)는 그대로 성공. 연락처가 없으면 이름만 같은 다른 사람일 수 있어 새로 만든다.
        if (existing && !existing.deletedAt && data.tel && existing.name === data.name && existing.tel === data.tel) {
            return res.status(201).json({ok: true, id: customer.id});
        }

        try {
            const created = await createWithFreeLegacyId(
                customer.id,
                !existing,
                () => nextCustomerLegacyId(session.storeId),
                (legacyId) => prisma.customer.create({
                    data: {storeId: session.storeId, legacyId, ...data},
                    select: {legacyId: true},
                }),
            );
            // 번호가 바뀌었을 수 있다 — 화면은 이 번호로 고객을 옮긴다.
            return res.status(201).json({ok: true, id: created.legacyId});
        } catch (err) {
            if (isUniqueConflict(err)) return res.status(409).json({error: 'Customer id conflict'});
            throw err;
        }
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'staff', res)) return;

        const {customers} = req.body as { customers: Customer[] };

        if (!Array.isArray(customers)) {
            return res.status(400).json({error: 'Invalid customers payload'});
        }

        // 트랜잭션 밖에서 읽기를 일괄 처리해 트랜잭션 안의 N+1 왕복을 제거한다.
        // (고객 수가 많을 때 인터랙티브 트랜잭션 5초 제한을 넘겨 P2028로 실패하던 문제)
        const legacyIds = customers.map((c) => c.id);

        const existingCustomers = await prisma.customer.findMany({
            where: {storeId: session.storeId, legacyId: {in: legacyIds}},
            select: {id: true, legacyId: true, deletedAt: true},
        });
        // 삭제(익명 처리)된 고객은 건너뛴다 — 다른 기기의 오래된 목록이 실명·메모를 다시 써 넣지 못하게.
        const deletedLegacyIds = new Set(existingCustomers.filter((c) => c.deletedAt).map((c) => c.legacyId));

        // 고객별 기존 포인트이력 id 집합 (중복 생성 방지용)
        const existingHistoryByCustomer = new Map<string, Set<string>>();
        if (existingCustomers.length > 0) {
            const histories = await prisma.customerPointHistory.findMany({
                where: {customerId: {in: existingCustomers.map((c) => c.id)}},
                select: {id: true, customerId: true},
            });
            for (const h of histories) {
                const set = existingHistoryByCustomer.get(h.customerId) ?? new Set<string>();
                set.add(h.id);
                existingHistoryByCustomer.set(h.customerId, set);
            }
        }

        // 새 포인트이력이 참조하는 예약 legacyId → cuid 매핑 일괄 조회
        const allRelatedLegacyIds = Array.from(new Set(
            customers.flatMap((c) =>
                (c.pointHistories ?? [])
                    .filter((h) => h.relatedReservationId)
                    .map((h) => h.relatedReservationId!),
            ),
        ));
        const reservationLegacyToCuid = new Map<number, string>();
        if (allRelatedLegacyIds.length > 0) {
            const relatedReservations = await prisma.reservation.findMany({
                where: {storeId: session.storeId, legacyId: {in: allRelatedLegacyIds}},
                select: {id: true, legacyId: true},
            });
            for (const r of relatedReservations) {
                if (r.legacyId != null) reservationLegacyToCuid.set(r.legacyId, r.id);
            }
        }

        try {
            await prisma.$transaction(async (tx) => {
                for (const customer of customers) {
                    if (deletedLegacyIds.has(customer.id)) continue;
                    const savedCustomer = await tx.customer.upsert({
                        where: {storeId_legacyId: {storeId: session.storeId, legacyId: customer.id}},
                        update: {
                            name: customer.name,
                            tel: normalizeTel(customer.tel),
                            points: customer.points ?? 0,
                            firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                        },
                        create: {
                            storeId: session.storeId,
                            legacyId: customer.id,
                            name: customer.name,
                            tel: normalizeTel(customer.tel),
                            points: customer.points ?? 0,
                            firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                        },
                    });

                    await tx.customerMemoTag.deleteMany({where: {customerId: savedCustomer.id}});

                    if (Array.isArray(customer.memoTags) && customer.memoTags.length > 0) {
                        await tx.customerMemoTag.createMany({
                            data: customer.memoTags.map((tag) => ({
                                customerId: savedCustomer.id,
                                text: tag.text,
                                color: tag.color,
                            })),
                        });
                    }

                    const existingHistoryIds = existingHistoryByCustomer.get(savedCustomer.id) ?? new Set<string>();
                    const newHistories = (customer.pointHistories ?? []).filter((h) => !existingHistoryIds.has(h.id));

                    if (newHistories.length > 0) {
                        await tx.customerPointHistory.createMany({
                            data: newHistories.map((h) => ({
                                id: h.id,
                                customerId: savedCustomer.id,
                                type: h.type as PointHistoryType,
                                delta: h.delta,
                                balance: h.balance,
                                description: h.description,
                                createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
                                relatedReservationId: h.relatedReservationId
                                    ? reservationLegacyToCuid.get(h.relatedReservationId) ?? null
                                    : null,
                                // 충전 때 받은 돈(매출) — 충전 이력에만 있다.
                                // 충전만, 실제로 받는 결제수단만, int4 범위만 — 아니면 매출에 잘못 잡히거나 일괄 저장 전체가 500 으로 깨진다.
                                ...(h.type === 'recharge' && Number.isInteger(h.paidAmount) && h.paidAmount! >= 0 && h.paidAmount! <= 2_147_483_647
                                    && h.paymentMethod && (RECEIVED_PAYMENT_METHODS as readonly string[]).includes(h.paymentMethod)
                                    ? {paidAmount: h.paidAmount, paymentMethod: frontendPaymentMethodToDb(h.paymentMethod)}
                                    : {paidAmount: null, paymentMethod: null}),
                            })),
                        });
                    }
                }
            }, {timeout: 30000, maxWait: 10000});
        } catch (error) {
            console.error('PUT /api/customers 저장 실패:', error);
            await notifySlackOpsError('PUT /api/customers (저장)', error);
            return res.status(500).json({error: 'Failed to save customers'});
        }

        return res.status(200).json({customers});
    }

    if (req.method === 'DELETE') {
        // 고객 삭제 = 익명 처리(되돌릴 수 없음). 오너 전용.
        // 예전엔 행을 지워 cascade 로 예약·결제 내역까지 사라져 **과거 매출이 소급해 빠졌다.**
        // 이제 행과 예약(시술 내역)은 남기고, 그 사람을 알아볼 수 있는 정보·메모만 지운다(0023, plan.md).
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as { id: number };
        if (typeof id !== 'number' || Number.isNaN(id)) {
            return res.status(400).json({error: 'Invalid customer id'});
        }

        const customer = await prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: id}},
            select: {id: true, deletedAt: true},
        });
        if (!customer) {
            return res.status(404).json({error: 'Customer not found'});
        }
        if (customer.deletedAt) {
            return res.status(200).json({ok: true});
        }

        await prisma.$transaction([
            // 병합 건너뛰기 기록 — FK 가 없어 고아로 남는다(`customers-merge.ts` 참조).
            prisma.customerMergeSkip.deleteMany({
                where: {
                    storeId: session.storeId,
                    OR: [{maskedId: id}, {candidateId: id}],
                },
            }),
            // 예전에 개별 삭제한 온라인 예약의 흔적 — 고객 관리 링크가 계속 조회되지 않게.
            prisma.deletedBooking.deleteMany({where: {customerId: customer.id}}),
            // 병합 이력 — 합쳐진 고객의 이름·연락처 스냅샷이 있다. 지우면 이 고객은 분리할 수 없다.
            prisma.customerMergeHistory.deleteMany({
                where: {
                    storeId: session.storeId,
                    OR: [
                        {targetCustomerJson: {path: ['id'], equals: customer.id}},
                        {sourceCustomerJson: {path: ['id'], equals: customer.id}},
                    ],
                },
            }),
            prisma.customerMemoTag.deleteMany({where: {customerId: customer.id}}),
            // 적립금 이력은 지우되, 받은 돈이 기록된 충전(매출)은 남긴다 — 지우면 지난 매출이 사라진다(개인정보 없음).
            prisma.customerPointHistory.deleteMany({where: {customerId: customer.id, NOT: {type: 'recharge', paidAmount: {not: null}}}}),
            // 예약 변경 이력 — 전후 스냅샷에 메모·변경 요청 내용이 남는다.
            prisma.reservationHistory.deleteMany({where: {reservation: {customerId: customer.id}}}),
            // 예약은 시술 내역·매출로 남기고 개인정보가 담길 수 있는 칸만 비운다. naverBookingId 는 남긴다 —
            // 지우면 다음 네이버 동기화가 같은 예약을 새 고객으로 다시 가져와 개인정보가 되살아난다.
            prisma.reservation.updateMany({
                where: {customerId: customer.id},
                data: {
                    memo: null,
                    naverBookingUrl: null,
                    publicToken: null,
                    pendingPayloadJson: Prisma.DbNull,
                    decisionReason: null,
                },
            }),
            // 남은 회원권·쿠폰은 "삭제되는 정보"로 안내했다 — 기록(돈 받고 준 이력)은 남기고 더는 쓸 수 없게 취소한다.
            prisma.customerMembership.updateMany({
                where: {customerId: customer.id, status: 'active'},
                data: {status: 'cancelled'},
            }),
            prisma.customerCoupon.updateMany({
                where: {customerId: customer.id, status: 'active'},
                data: {status: 'cancelled'},
            }),
            prisma.customer.update({
                where: {id: customer.id},
                data: {
                    name: DELETED_CUSTOMER_NAME,
                    tel: '',
                    points: 0,
                    firstVisitDate: null,
                    deletedAt: new Date(),
                },
            }),
        ]);
        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
