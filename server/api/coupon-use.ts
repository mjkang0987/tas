import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 쿠폰 사용 처리/되돌리기. 결제 흐름과 독립된 수동 처리(회원권 ./membership-use.ts 미러).
// (발급/취소는 ./coupon-issue.ts, 상품 CRUD는 ./coupons.ts)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!requireRole(session, 'staff', res)) return;

    const {couponId, action} = req.body as {couponId?: unknown; action?: unknown};
    if (typeof couponId !== 'string') return res.status(400).json({error: 'Invalid couponId'});
    if (action !== 'use' && action !== 'restore') return res.status(400).json({error: 'Invalid action'});

    const now = new Date();
    const notExpired = {OR: [{expiresAt: null}, {expiresAt: {gt: now}}]};
    try {
        // 확인과 변경을 한 트랜잭션(Serializable)으로 — 다른 기기에서 동시에 눌러도 고객당 1장 규칙이 깨지지 않게.
        const error = await prisma.$transaction(async (tx) => {
            const coupon = await tx.customerCoupon.findFirst({
                where: {id: couponId, storeId: session.storeId},
                select: {
                    status: true, customerId: true, productId: true, expiresAt: true,
                    product: {select: {oncePerCustomer: true}},
                    customer: {select: {deletedAt: true}},
                },
            });
            if (!coupon) return '쿠폰을 찾을 수 없습니다.';
            // 삭제(익명 처리)된 고객의 쿠폰은 다시 살리거나 쓰지 않는다.
            if (coupon.customer.deletedAt) return '삭제된 고객의 쿠폰입니다.';
            const expired = !!coupon.expiresAt && coupon.expiresAt <= now;

            if (action === 'use') {
                if (coupon.status !== 'active' || expired) return '사용할 수 없는 쿠폰입니다. (이미 사용·취소·만료)';
                await tx.customerCoupon.update({where: {id: couponId}, data: {status: 'used', usedAt: now}});
                return null;
            }

            // 되돌리면 다시 쓸 수 있는 쿠폰이 된다 — 발급과 같은 규칙(만료 전, 고객당 1장)을 지킨다.
            if (coupon.status !== 'used') return '사용한 쿠폰만 되돌릴 수 있습니다.';
            if (expired) return '만료된 쿠폰은 되돌릴 수 없습니다.';
            if (coupon.product?.oncePerCustomer && coupon.productId) {
                const held = await tx.customerCoupon.count({
                    where: {storeId: session.storeId, customerId: coupon.customerId, productId: coupon.productId, status: 'active', ...notExpired},
                });
                if (held > 0) return '같은 쿠폰을 이미 보유 중이라 되돌릴 수 없습니다. (고객당 1장)';
            }
            await tx.customerCoupon.update({where: {id: couponId}, data: {status: 'active', usedAt: null}});
            return null;
        }, {isolationLevel: 'Serializable'});

        if (error) return res.status(400).json({error});
        return res.status(200).json({ok: true});
    } catch {
        // Serializable 충돌(동시 처리) 등 — 다시 시도하면 최신 상태로 판정된다.
        return res.status(409).json({error: '다른 곳에서 동시에 처리 중입니다. 다시 시도해 주세요.'});
    }
}
