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
                // 다른 고객의 예약에 쓰지 못하게 — 쓸 때만 주인과 예약 고객이 같아야 한다(되돌리기는 연결 여부만 본다).
                if (!reservation || (action === 'use' && reservation.customerId !== m.customerId)) return {error: 'wrong_reservation' as const};
                reservationCuid = reservation.id;
            }
            // 무제한(횟수 없음)은 수동 차감 대상이 아니지만, 결제에선 "이 예약에 썼다"는 기록만 남긴다(횟수 변화 없음).
            const unlimited = m.totalCount == null || m.remainingCount == null;
            if (unlimited && !reservationCuid) return {error: 'unlimited' as const};

            if (action === 'use') {
                // 이미 이 예약에 쓴 회원권이면 그대로 성공 — 결제 저장이 중간에 실패해 다시 저장할 때 한 번 더 깎지 않게.
                if (reservationCuid) {
                    const already = await tx.membershipUsage.findFirst({
                        where: {customerMembershipId: m.id, reservationId: reservationCuid, type: 'use'},
                        select: {id: true},
                    });
                    if (already) return {remainingCount: m.remainingCount};
                }
                if (m.expiresAt && m.expiresAt <= new Date()) return {error: 'expired' as const};
                if (unlimited) {
                    await tx.membershipUsage.create({
                        data: {customerMembershipId: m.id, delta: 0, type: 'use', memo: '결제 사용', reservationId: reservationCuid},
                    });
                    return {remainingCount: null};
                }
                if (m.remainingCount! <= 0) return {error: 'empty' as const};
                const next = m.remainingCount! - 1;
                // 읽은 값 그대로일 때만 바꾼다 — 두 기기가 동시에 쓰면 둘 다 같은 값을 읽고 한 번만 깎였다.
                const changed = await tx.customerMembership.updateMany({
                    where: {id: m.id, remainingCount: m.remainingCount},
                    data: {remainingCount: next, status: next === 0 ? 'used_up' : 'active'},
                });
                if (changed.count === 0) return {error: 'conflict' as const};
                await tx.membershipUsage.create({
                    data: {customerMembershipId: m.id, delta: -1, type: 'use', memo: reservationCuid ? '결제 사용' : '수동 차감', reservationId: reservationCuid},
                });
                return {remainingCount: next};
            }

            // restore — 결제에서 되돌리면 그 예약에 연결된 사용 기록을 풀고 횟수를 돌려준다.
            // 횟수부터 바꾸고(실패하면 아무것도 안 바뀐 채 끝) 그다음 연결을 푼다 — 거꾸로 하면 실패 때 연결만 풀린 채 커밋돼
            // 돌려줄 횟수를 잃고, 다시 시도하면 '이 예약에 쓴 기록이 없습니다'가 된다.
            const linked = reservationCuid
                ? await tx.membershipUsage.findFirst({
                    where: {customerMembershipId: m.id, reservationId: reservationCuid, type: 'use'},
                    orderBy: {createdAt: 'desc'},
                })
                : null;
            if (reservationCuid && !linked) return {error: 'not_linked' as const};

            let next: number | null = null;
            if (!unlimited) {
                next = Math.min(m.remainingCount! + 1, m.totalCount!);
                if (next === m.remainingCount) return {error: 'full' as const};
                const restored = await tx.customerMembership.updateMany({
                    where: {id: m.id, remainingCount: m.remainingCount},
                    data: {remainingCount: next, status: 'active'},
                });
                if (restored.count === 0) return {error: 'conflict' as const};
            }
            if (linked) await tx.membershipUsage.update({where: {id: linked.id}, data: {reservationId: null}});
            await tx.membershipUsage.create({
                data: {customerMembershipId: m.id, delta: unlimited ? 0 : 1, type: 'refund', memo: reservationCuid ? '결제 취소 복원' : '수동 복원'},
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
                conflict: [409, '다른 곳에서 동시에 처리 중입니다. 다시 시도해 주세요.'],
            };
            const [code, message] = map[String(result.error)] ?? [400, '처리할 수 없습니다.'];
            return res.status(code).json({error: message});
        }

        return res.status(200).json({remainingCount: result.remainingCount});
    } catch {
        return res.status(500).json({error: 'Internal error'});
    }
}
