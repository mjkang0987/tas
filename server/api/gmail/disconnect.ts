import type {NextApiRequest, NextApiResponse} from 'next';

import {getApiSession, requireRole} from '../../auth/api-session';
import {deleteGmailConnection} from './token-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'owner', res)) return;

    await deleteGmailConnection(session.userId);
    return res.status(200).json({ok: true});
}
