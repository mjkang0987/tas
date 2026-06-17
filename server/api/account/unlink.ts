import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../client/auth';
import {prisma} from '../../db/prisma';

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

    // 마지막 남은 계정은 해제 불가 — 해제하면 로그인 수단이 없는 orphan 유저가 됨
    const total = await prisma.authAccount.count({where: {userId: session.user.id}});
    if (total <= 1) {
        return res.status(400).json({error: '마지막으로 연결된 계정은 해제할 수 없습니다.'});
    }

    await prisma.authAccount.deleteMany({
        where: {userId: session.user.id, provider},
    });

    return res.json({ok: true});
}
