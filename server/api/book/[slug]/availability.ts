import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../db/prisma';
import {
    computeAvailableSlots,
    type SlotAssignee,
    type SlotReservation,
} from '../../../../client/features/booking/availability';
import {areServicesBookable} from '../../../../client/features/store-settings/model';
import {
    dayIndexOf,
    evaluateDateWindow,
    findBookableStore,
    isValidDateStr,
    loadBookingSettings,
} from '../booking-helpers';

// 공개(비로그인) 슬롯 조회. 선택한 서비스·담당자 기준으로 예약 가능한 시작 시각만 반환한다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    const dateStr = typeof req.query.date === 'string' ? req.query.date : '';
    const servicesParam = typeof req.query.services === 'string' ? req.query.services : '';
    const assigneeParam = typeof req.query.assignee === 'string' ? req.query.assignee : '';

    if (!isValidDateStr(dateStr)) return res.status(400).json({error: 'invalid_date'});

    const store = await findBookableStore(slug);
    if (!store) return res.status(404).json({error: 'not_found'});

    const settings = await loadBookingSettings(store.id);

    const serviceNames = servicesParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (serviceNames.length === 0) return res.status(400).json({error: 'no_service'});

    const dayIndex = dayIndexOf(dateStr);
    const [services, closedRows, businessHour, assigneeRows, reservationRows] = await Promise.all([
        prisma.service.findMany({where: {storeId: store.id, name: {in: serviceNames}}, select: {name: true, duration: true}}),
        prisma.storeClosedDate.findMany({where: {storeId: store.id}, select: {date: true}}),
        prisma.storeBusinessHour.findUnique({where: {storeId_dayIndex: {storeId: store.id, dayIndex}}, select: {openTime: true, closeTime: true, enabled: true}}),
        prisma.assignee.findMany({where: {storeId: store.id, status: 'active'}, select: {id: true, schedules: {select: {dayIndex: true, enabled: true, startTime: true, endTime: true}}}}),
        prisma.reservation.findMany({where: {storeId: store.id, date: new Date(`${dateStr}T00:00:00`), status: 'active'}, select: {assigneeId: true, startTime: true, endTime: true}}),
    ]);

    // 모르는 서비스가 섞였으면 거부(공개 API 최소 신뢰)
    if (services.length !== serviceNames.length) return res.status(400).json({error: 'unknown_service'});
    // 노출 화이트리스트(1c) 밖 서비스는 거부
    if (!areServicesBookable(serviceNames, settings.bookableServiceNames)) return res.status(400).json({error: 'not_bookable'});
    const durationMin = services.reduce((sum, s) => sum + s.duration, 0);

    const closedDates = closedRows.map((c) => c.date.toISOString().slice(0, 10));
    const window = evaluateDateWindow(dateStr, settings, closedDates);
    if (!window.ok) return res.status(200).json({date: dateStr, durationMin, slots: []});

    // 담당자 선택 허용 + 실재 담당자일 때만 특정 담당자로 계산
    const assignees: SlotAssignee[] = assigneeRows.map((a) => ({id: a.id, schedules: a.schedules}));
    const assigneeId = settings.allowAssigneeChoice && assigneeParam && assignees.some((a) => a.id === assigneeParam)
        ? assigneeParam
        : null;

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

    return res.status(200).json({date: dateStr, durationMin, slots});
}
