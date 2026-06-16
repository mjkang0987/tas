import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);
    if (!requireRole(session, 'staff', res)) return;

    if (req.method === 'GET') {
        const resolutions = await prisma.conflictResolution.findMany({
            where: {storeId: session.storeId},
            orderBy: {createdAt: 'desc'},
        });
        return res.status(200).json({
            resolutions: resolutions.map((r) => ({
                conflictKey: r.conflictKey,
                reason: r.reason,
                memo: r.memo,
                createdAt: r.createdAt.toISOString(),
            })),
        });
    }

    if (req.method === 'POST') {
        const {conflictKey, reason, memo} = req.body as {conflictKey?: string; reason?: string; memo?: string};

        if (!conflictKey || typeof conflictKey !== 'string') {
            return res.status(400).json({error: 'Invalid conflictKey'});
        }

        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
        if (!trimmedReason) {
            return res.status(400).json({error: 'Invalid reason'});
        }

        const trimmedMemo = typeof memo === 'string' && memo.trim() ? memo.trim() : null;

        const saved = await prisma.conflictResolution.upsert({
            where: {storeId_conflictKey: {storeId: session.storeId, conflictKey}},
            update: {reason: trimmedReason, memo: trimmedMemo, resolvedBy: session.userId},
            create: {
                storeId: session.storeId,
                conflictKey,
                reason: trimmedReason,
                memo: trimmedMemo,
                resolvedBy: session.userId,
            },
        });

        return res.status(200).json({
            resolution: {conflictKey: saved.conflictKey, reason: saved.reason, memo: saved.memo},
        });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
