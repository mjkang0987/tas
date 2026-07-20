import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../db/prisma';
import {parseI18nText} from '../../db/mappers';
import {DEFAULT_BOOKING_SETTINGS, parseBookableServiceNames} from '../../../client/features/store-settings/model';

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
        select: {id: true, name: true, nameI18nJson: true, shopType: true},
    });
    if (!store) return res.status(404).json({error: 'not_found'});

    const [services, assignees, businessHours, closedDates, bookingSettings] = await Promise.all([
        prisma.service.findMany({where: {storeId: store.id}, select: {name: true, nameI18nJson: true, category: true, duration: true, price: true}, orderBy: {name: 'asc'}}),
        prisma.assignee.findMany({where: {storeId: store.id, status: 'active'}, select: {id: true, name: true, nameI18nJson: true, color: true, schedules: {select: {dayIndex: true, enabled: true}}}, orderBy: {name: 'asc'}}),
        prisma.storeBusinessHour.findMany({where: {storeId: store.id}, orderBy: {dayIndex: 'asc'}, select: {dayIndex: true, openTime: true, closeTime: true, enabled: true}}),
        prisma.storeClosedDate.findMany({where: {storeId: store.id}, select: {date: true}}),
        prisma.storeBookingSettings.findUnique({where: {storeId: store.id}}),
    ]);

    // 고객 응답엔 규칙 5개만 노출(화이트리스트는 미노출 — 데이터 최소화).
    const settings = bookingSettings
        ? {
            slotIntervalMin: bookingSettings.slotIntervalMin,
            minLeadMinutes: bookingSettings.minLeadMinutes,
            maxAdvanceDays: bookingSettings.maxAdvanceDays,
            allowAssigneeChoice: bookingSettings.allowAssigneeChoice,
            noticeText: bookingSettings.noticeText,
            noticeI18n: parseI18nText(bookingSettings.noticeI18nJson),
            doneText: bookingSettings.doneText,
            doneI18n: parseI18nText(bookingSettings.doneI18nJson),
        }
        : {
            slotIntervalMin: DEFAULT_BOOKING_SETTINGS.slotIntervalMin,
            minLeadMinutes: DEFAULT_BOOKING_SETTINGS.minLeadMinutes,
            maxAdvanceDays: DEFAULT_BOOKING_SETTINGS.maxAdvanceDays,
            allowAssigneeChoice: DEFAULT_BOOKING_SETTINGS.allowAssigneeChoice,
            noticeText: DEFAULT_BOOKING_SETTINGS.noticeText,
            noticeI18n: null,
            doneText: null,
            doneI18n: null,
        };

    // 노출 서비스 화이트리스트(1c): 지정 시 그 서비스만 공개.
    const whitelist = parseBookableServiceNames(bookingSettings?.bookableServiceIdsJson);
    const visibleServices = whitelist ? services.filter((s) => whitelist.includes(s.name)) : services;

    return res.status(200).json({
        storeName: store.name,
        storeNameI18n: parseI18nText(store.nameI18nJson),
        shopType: store.shopType,
        services: visibleServices.map((s) => ({name: s.name, nameI18n: parseI18nText(s.nameI18nJson), category: s.category, duration: s.duration, price: s.price})),
        // 담당자 선택을 허용할 때만 목록 노출. offDays=주간 스케줄이 disabled인 요일(0=월…6=일).
        // 클라가 이 담당자를 고르면 그 요일 날짜를 비활성화한다. (assigneeWorksOnDay와 동일 규칙: 행 없으면 근무)
        assignees: settings.allowAssigneeChoice
            ? assignees.map((a) => ({id: a.id, name: a.name, nameI18n: parseI18nText(a.nameI18nJson), color: a.color, offDays: a.schedules.filter((s) => !s.enabled).map((s) => s.dayIndex)}))
            : [],
        businessHours: businessHours.map((b) => ({dayIndex: b.dayIndex, openTime: b.openTime, closeTime: b.closeTime, enabled: b.enabled})),
        closedDates: closedDates.map((c) => c.date.toISOString().slice(0, 10)),
        settings,
    });
}
