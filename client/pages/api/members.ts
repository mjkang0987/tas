import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../auth';
import {prisma} from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({error: 'Method Not Allowed'});
        return;
    }

    const session = await auth(req, res);
    if (!session?.user?.id || !session.user.storeId) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    const members = await prisma.membership.findMany({
        where: {storeId: session.user.storeId},
        orderBy: {createdAt: 'asc'},
        select: {
            id: true,
            role: true,
            user: {
                select: {
                    nickname: true,
                    email: true,
                },
            },
        },
    });

    res.status(200).json(members);
}
