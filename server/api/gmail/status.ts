import type {NextApiRequest, NextApiResponse} from 'next';

import {getApiSession} from '../../auth/api-session';
import {getGmailConnection} from './token-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!session) {
        return res.status(401).json({error: 'Unauthorized'});
    }

    const connection = await getGmailConnection(session.userId);
    return res.status(200).json({
        connected: !!connection,
        email: connection?.email ?? null,
    });
}
