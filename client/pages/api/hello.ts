import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../lib/prisma';
import {dbReservationToFrontend, dbHistoryToFrontend} from '../../lib/db-to-frontend';

const handler = async (
    req: NextApiRequest,
    res: NextApiResponse
) => {
    const storeId = 'default-store';

    const [dbReservations, dbHistories] = await Promise.all([
        prisma.reservation.findMany({
            where: {storeId},
            include: {
                paymentEntries: true,
                customer: {select: {legacyId: true}},
                assignee: {select: {legacyId: true}},
            },
        }),
        prisma.reservationHistory.findMany({
            where: {storeId},
            include: {reservation: {select: {legacyId: true}}},
            orderBy: {createdAt: 'asc'},
        }),
    ]);

    res.status(200).json({
        reservations: dbReservations.map(dbReservationToFrontend),
        history: dbHistories.map(dbHistoryToFrontend),
    });
};

export default handler;
