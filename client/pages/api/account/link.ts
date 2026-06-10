import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../auth';

const LINK_COOKIE = 'tas-link-user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({error: 'Method Not Allowed'});
    }

    const session = await auth(req, res);
    if (!session?.user?.id) return res.status(401).json({error: 'Unauthorized'});

    const {provider} = req.body as {provider?: string};
    if (!provider || !['google', 'kakao', 'naver'].includes(provider)) {
        return res.status(400).json({error: 'Invalid provider'});
    }

    const isSecure = (req.headers['x-forwarded-proto'] === 'https')
        || req.headers.host?.startsWith('localhost') === false;
    const securePart = isSecure ? '; Secure' : '';

    res.setHeader(
        'Set-Cookie',
        `${LINK_COOKIE}=${session.user.id}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${securePart}`
    );

    return res.json({ok: true});
}
