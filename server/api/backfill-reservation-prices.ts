import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end();
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'manager', res)) return;

    const storeId = session.storeId;

    const [zeroReservations, allServices] = await Promise.all([
        prisma.reservation.findMany({
            where: {storeId, price: 0, serviceSummary: {not: ''}},
            select: {id: true, serviceSummary: true},
        }),
        prisma.service.findMany({
            where: {storeId},
            select: {name: true, price: true},
        }),
    ]);

    if (zeroReservations.length === 0) {
        return res.status(200).json({updated: 0, total: 0});
    }

    const serviceMap = new Map(allServices.map((s) => [s.name, s.price]));

    let updated = 0;

    for (const reservation of zeroReservations) {
        const names = reservation.serviceSummary.split('+').map((s) => s.trim()).filter(Boolean);
        let total = 0;

        for (const name of names) {
            const exactPrice = serviceMap.get(name);
            if (exactPrice !== undefined) {
                total += exactPrice;
                continue;
            }

            // 부분 매칭: 서비스명이 포함 관계인 경우
            let bestKey: string | undefined;
            for (const key of serviceMap.keys()) {
                if (key.includes(name) || name.includes(key)) {
                    if (!bestKey || key.length > bestKey.length) {
                        bestKey = key;
                    }
                }
            }
            if (bestKey) {
                total += serviceMap.get(bestKey)!;
            }
        }

        if (total > 0) {
            await prisma.reservation.update({
                where: {id: reservation.id},
                data: {price: total},
            });
            updated++;
        }
    }

    return res.status(200).json({updated, total: zeroReservations.length});
}
