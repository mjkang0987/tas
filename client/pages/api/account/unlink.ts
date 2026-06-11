import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../auth';
import {prisma} from '../../../../server/db/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', 'DELETE');
        return res.status(405).json({error: 'Method Not Allowed'});
    }

    const session = await auth(req, res);
    if (!session?.user?.id) return res.status(401).json({error: 'Unauthorized'});

    const {provider} = req.body as {provider?: string};
    if (!provider || !['google', 'kakao', 'naver'].includes(provider)) {
        return res.status(400).json({error: 'Invalid provider'});
    }

    await prisma.authAccount.deleteMany({
        where: {userId: session.user.id, provider},
    });

    return res.json({ok: true});
}
