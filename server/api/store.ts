import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbStoreToFrontend} from '../db/mappers';
import type {StoreSettings, BookingSettings} from '../../client/features/store-settings/model';
import {DEFAULT_STORE_SETTINGS, DEFAULT_BOOKING_SETTINGS, isValidBookingSlug} from '../../client/features/store-settings/model';
import {sanitizeShopType} from '../../client/features/store-settings/labels';

function isValidTime(value: unknown): value is string {
    return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const [store, businessHours, closedDates, pointSettings, bookingSettings] = await Promise.all([
            prisma.store.findUnique({where: {id: session.storeId}, select: {name: true, shopType: true, usePointSystem: true, useMembershipSystem: true, useCouponSystem: true, useOnlineBooking: true, bookingSlug: true}}),
            prisma.storeBusinessHour.findMany({where: {storeId: session.storeId}, orderBy: {dayIndex: 'asc'}}),
            prisma.storeClosedDate.findMany({where: {storeId: session.storeId}}),
            prisma.storePointSettings.findUnique({where: {storeId: session.storeId}}),
            prisma.storeBookingSettings.findUnique({where: {storeId: session.storeId}}),
        ]);

        const result = dbStoreToFrontend({businessHours, closedDates, pointSettings});
        return res.status(200).json({
            ...result,
            storeName: store?.name ?? '',
            shopType: store?.shopType ?? null,
            usePointSystem: store?.usePointSystem ?? false,
            useMembershipSystem: store?.useMembershipSystem ?? false,
            useCouponSystem: store?.useCouponSystem ?? false,
            useOnlineBooking: store?.useOnlineBooking ?? false,
            bookingSlug: store?.bookingSlug ?? null,
            bookingSettings: bookingSettings
                ? {
                    slotIntervalMin: bookingSettings.slotIntervalMin,
                    minLeadMinutes: bookingSettings.minLeadMinutes,
                    maxAdvanceDays: bookingSettings.maxAdvanceDays,
                    allowAssigneeChoice: bookingSettings.allowAssigneeChoice,
                    noticeText: bookingSettings.noticeText,
                }
                : DEFAULT_BOOKING_SETTINGS,
        });
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'owner', res)) return;

        const {businessHours, closedDates, pointSettings} = req.body as StoreSettings;

        if (
            typeof businessHours !== 'object' ||
            businessHours === null ||
            !isValidTime(businessHours.start) ||
            !isValidTime(businessHours.end)
        ) {
            return res.status(400).json({error: 'Invalid businessHours payload'});
        }

        if (!Array.isArray(closedDates) || closedDates.some((date) => typeof date !== 'string')) {
            return res.status(400).json({error: 'Invalid closedDates payload'});
        }

        const nextPointSettings = pointSettings ?? DEFAULT_STORE_SETTINGS.pointSettings;
        const isValidPointMode = typeof nextPointSettings.enableServiceRate === 'boolean'
            && typeof nextPointSettings.enableRecharge === 'boolean';
        const isValidServiceRate = typeof nextPointSettings.serviceRate === 'number' && nextPointSettings.serviceRate >= 0;
        const isValidRechargeRules = Array.isArray(nextPointSettings.rechargeRules)
            && nextPointSettings.rechargeRules.every((rule) => (
                typeof rule?.baseAmount === 'number'
                && rule.baseAmount >= 0
                && typeof rule?.bonusAmount === 'number'
                && rule.bonusAmount >= 0
            ));

        if (!isValidPointMode || !isValidServiceRate || !isValidRechargeRules) {
            return res.status(400).json({error: 'Invalid pointSettings payload'});
        }

        const weekdays = Array.from({length: 7}, (_, i) => i);

        await prisma.$transaction([
            ...weekdays.map((dayIndex) =>
                prisma.storeBusinessHour.upsert({
                    where: {storeId_dayIndex: {storeId: session.storeId, dayIndex}},
                    update: {openTime: businessHours.start, closeTime: businessHours.end, enabled: true},
                    create: {storeId: session.storeId, dayIndex, openTime: businessHours.start, closeTime: businessHours.end, enabled: true},
                })
            ),
            prisma.storeClosedDate.deleteMany({where: {storeId: session.storeId}}),
            ...(closedDates.length > 0
                ? [prisma.storeClosedDate.createMany({
                    data: closedDates.map((date) => ({
                        storeId: session.storeId,
                        date: new Date(`${date}T00:00:00`),
                    })),
                })]
                : []),
            prisma.storePointSettings.upsert({
                where: {storeId: session.storeId},
                update: {
                    enableServiceRate: nextPointSettings.enableServiceRate,
                    enableRecharge: nextPointSettings.enableRecharge,
                    serviceRate: nextPointSettings.serviceRate,
                    rechargeRulesJson: nextPointSettings.rechargeRules as unknown as any[],
                },
                create: {
                    storeId: session.storeId,
                    enableServiceRate: nextPointSettings.enableServiceRate,
                    enableRecharge: nextPointSettings.enableRecharge,
                    serviceRate: nextPointSettings.serviceRate,
                    rechargeRulesJson: nextPointSettings.rechargeRules as unknown as any[],
                },
            }),
        ]);

        const nextData: StoreSettings = {businessHours, closedDates, pointSettings: nextPointSettings};
        return res.status(200).json(nextData);
    }

    if (req.method === 'PATCH') {
        if (!requireRole(session, 'owner', res)) return;

        const {storeName, shopType, usePointSystem, useMembershipSystem, useCouponSystem, useOnlineBooking, bookingSlug, bookingSettings} = req.body as {
            storeName?: unknown; shopType?: unknown; usePointSystem?: unknown; useMembershipSystem?: unknown; useCouponSystem?: unknown;
            useOnlineBooking?: unknown; bookingSlug?: unknown; bookingSettings?: unknown;
        };

        if (storeName !== undefined && (typeof storeName !== 'string' || !storeName.trim())) {
            return res.status(400).json({error: 'Invalid storeName'});
        }
        if (shopType !== undefined && shopType !== null && typeof shopType !== 'string') {
            return res.status(400).json({error: 'Invalid shopType'});
        }
        if (usePointSystem !== undefined && typeof usePointSystem !== 'boolean') {
            return res.status(400).json({error: 'Invalid usePointSystem'});
        }
        if (useMembershipSystem !== undefined && typeof useMembershipSystem !== 'boolean') {
            return res.status(400).json({error: 'Invalid useMembershipSystem'});
        }
        if (useCouponSystem !== undefined && typeof useCouponSystem !== 'boolean') {
            return res.status(400).json({error: 'Invalid useCouponSystem'});
        }
        if (useOnlineBooking !== undefined && typeof useOnlineBooking !== 'boolean') {
            return res.status(400).json({error: 'Invalid useOnlineBooking'});
        }
        // 슬러그: null(해제) 또는 유효 형식 문자열만
        let normalizedSlug: string | null | undefined;
        if (bookingSlug !== undefined) {
            if (bookingSlug === null || bookingSlug === '') {
                normalizedSlug = null;
            } else if (typeof bookingSlug === 'string' && isValidBookingSlug(bookingSlug.toLowerCase())) {
                normalizedSlug = bookingSlug.toLowerCase();
            } else {
                return res.status(400).json({error: 'Invalid bookingSlug', reason: 'format'});
            }
        }
        // 예약 규칙 검증
        let nextBooking: BookingSettings | undefined;
        if (bookingSettings !== undefined) {
            const b = bookingSettings as Partial<BookingSettings>;
            const okInt = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
            if (
                !okInt(b.slotIntervalMin, 5, 240)
                || !okInt(b.minLeadMinutes, 0, 43200)
                || !okInt(b.maxAdvanceDays, 1, 365)
                || typeof b.allowAssigneeChoice !== 'boolean'
                || (b.noticeText !== null && b.noticeText !== undefined && typeof b.noticeText !== 'string')
            ) {
                return res.status(400).json({error: 'Invalid bookingSettings'});
            }
            nextBooking = {
                slotIntervalMin: b.slotIntervalMin!,
                minLeadMinutes: b.minLeadMinutes!,
                maxAdvanceDays: b.maxAdvanceDays!,
                allowAssigneeChoice: b.allowAssigneeChoice,
                noticeText: (b.noticeText ?? null) as string | null,
            };
        }

        try {
            await prisma.store.update({
                where: {id: session.storeId},
                data: {
                    ...(storeName !== undefined && {name: (storeName as string).trim()}),
                    ...(shopType !== undefined && {shopType: sanitizeShopType(shopType)}),
                    ...(usePointSystem !== undefined && {usePointSystem: usePointSystem as boolean}),
                    ...(useMembershipSystem !== undefined && {useMembershipSystem: useMembershipSystem as boolean}),
                    ...(useCouponSystem !== undefined && {useCouponSystem: useCouponSystem as boolean}),
                    ...(useOnlineBooking !== undefined && {useOnlineBooking: useOnlineBooking as boolean}),
                    ...(normalizedSlug !== undefined && {bookingSlug: normalizedSlug}),
                },
            });
        } catch (e) {
            // 슬러그 unique 충돌
            if (e && typeof e === 'object' && 'code' in e && (e as {code?: string}).code === 'P2002') {
                return res.status(409).json({error: 'bookingSlug already taken', reason: 'duplicate'});
            }
            throw e;
        }

        if (nextBooking !== undefined) {
            await prisma.storeBookingSettings.upsert({
                where: {storeId: session.storeId},
                update: {...nextBooking},
                create: {storeId: session.storeId, ...nextBooking},
            });
        }

        return res.status(200).json({
            storeName: storeName ?? undefined,
            shopType: shopType ?? undefined,
            usePointSystem: usePointSystem ?? undefined,
            useMembershipSystem: useMembershipSystem ?? undefined,
            useCouponSystem: useCouponSystem ?? undefined,
            useOnlineBooking: useOnlineBooking ?? undefined,
            bookingSlug: normalizedSlug,
            bookingSettings: nextBooking,
        });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
