import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../../db/prisma';
import {notifySlackForStore} from '../../../../notify/slack';
import {calcEndTime, joinServiceNames} from '../../../../../client/features/services/model';
import {areServicesBookable} from '../../../../../client/features/store-settings/model';
import {
    computeAvailableSlots,
    pickAssigneeForSlot,
    timeToMinutes,
    type SlotAssignee,
    type SlotReservation,
} from '../../../../../client/features/booking/availability';
import {
    dayIndexOf,
    evaluateDateWindow,
    findReservationByPublicToken,
    isValidDateStr,
    isValidTimeStr,
    loadBookingSettings,
} from '../../booking-helpers';

interface ChangeBody {
    date?: unknown;
    startTime?: unknown;
    services?: unknown;
    assigneeId?: unknown;
}

// 공개(비로그인) 예약 변경 "요청". 즉시 반영이 아니라, 새 슬롯을 검증해 payload로 저장하고
// 오너 승인 대기 상태로 전환한다. 실제 반영은 오너 수락 시 재검증 후 적용된다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const reservation = await findReservationByPublicToken(token);
    if (!reservation) return res.status(404).json({error: 'not_found'});
    if (!reservation.store.useOnlineBooking) return res.status(409).json({error: 'booking_disabled'});
    if (reservation.status !== 'active') return res.status(409).json({error: 'not_active'});
    if (reservation.pendingAction !== 'none') return res.status(409).json({error: 'already_pending'});

    const body = (req.body ?? {}) as ChangeBody;
    const dateStr = body.date;
    const startTime = body.startTime;
    const serviceNames = Array.isArray(body.services)
        ? body.services.filter((s): s is string => typeof s === 'string' && s.length > 0)
        : [];
    const requestedAssigneeId = typeof body.assigneeId === 'string' && body.assigneeId ? body.assigneeId : null;

    if (!isValidDateStr(dateStr)) return res.status(400).json({error: 'invalid_date'});
    if (!isValidTimeStr(startTime)) return res.status(400).json({error: 'invalid_time'});
    if (serviceNames.length === 0) return res.status(400).json({error: 'no_service'});

    const storeId = reservation.storeId;
    const settings = await loadBookingSettings(storeId);
    const dayIndex = dayIndexOf(dateStr);

    const [services, closedRows, businessHour, assigneeRows, reservationRows] = await Promise.all([
        prisma.service.findMany({where: {storeId, name: {in: serviceNames}}, select: {name: true, duration: true, price: true}}),
        prisma.storeClosedDate.findMany({where: {storeId}, select: {date: true}}),
        prisma.storeBusinessHour.findUnique({where: {storeId_dayIndex: {storeId, dayIndex}}, select: {openTime: true, closeTime: true, enabled: true}}),
        prisma.assignee.findMany({where: {storeId, status: 'active'}, select: {id: true, schedules: {select: {dayIndex: true, enabled: true, startTime: true, endTime: true}}}}),
        prisma.reservation.findMany({where: {storeId, date: new Date(`${dateStr}T00:00:00`), status: {in: ['active', 'requested']}}, select: {id: true, assigneeId: true, startTime: true, endTime: true}}),
    ]);

    if (services.length !== serviceNames.length) return res.status(400).json({error: 'unknown_service'});
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

    // 슬롯 계산 시 이 예약 자신은 점유에서 제외(같은 날 재조정 허용)
    const reservations: SlotReservation[] = reservationRows
        .filter((r) => r.id !== reservation.id)
        .map((r) => ({assigneeId: r.assigneeId, startTime: r.startTime, endTime: r.endTime}));

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
    if (!slots.includes(startTime)) return res.status(409).json({error: 'slot_taken'});

    const finalAssigneeId = assigneeId
        ?? pickAssigneeForSlot({dayIndex, durationMin, reservations, assignees, startMinute: timeToMinutes(startTime)});

    // 승인 시 그대로 적용할 수 있도록 계산 결과를 payload에 저장.
    const payload = {date: dateStr, startTime, endTime, serviceSummary, services: serviceNames, assigneeId: finalAssigneeId, price};

    await prisma.reservation.update({
        where: {id: reservation.id},
        data: {pendingAction: 'change', pendingPayloadJson: payload, pendingRequestedAt: new Date()},
    });

    try {
        await notifySlackForStore(storeId,
            `🔔 *예약 변경 요청*\n• 기존: ${reservation.date.toISOString().slice(0, 10)} ${reservation.startTime}~${reservation.endTime} (${reservation.serviceSummary})`
            + `\n• 변경: ${dateStr} ${startTime}~${endTime} (${serviceSummary})`
            + `\n• 고객: ${reservation.customer?.name ?? ''}${reservation.customer?.tel ? ` (${reservation.customer.tel})` : ''}`
            + `\n앱에서 수락/거절해 주세요.`,
        );
    } catch { /* 알림 실패는 무시 */ }

    return res.status(200).json({ok: true, pendingAction: 'change', pendingChange: payload});
}
