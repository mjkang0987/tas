import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../db/prisma';
import {DEFAULT_BOOKING_SETTINGS} from '../../../client/features/store-settings/model';

// 공개(비로그인) 예약 매장 정보. 데이터 최소 노출 — 고객/예약 정보는 절대 반환하지 않는다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug.toLowerCase() : '';
    if (!slug) return res.status(404).json({error: 'not_found'});

    // 온라인 예약이 켜진 매장만 노출
    const store = await prisma.store.findFirst({
        where: {bookingSlug: slug, useOnlineBooking: true},
        select: {id: true, name: true, shopType: true},
    });
    if (!store) return res.status(404).json({error: 'not_found'});

    const [services, assignees, businessHours, closedDates, bookingSettings] = await Promise.all([
        prisma.service.findMany({where: {storeId: store.id}, select: {name: true, category: true, duration: true, price: true}, orderBy: {name: 'asc'}}),
        prisma.assignee.findMany({where: {storeId: store.id, status: 'active'}, select: {id: true, name: true, color: true}, orderBy: {name: 'asc'}}),
        prisma.storeBusinessHour.findMany({where: {storeId: store.id}, orderBy: {dayIndex: 'asc'}, select: {dayIndex: true, openTime: true, closeTime: true, enabled: true}}),
        prisma.storeClosedDate.findMany({where: {storeId: store.id}, select: {date: true}}),
        prisma.storeBookingSettings.findUnique({where: {storeId: store.id}}),
    ]);

    const settings = bookingSettings
        ? {
            slotIntervalMin: bookingSettings.slotIntervalMin,
            minLeadMinutes: bookingSettings.minLeadMinutes,
            maxAdvanceDays: bookingSettings.maxAdvanceDays,
            allowAssigneeChoice: bookingSettings.allowAssigneeChoice,
            noticeText: bookingSettings.noticeText,
        }
        : DEFAULT_BOOKING_SETTINGS;

    return res.status(200).json({
        storeName: store.name,
        shopType: store.shopType,
        services: services.map((s) => ({name: s.name, category: s.category, duration: s.duration, price: s.price})),
        // 담당자 선택을 허용할 때만 목록 노출
        assignees: settings.allowAssigneeChoice ? assignees.map((a) => ({id: a.id, name: a.name, color: a.color})) : [],
        businessHours: businessHours.map((b) => ({dayIndex: b.dayIndex, openTime: b.openTime, closeTime: b.closeTime, enabled: b.enabled})),
        closedDates: closedDates.map((c) => c.date.toISOString().slice(0, 10)),
        settings,
    });
}
