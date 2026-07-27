import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../db/prisma';
import {toDateKey} from '../../../db/mappers';
import {
    assigneeWorksOnDay,
    computeSlotCapacities,
    type SlotAssignee,
    type SlotReservation,
} from '../../../../client/features/booking/availability';
import {
    dayIndexOf,
    evaluateDateWindow,
    findBookableStore,
    isValidDateStr,
    loadBookingSettings,
} from '../booking-helpers';

// 공개(비로그인) 하루 예약현황. 선택 날짜(+담당자)의 시작시각별 "최대 가용 분"과 담당자 근무여부를 반환.
// 시술↔시간 양방향 활성/비활성을 프런트가 즉시 계산하도록 용량표만 내려준다(예약 상세·고객정보 비노출).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    const dateStr = typeof req.query.date === 'string' ? req.query.date : '';
    const assigneeParam = typeof req.query.assignee === 'string' ? req.query.assignee : '';

    if (!isValidDateStr(dateStr)) return res.status(400).json({error: 'invalid_date'});

    const store = await findBookableStore(slug);
    if (!store) return res.status(404).json({error: 'not_found'});

    const settings = await loadBookingSettings(store.id);
    const dayIndex = dayIndexOf(dateStr);

    const [closedRows, businessHour, assigneeRows, reservationRows] = await Promise.all([
        prisma.storeClosedDate.findMany({where: {storeId: store.id}, select: {date: true}}),
        prisma.storeBusinessHour.findUnique({where: {storeId_dayIndex: {storeId: store.id, dayIndex}}, select: {openTime: true, closeTime: true, enabled: true}}),
        prisma.assignee.findMany({where: {storeId: store.id, status: 'active'}, select: {id: true, schedules: {select: {dayIndex: true, enabled: true, startTime: true, endTime: true}}}}),
        prisma.reservation.findMany({where: {storeId: store.id, date: new Date(`${dateStr}T00:00:00`), status: {in: ['active', 'requested']}}, select: {assigneeId: true, startTime: true, endTime: true}}),
    ]);

    const assignees: SlotAssignee[] = assigneeRows.map((a) => ({id: a.id, schedules: a.schedules}));
    // 담당자 근무여부(휴무 판정)는 날짜에만 의존 — 선택 담당자와 무관하게 항상 반환.
    const assigneeStatus = assignees.map((a) => ({id: a.id, working: assigneeWorksOnDay(a, dayIndex)}));

    const closedDates = closedRows.map((c) => toDateKey(c.date));
    const window = evaluateDateWindow(dateStr, settings, closedDates);

    const bh = businessHour
        ? {openTime: businessHour.openTime, closeTime: businessHour.closeTime, enabled: businessHour.enabled}
        : null;

    // 예약창 밖·휴무일이면 슬롯 없음(dateOk=false). 담당자 근무여부는 그대로 노출.
    if (!window.ok) {
        return res.status(200).json({date: dateStr, dateOk: false, businessHour: bh, slotIntervalMin: settings.slotIntervalMin, slots: [], assignees: assigneeStatus});
    }

    // 담당자 선택 허용 + 실재 담당자일 때만 특정 담당자 기준 용량. 아니면 상관없음(null).
    const assigneeId = settings.allowAssigneeChoice && assigneeParam && assignees.some((a) => a.id === assigneeParam)
        ? assigneeParam
        : null;

    const reservations: SlotReservation[] = reservationRows.map((r) => ({
        assigneeId: r.assigneeId,
        startTime: r.startTime,
        endTime: r.endTime,
    }));

    const slots = computeSlotCapacities({
        dayIndex,
        businessHour: bh,
        slotIntervalMin: settings.slotIntervalMin,
        minStartMinute: window.minStartMinute,
        reservations,
        assigneeId,
        assignees,
    });

    return res.status(200).json({date: dateStr, dateOk: true, businessHour: bh, slotIntervalMin: settings.slotIntervalMin, slots, assignees: assigneeStatus});
}
