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

    const unlinked = await prisma.customerPointHistory.findMany({
        where: {
            relatedReservationId: null,
            type: {in: ['payment_use', 'payment_earn', 'payment_adjust']},
            customer: {storeId},
        },
        orderBy: {createdAt: 'asc'},
    });

    if (unlinked.length === 0) {
        return res.status(200).json({updated: 0, total: 0});
    }

    const reservations = await prisma.reservation.findMany({
        where: {storeId, paymentCompleted: true},
        include: {paymentEntries: true},
    });

    let updated = 0;

    for (const entry of unlinked) {
        let bestMatch: string | null = null;
        let bestTimeDiff = Infinity;

        for (const reservation of reservations) {
            if (reservation.customerId !== entry.customerId) continue;

            let matches = false;

            if (entry.type === 'payment_use') {
                matches = reservation.paymentEntries.some(
                    (pe) => pe.method === 'points' && pe.amount === Math.abs(entry.delta)
                );
            } else {
                matches = reservation.pointEarned === entry.delta;
            }

            if (matches) {
                const timeDiff = Math.abs(
                    reservation.updatedAt.getTime() - entry.createdAt.getTime()
                );
                if (timeDiff < bestTimeDiff) {
                    bestTimeDiff = timeDiff;
                    bestMatch = reservation.id;
                }
            }
        }

        if (bestMatch) {
            await prisma.customerPointHistory.update({
                where: {id: entry.id},
                data: {relatedReservationId: bestMatch},
            });
            updated++;
        }
    }

    return res.status(200).json({updated, total: unlinked.length});
}
