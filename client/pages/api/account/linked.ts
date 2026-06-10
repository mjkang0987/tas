import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../auth';
import {prisma} from '../../../../server/db/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({error: 'Method Not Allowed'});
    }

    const session = await auth(req, res);
    if (!session?.user?.id) return res.status(401).json({error: 'Unauthorized'});

    const accounts = await prisma.authAccount.findMany({
        where: {userId: session.user.id},
        select: {provider: true, createdAt: true},
        orderBy: {createdAt: 'asc'},
    });

    return res.json(accounts);
}
