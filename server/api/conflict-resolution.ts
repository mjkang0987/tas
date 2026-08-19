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

        // 사유는 선택 입력이다(모달이 "처리 사유 (선택)"으로 띄운다). 사유 없이 확인만 눌러도
        // "이 매장에서 이미 처리된 충돌"이라는 사실은 남아야 한다 — 안 남기면 다른 관리자
        // 브라우저에서 같은 충돌이 계속 뜬다. 빈 문자열로 저장한다(컬럼 non-null, 마이그레이션 불필요).
        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

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
