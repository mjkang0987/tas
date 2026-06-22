import type {NextApiRequest, NextApiResponse} from 'next';

import {getApiSession, requireRole} from '../../auth/api-session';
import {getGmailConnection} from './token-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    // 매장 단위 연결 정보(연결된 Gmail 주소 포함)는 오너에게만 노출한다.
    // (멤버는 클라이언트에서 호출하지 않지만 raw API 노출 방지)
    if (!requireRole(session, 'owner', res)) return;

    const connection = await getGmailConnection(session.storeId);
    return res.status(200).json({
        connected: !!connection,
        email: connection?.email ?? null,
    });
}
