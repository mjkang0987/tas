import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbCustomerToFrontend} from '../db/mappers';
import {notifySlackOpsError} from '../notify/slack';
import type {Customer, PointHistoryType} from '../../client/features/customers/model';
import {normalizeTel} from '../../client/features/customers/model';

// 다음 고객 legacyId(빈 번호) = 현재 최대 + 1. null legacyId 행이 desc 정렬에서
// 먼저 오지 않도록 not-null로 걸러 안전하게 계산한다.
async function allocateCustomerLegacyId(storeId: string): Promise<number> {
    const max = await prisma.customer.findFirst({
        where: {storeId, legacyId: {not: null}},
        orderBy: {legacyId: 'desc'},
        select: {legacyId: true},
    });
    return (max?.legacyId ?? 0) + 1;
}

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
        if (!customer || typeof customer.id !== 'number') {
            return res.status(400).json({error: 'Invalid customer payload'});
        }

        const data = {
            name: customer.name,
            tel: normalizeTel(customer.tel),
            points: customer.points ?? 0,
            firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
            allergyNote: customer.allergyNote ?? null,
            claimNote: customer.claimNote ?? null,
            preferenceNote: customer.preferenceNote ?? null,
        };

        // 클라이언트는 화면에 로드된 목록 기준으로 legacyId를 매긴다. 그 사이 네이버 백그라운드
        // 동기화 등이 만든 '다른' 고객이 같은 번호를 이미 쓰고 있으면, 예전 upsert는 그 남의 고객을
        // 조용히 덮어써 데이터가 섞였다. 이제: 그 번호가 비었거나 같은 고객(동명)이면 그대로 저장(멱등),
        // 다른 고객이면 서버가 빈 번호를 새로 매겨 생성하고 실제 부여 번호를 응답으로 돌려준다.
        // (호출측이 이 번호로 곧바로 예약을 걸어 올바른 고객을 참조하도록.)
        const existing = await prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: customer.id}},
            select: {name: true},
        });

        let assignedId = customer.id;
        // 이미 있는데 다른 사람(이름 불일치)이면 번호를 새로 매긴다. 같은 이름이면 재저장(멱등, 중복 클릭 방어).
        if (existing && existing.name !== customer.name) {
            assignedId = await allocateCustomerLegacyId(session.storeId);
        }

        for (let attempt = 0; ; attempt++) {
            try {
                await prisma.customer.upsert({
                    where: {storeId_legacyId: {storeId: session.storeId, legacyId: assignedId}},
                    update: data,
                    create: {storeId: session.storeId, legacyId: assignedId, ...data},
                });
                break;
            } catch (err) {
                // 새로 매긴 번호가 동시 요청과 겹치면 P2002 → 다시 매겨 재시도.
                if (attempt < 5 && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                    assignedId = await allocateCustomerLegacyId(session.storeId);
                    continue;
                }
                throw err;
            }
        }

        return res.status(201).json({ok: true, id: assignedId});
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
            select: {id: true},
        });

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
                    const savedCustomer = await tx.customer.upsert({
                        where: {storeId_legacyId: {storeId: session.storeId, legacyId: customer.id}},
                        update: {
                            name: customer.name,
                            tel: normalizeTel(customer.tel),
                            points: customer.points ?? 0,
                            firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                            allergyNote: customer.allergyNote ?? null,
                            claimNote: customer.claimNote ?? null,
                            preferenceNote: customer.preferenceNote ?? null,
                        },
                        create: {
                            storeId: session.storeId,
                            legacyId: customer.id,
                            name: customer.name,
                            tel: normalizeTel(customer.tel),
                            points: customer.points ?? 0,
                            firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                            allergyNote: customer.allergyNote ?? null,
                            claimNote: customer.claimNote ?? null,
                            preferenceNote: customer.preferenceNote ?? null,
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
        // 고객 영구 삭제(되돌릴 수 없음)는 오너 전용.
        // 해당 고객의 예약·적립금이력·메모태그는 cascade로 함께 삭제된다.
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as { id: number };
        if (typeof id !== 'number' || Number.isNaN(id)) {
            return res.status(400).json({error: 'Invalid customer id'});
        }

        const customer = await prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: id}},
            select: {id: true},
        });
        if (!customer) {
            return res.status(404).json({error: 'Customer not found'});
        }

        await prisma.customer.delete({where: {id: customer.id}});
        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
