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

    const {membershipId, action, reservationId} = req.body as {membershipId?: unknown; action?: unknown; reservationId?: unknown};
    if (typeof membershipId !== 'string') return res.status(400).json({error: 'Invalid membershipId'});
    if (action !== 'use' && action !== 'restore') return res.status(400).json({error: 'Invalid action'});
    // 결제완료에서 쓰면 그 예약(프론트 id)과 연결한다 — 매출은 판매 때 잡혔으니 이 예약에선 '회원권' 결제로 빠진다.
    if (reservationId !== undefined && (typeof reservationId !== 'number' || !Number.isInteger(reservationId))) {
        return res.status(400).json({error: 'Invalid reservationId'});
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const m = await tx.customerMembership.findFirst({
                where: {id: membershipId, storeId: session.storeId},
                include: {customer: {select: {deletedAt: true}}},
            });
            if (!m) return {error: 'not_found' as const};
            // 삭제(익명 처리)된 고객의 회원권은 차감·복원하지 않는다(복원으로 되살아나지 않게).
            if (m.customer.deletedAt) return {error: 'deleted' as const};
            if (m.status === 'cancelled') return {error: 'cancelled' as const};

            let reservationCuid: string | null = null;
            if (typeof reservationId === 'number') {
                const reservation = await tx.reservation.findUnique({
                    where: {storeId_legacyId: {storeId: session.storeId, legacyId: reservationId}},
                    select: {id: true, customerId: true},
                });
                // 다른 고객의 예약에 쓰지 못하게 — 회원권 주인과 예약 고객이 같아야 한다.
                if (!reservation || reservation.customerId !== m.customerId) return {error: 'wrong_reservation' as const};
                reservationCuid = reservation.id;
            }
            // 무제한(횟수 없음)은 수동 차감 대상이 아니지만, 결제에선 "이 예약에 썼다"는 기록만 남긴다(횟수 변화 없음).
            const unlimited = m.totalCount == null || m.remainingCount == null;
            if (unlimited && !reservationCuid) return {error: 'unlimited' as const};

            if (action === 'use') {
                if (m.expiresAt && m.expiresAt <= new Date()) return {error: 'expired' as const};
                if (unlimited) {
                    await tx.membershipUsage.create({
                        data: {customerMembershipId: m.id, delta: 0, type: 'use', memo: '결제 사용', reservationId: reservationCuid},
                    });
                    return {remainingCount: null};
                }
                if (m.remainingCount! <= 0) return {error: 'empty' as const};
                const next = m.remainingCount! - 1;
                await tx.customerMembership.update({
                    where: {id: m.id},
                    data: {remainingCount: next, status: next === 0 ? 'used_up' : 'active'},
                });
                await tx.membershipUsage.create({
                    data: {customerMembershipId: m.id, delta: -1, type: 'use', memo: reservationCuid ? '결제 사용' : '수동 차감', reservationId: reservationCuid},
                });
                return {remainingCount: next};
            }

            // restore — 결제에서 되돌리면 그 예약에 연결된 사용 기록을 풀고 횟수를 돌려준다.
            if (reservationCuid) {
                const linked = await tx.membershipUsage.findFirst({
                    where: {customerMembershipId: m.id, reservationId: reservationCuid, type: 'use'},
                    orderBy: {createdAt: 'desc'},
                });
                if (!linked) return {error: 'not_linked' as const};
                await tx.membershipUsage.update({where: {id: linked.id}, data: {reservationId: null}});
                if (unlimited) {
                    await tx.membershipUsage.create({data: {customerMembershipId: m.id, delta: 0, type: 'refund', memo: '결제 취소 복원'}});
                    return {remainingCount: null};
                }
            }
            const next = Math.min(m.remainingCount! + 1, m.totalCount!);
            if (next === m.remainingCount) return {error: 'full' as const};
            await tx.customerMembership.update({
                where: {id: m.id},
                data: {remainingCount: next, status: 'active'},
            });
            await tx.membershipUsage.create({
                data: {customerMembershipId: m.id, delta: 1, type: 'refund', memo: reservationCuid ? '결제 취소 복원' : '수동 복원'},
            });
            return {remainingCount: next};
        });

        if ('error' in result) {
            const map: Record<string, [number, string]> = {
                not_found: [404, '회원권을 찾을 수 없습니다.'],
                unlimited: [400, '무제한 회원권은 차감할 수 없습니다.'],
                cancelled: [400, '취소된 회원권입니다.'],
                deleted: [400, '삭제된 고객의 회원권입니다.'],
                expired: [400, '만료된 회원권입니다.'],
                wrong_reservation: [400, '이 예약에 쓸 수 없는 회원권입니다.'],
                not_linked: [400, '이 예약에 쓴 기록이 없습니다.'],
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
