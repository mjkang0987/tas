import type {NextApiRequest, NextApiResponse} from 'next';
import {randomBytes} from 'crypto';

import {prisma} from '../../../db/prisma';
import {notifySlackForStore} from '../../../notify/slack';
import {normalizeTel} from '../../../../client/features/customers/model';
import {minutesToTime, overlaps, timeToMinutes} from '../../../../client/features/booking/slots';
import {getAvailableSlots, isValidDateStr} from '../slots-service';

interface ReserveBody {
    date?: unknown;
    startTime?: unknown;
    serviceNames?: unknown;
    assigneeId?: unknown;
    name?: unknown;
    tel?: unknown;
}

function isHhmm(v: string): boolean {
    return /^\d{1,2}:\d{2}$/.test(v) && Number.isFinite(timeToMinutes(v));
}

// 공개(비로그인) 예약 생성. 슬롯을 서버가 재검증하고, 추측불가 publicToken(고객 관리 링크)을 발급한다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug.toLowerCase() : '';
    if (!slug) return res.status(404).json({error: 'not_found'});

    const body = (req.body ?? {}) as ReserveBody;
    const date = typeof body.date === 'string' ? body.date : '';
    const startTime = typeof body.startTime === 'string' ? body.startTime : '';
    const serviceNames = Array.isArray(body.serviceNames) ? body.serviceNames.filter((n): n is string => typeof n === 'string') : [];
    const rawAssigneeId = typeof body.assigneeId === 'string' && body.assigneeId ? body.assigneeId : null;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const tel = typeof body.tel === 'string' ? normalizeTel(body.tel) : '';

    if (!isValidDateStr(date)) return res.status(400).json({error: 'invalid_date'});
    if (!isHhmm(startTime)) return res.status(400).json({error: 'invalid_time'});
    if (serviceNames.length === 0) return res.status(400).json({error: 'no_service'});
    if (!name || name.length > 40) return res.status(400).json({error: 'invalid_name'});
    if (tel.length < 9 || tel.length > 11) return res.status(400).json({error: 'invalid_tel'});

    const store = await prisma.store.findFirst({
        where: {bookingSlug: slug, useOnlineBooking: true},
        select: {id: true},
    });
    if (!store) return res.status(404).json({error: 'not_found'});

    // 서비스 소요/가격은 서버 카탈로그를 신뢰(클라 값 무시). 요청한 이름이 전부 실재해야 한다.
    const services = await prisma.service.findMany({
        where: {storeId: store.id, name: {in: serviceNames}},
        select: {name: true, duration: true, price: true},
    });
    if (services.length !== new Set(serviceNames).size) return res.status(400).json({error: 'unknown_service'});
    const duration = services.reduce((sum, s) => sum + s.duration, 0);
    const price = services.reduce((sum, s) => sum + s.price, 0);
    const serviceSummary = services.map((s) => s.name).join(', ');
    if (duration <= 0) return res.status(400).json({error: 'invalid_duration'});

    // 담당자 선택 허용 여부 확인. 미허용이면 지정 무시(매장이 나중 배정 → null).
    const settingsRow = await prisma.storeBookingSettings.findUnique({
        where: {storeId: store.id},
        select: {allowAssigneeChoice: true},
    });
    const allowAssigneeChoice = settingsRow ? settingsRow.allowAssigneeChoice : true;
    let assigneeId: string | null = allowAssigneeChoice ? rawAssigneeId : null;
    if (assigneeId) {
        const ok = await prisma.assignee.findFirst({where: {id: assigneeId, storeId: store.id, status: 'active'}, select: {id: true}});
        if (!ok) return res.status(400).json({error: 'unknown_assignee'});
    }

    // 슬롯 재검증(권위): 요청 시각이 실제 예약 가능 슬롯이어야 한다.
    const {slots, ctx} = await getAvailableSlots({storeId: store.id, date, duration, assigneeId});
    if (ctx.outOfRange) return res.status(400).json({error: 'out_of_range'});
    if (!slots.includes(startTime)) return res.status(409).json({error: 'slot_unavailable'});

    const startMin = timeToMinutes(startTime);
    const endTime = minutesToTime(startMin + duration);
    const newInterval = {start: startMin, end: startMin + duration};
    const dayDate = new Date(`${date}T00:00:00`);

    // 트랜잭션: 겹침 재검증 + 고객 upsert(이름·정규화tel) + legacyId 채번 + 예약 생성.
    // legacyId 유니크 충돌(동시 생성) 시 재시도.
    const MAX_TRIES = 4;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
        try {
            const publicToken = randomBytes(24).toString('hex');
            const result = await prisma.$transaction(async (tx) => {
                // 겹침 재검증(트랜잭션 내 최신 상태).
                const dayRes = await tx.reservation.findMany({
                    where: {storeId: store.id, status: 'active', date: dayDate},
                    select: {assigneeId: true, startTime: true, endTime: true},
                });
                const toInterval = (r: {startTime: string; endTime: string}) => ({start: timeToMinutes(r.startTime), end: timeToMinutes(r.endTime)});
                if (assigneeId) {
                    const clash = dayRes.some((r) => r.assigneeId === assigneeId && overlaps(newInterval, toInterval(r)));
                    if (clash) return {conflict: true as const};
                } else {
                    // 담당자 무관: 겹치는 예약 수가 활성 담당자 수 이상이면 만석.
                    const activeCount = await tx.assignee.count({where: {storeId: store.id, status: 'active'}});
                    const capacity = activeCount > 0 ? activeCount : 1;
                    const used = dayRes.filter((r) => overlaps(newInterval, toInterval(r))).length;
                    if (used >= capacity) return {conflict: true as const};
                }

                // 고객: 동일 매장 + 정규화 tel 로 기존 고객 재사용, 없으면 신규(legacyId 채번).
                let customer = await tx.customer.findFirst({where: {storeId: store.id, tel}, select: {id: true}});
                if (!customer) {
                    const maxC = await tx.customer.aggregate({where: {storeId: store.id}, _max: {legacyId: true}});
                    customer = await tx.customer.create({
                        data: {storeId: store.id, legacyId: (maxC._max.legacyId ?? 0) + 1, name, tel},
                        select: {id: true},
                    });
                }

                const maxR = await tx.reservation.aggregate({where: {storeId: store.id}, _max: {legacyId: true}});
                const created = await tx.reservation.create({
                    data: {
                        storeId: store.id,
                        legacyId: (maxR._max.legacyId ?? 0) + 1,
                        customerId: customer.id,
                        assigneeId,
                        date: dayDate,
                        startTime,
                        endTime,
                        serviceSummary,
                        status: 'active',
                        price,
                        channel: 'online',
                        publicToken,
                    },
                    select: {publicToken: true},
                });
                return {created};
            });

            if ('conflict' in result) return res.status(409).json({error: 'slot_unavailable'});

            // 매장(오너) 알림. 실패해도 예약은 유효 — 조용히 무시.
            void notifySlackForStore(store.id,
                `🗓️ *새 온라인 예약*\n• 날짜: ${date} ${startTime}~${endTime}`
                + `\n• 시술: ${serviceSummary}`
                + `\n• 고객: ${name}`
            ).catch(() => {});

            return res.status(201).json({ok: true, publicToken: result.created.publicToken, date, startTime, endTime});
        } catch (e) {
            // legacyId 유니크 충돌이면 재시도, 그 외는 즉시 실패.
            const code = (e as {code?: string}).code;
            if (code === 'P2002' && attempt < MAX_TRIES - 1) continue;
            throw e;
        }
    }

    return res.status(409).json({error: 'conflict_retry'});
}
