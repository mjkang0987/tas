import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbStoreToFrontend} from '../db/mappers';
import type {StoreSettings} from '../../client/features/store-settings/model';
import {DEFAULT_STORE_SETTINGS} from '../../client/features/store-settings/model';

function isValidTime(value: unknown): value is string {
    return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const [store, businessHours, closedDates, pointSettings] = await Promise.all([
            prisma.store.findUnique({where: {id: session.storeId}, select: {name: true, shopType: true}}),
            prisma.storeBusinessHour.findMany({where: {storeId: session.storeId}, orderBy: {dayIndex: 'asc'}}),
            prisma.storeClosedDate.findMany({where: {storeId: session.storeId}}),
            prisma.storePointSettings.findUnique({where: {storeId: session.storeId}}),
        ]);

        const result = dbStoreToFrontend({businessHours, closedDates, pointSettings});
        return res.status(200).json({
            ...result,
            storeName: store?.name ?? '',
            shopType: store?.shopType ?? null,
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

        const {storeName, shopType} = req.body as {storeName?: unknown; shopType?: unknown};

        if (storeName !== undefined && (typeof storeName !== 'string' || !storeName.trim())) {
            return res.status(400).json({error: 'Invalid storeName'});
        }
        if (shopType !== undefined && shopType !== null && typeof shopType !== 'string') {
            return res.status(400).json({error: 'Invalid shopType'});
        }

        await prisma.store.update({
            where: {id: session.storeId},
            data: {
                ...(storeName !== undefined && {name: (storeName as string).trim()}),
                ...(shopType !== undefined && {shopType: shopType as string | null}),
            },
        });

        return res.status(200).json({storeName: storeName ?? undefined, shopType: shopType ?? undefined});
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
