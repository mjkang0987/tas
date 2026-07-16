import crypto from 'crypto';

import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../db/prisma';
import {normalizeTel} from '../../../../client/features/customers/model';
import {calcEndTime, joinServiceNames} from '../../../../client/features/services/model';
import {areServicesBookable} from '../../../../client/features/store-settings/model';
import {
    computeAvailableSlots,
    pickAssigneeForSlot,
    timeToMinutes,
    type SlotAssignee,
    type SlotReservation,
} from '../../../../client/features/booking/availability';
import {notifySlackForStore} from '../../../notify/slack';
import {syncNaverBookingsForStore} from '../../naver-booking-sync';
import {
    dayIndexOf,
    evaluateDateWindow,
    findBookableStore,
    isValidDateStr,
    isValidTimeStr,
    loadBookingSettings,
} from '../booking-helpers';

interface ReserveBody {
    date?: unknown;
    startTime?: unknown;
    services?: unknown;
    assigneeId?: unknown;
    name?: unknown;
    tel?: unknown;
}

function newPublicToken(): string {
    return crypto.randomBytes(24).toString('base64url');
}

// 공개(비로그인) 예약 생성. 서버가 슬롯을 권위 있게 재검증하고, 겹침·레이스를 트랜잭션으로 방어한다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    const body = (req.body ?? {}) as ReserveBody;

    const dateStr = body.date;
    const startTime = body.startTime;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const tel = normalizeTel(typeof body.tel === 'string' ? body.tel : '');
    const serviceNames = Array.isArray(body.services)
        ? body.services.filter((s): s is string => typeof s === 'string' && s.length > 0)
        : [];
    const requestedAssigneeId = typeof body.assigneeId === 'string' && body.assigneeId ? body.assigneeId : null;

    // 입력 검증
    if (!isValidDateStr(dateStr)) return res.status(400).json({error: 'invalid_date'});
    if (!isValidTimeStr(startTime)) return res.status(400).json({error: 'invalid_time'});
    if (!name) return res.status(400).json({error: 'invalid_name'});
    if (tel.length < 10 || tel.length > 11) return res.status(400).json({error: 'invalid_tel'});
    if (serviceNames.length === 0) return res.status(400).json({error: 'no_service'});

    const store = await findBookableStore(slug);
    if (!store) return res.status(404).json({error: 'not_found'});

    const settings = await loadBookingSettings(store.id);
    const dayIndex = dayIndexOf(dateStr);

    const [services, closedRows, businessHour, assigneeRows] = await Promise.all([
        prisma.service.findMany({where: {storeId: store.id, name: {in: serviceNames}}, select: {name: true, duration: true, price: true}}),
        prisma.storeClosedDate.findMany({where: {storeId: store.id}, select: {date: true}}),
        prisma.storeBusinessHour.findUnique({where: {storeId_dayIndex: {storeId: store.id, dayIndex}}, select: {openTime: true, closeTime: true, enabled: true}}),
        prisma.assignee.findMany({where: {storeId: store.id, status: 'active'}, select: {id: true, schedules: {select: {dayIndex: true, enabled: true, startTime: true, endTime: true}}}}),
    ]);

    if (services.length !== serviceNames.length) return res.status(400).json({error: 'unknown_service'});
    // 노출 화이트리스트(1c) 밖 서비스는 거부
    if (!areServicesBookable(serviceNames, settings.bookableServiceNames)) return res.status(400).json({error: 'not_bookable'});
    const durationMin = services.reduce((sum, s) => sum + s.duration, 0);
    const price = services.reduce((sum, s) => sum + s.price, 0);
    const endTime = calcEndTime(startTime, durationMin);
    const serviceSummary = joinServiceNames(serviceNames);

    const closedDates = closedRows.map((c) => c.date.toISOString().slice(0, 10));
    const window = evaluateDateWindow(dateStr, settings, closedDates);
    if (!window.ok) return res.status(409).json({error: 'unavailable_date'});

    const assignees: SlotAssignee[] = assigneeRows.map((a) => ({id: a.id, schedules: a.schedules}));
    const assigneeId = settings.allowAssigneeChoice && requestedAssigneeId && assignees.some((a) => a.id === requestedAssigneeId)
        ? requestedAssigneeId
        : null;

    const date = new Date(`${dateStr}T00:00:00`);

    // 겹침 재검증 + 생성을 원자화(Serializable). legacyId/token 충돌 시 재시도.
    let publicToken: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const reservationRows = await tx.reservation.findMany({
                    where: {storeId: store.id, date, status: {in: ['active', 'requested']}},
                    select: {assigneeId: true, startTime: true, endTime: true},
                });
                const reservations: SlotReservation[] = reservationRows.map((r) => ({
                    assigneeId: r.assigneeId,
                    startTime: r.startTime,
                    endTime: r.endTime,
                }));

                const slots = computeAvailableSlots({
                    dayIndex,
                    businessHour: businessHour ?? null,
                    durationMin,
                    slotIntervalMin: settings.slotIntervalMin,
                    minStartMinute: window.minStartMinute,
                    reservations,
                    assigneeId,
                    assignees,
                });
                if (!slots.includes(startTime)) return {status: 'slot_taken' as const};

                // 상관없음이면 그 슬롯에 실제 배정할 담당자 하나 선택(없으면 미배정)
                const finalAssigneeId = assigneeId
                    ?? pickAssigneeForSlot({dayIndex, durationMin, reservations, assignees, startMinute: timeToMinutes(startTime)});

                // 고객 upsert: 정규화 tel로 조회, 없으면 legacyId 부여 생성
                let customer = await tx.customer.findFirst({where: {storeId: store.id, tel}, select: {id: true}});
                if (customer) {
                    // 더블클릭·재시도 중복 방지: 같은 고객이 같은 슬롯에 이미 active 예약이 있으면 거부
                    const dup = await tx.reservation.findFirst({
                        where: {storeId: store.id, customerId: customer.id, date, startTime, status: {in: ['active', 'requested']}},
                        select: {id: true},
                    });
                    if (dup) return {status: 'duplicate' as const};
                } else {
                    const maxCustomer = await tx.customer.findFirst({where: {storeId: store.id}, orderBy: {legacyId: 'desc'}, select: {legacyId: true}});
                    customer = await tx.customer.create({
                        data: {storeId: store.id, legacyId: (maxCustomer?.legacyId ?? 0) + 1, name, tel},
                        select: {id: true},
                    });
                }

                const maxReservation = await tx.reservation.findFirst({where: {storeId: store.id}, orderBy: {legacyId: 'desc'}, select: {legacyId: true}});
                const created = await tx.reservation.create({
                    data: {
                        storeId: store.id,
                        legacyId: (maxReservation?.legacyId ?? 0) + 1,
                        customerId: customer.id,
                        assigneeId: finalAssigneeId,
                        date,
                        startTime,
                        endTime,
                        serviceSummary,
                        status: 'requested',
                        price,
                        channel: 'online',
                        publicToken: newPublicToken(),
                    },
                    select: {publicToken: true},
                });

                return {status: 'ok' as const, publicToken: created.publicToken};
            }, {isolationLevel: 'Serializable'});

            if (result.status === 'slot_taken') return res.status(409).json({error: 'slot_taken'});
            if (result.status === 'duplicate') return res.status(409).json({error: 'duplicate'});
            publicToken = result.publicToken;
            break;
        } catch (e) {
            const code = (e as {code?: string}).code;
            // P2002=unique 충돌(legacyId/token), P2034=직렬화 재시도 → 다음 시도
            if (code === 'P2002' || code === 'P2034') continue;
            throw e;
        }
    }

    if (!publicToken) return res.status(409).json({error: 'retry_exhausted'});

    // 알림은 커밋 성공 후 별도 격리 — 실패해도 예약 성공(201)에는 영향 주지 않는다.
    try {
        await notifySlackForStore(store.id,
            `🔔 *온라인 예약 신청*\n• 날짜: ${dateStr}`
            + `\n• 시간: ${startTime}~${endTime}`
            + `\n• 시술: ${serviceSummary}`
            + `\n• 고객: ${name}`
            + `\n앱에서 확정/거절해 주세요.`,
        );
    } catch { /* 알림 실패는 무시 */ }

    // 네이버 예약 겹침 2중 검증: 신청 접수 후 백그라운드로 매장 Gmail 동기화(비동기, 실패 무시).
    // 동기화로 새 네이버 예약이 들어와 겹치면 기존 충돌감지·오너 확정 흐름에서 걸러진다.
    void syncNaverBookingsForStore(store.id).catch(() => { /* 백그라운드 — 실패 무시 */ });

    return res.status(201).json({publicToken, date: dateStr, startTime, endTime, serviceSummary, storeName: store.name});
}
