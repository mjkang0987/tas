import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 회원권 횟수 차감(사용)/복원. 결제 흐름과 독립된 수동 차감.
// (발급/취소는 ./membership-issue.ts, 상품 CRUD는 ./memberships.ts)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!requireRole(session, 'staff', res)) return;

    const {membershipId, action} = req.body as {membershipId?: unknown; action?: unknown};
    if (typeof membershipId !== 'string') return res.status(400).json({error: 'Invalid membershipId'});
    if (action !== 'use' && action !== 'restore') return res.status(400).json({error: 'Invalid action'});

    try {
        const result = await prisma.$transaction(async (tx) => {
            const m = await tx.customerMembership.findFirst({
                where: {id: membershipId, storeId: session.storeId},
            });
            if (!m) return {error: 'not_found' as const};
            if (m.totalCount == null || m.remainingCount == null) {
                return {error: 'unlimited' as const}; // 무제한(횟수 없음)은 차감 대상 아님
            }
            if (m.status === 'cancelled') return {error: 'cancelled' as const};

            if (action === 'use') {
                if (m.remainingCount <= 0) return {error: 'empty' as const};
                const next = m.remainingCount - 1;
                await tx.customerMembership.update({
                    where: {id: m.id},
                    data: {remainingCount: next, status: next === 0 ? 'used_up' : 'active'},
                });
                await tx.membershipUsage.create({
                    data: {customerMembershipId: m.id, delta: -1, type: 'use', memo: '수동 차감'},
                });
                return {remainingCount: next};
            }

            // restore
            const next = Math.min(m.remainingCount + 1, m.totalCount);
            if (next === m.remainingCount) return {error: 'full' as const};
            await tx.customerMembership.update({
                where: {id: m.id},
                data: {remainingCount: next, status: 'active'},
            });
            await tx.membershipUsage.create({
                data: {customerMembershipId: m.id, delta: 1, type: 'refund', memo: '수동 복원'},
            });
            return {remainingCount: next};
        });

        if ('error' in result) {
            const map: Record<string, [number, string]> = {
                not_found: [404, '회원권을 찾을 수 없습니다.'],
                unlimited: [400, '무제한 회원권은 차감할 수 없습니다.'],
                cancelled: [400, '취소된 회원권입니다.'],
                empty: [400, '남은 횟수가 없습니다.'],
                full: [400, '이미 최대 횟수입니다.'],
            };
            const [code, message] = map[String(result.error)] ?? [400, '처리할 수 없습니다.'];
            return res.status(code).json({error: message});
        }

        return res.status(200).json({remainingCount: result.remainingCount});
    } catch {
        return res.status(500).json({error: 'Internal error'});
    }
}
