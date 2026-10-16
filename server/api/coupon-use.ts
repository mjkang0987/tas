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
    if (action === 'restore') {
        // 되돌리면 다시 쓸 수 있는 쿠폰이 된다 — 발급과 같은 규칙(만료 전, 고객당 1장)을 지킨다.
        const coupon = await prisma.customerCoupon.findFirst({
            where: {id: couponId, storeId: session.storeId, status: 'used'},
            select: {customerId: true, productId: true, expiresAt: true, product: {select: {oncePerCustomer: true}}},
        });
        if (!coupon) return res.status(400).json({error: '사용한 쿠폰만 되돌릴 수 있습니다.'});
        if (coupon.expiresAt && coupon.expiresAt <= now) {
            return res.status(400).json({error: '만료된 쿠폰은 되돌릴 수 없습니다.'});
        }
        if (coupon.product?.oncePerCustomer && coupon.productId) {
            const held = await prisma.customerCoupon.count({
                where: {
                    storeId: session.storeId, customerId: coupon.customerId, productId: coupon.productId, status: 'active',
                    OR: [{expiresAt: null}, {expiresAt: {gt: now}}],
                },
            });
            if (held > 0) return res.status(400).json({error: '같은 쿠폰을 이미 보유 중이라 되돌릴 수 없습니다. (고객당 1장)'});
        }
    }

    // 상태 조건을 where 에 넣어 한 번에 바꾼다 — 두 번 눌러도 두 번 처리되지 않는다.
    const result = action === 'use'
        ? await prisma.customerCoupon.updateMany({
            where: {id: couponId, storeId: session.storeId, status: 'active', OR: [{expiresAt: null}, {expiresAt: {gt: now}}]},
            data: {status: 'used', usedAt: now},
        })
        : await prisma.customerCoupon.updateMany({
            where: {id: couponId, storeId: session.storeId, status: 'used'},
            data: {status: 'active', usedAt: null},
        });

    if (result.count === 0) {
        return res.status(400).json({
            error: action === 'use' ? '사용할 수 없는 쿠폰입니다. (이미 사용·취소·만료)' : '사용한 쿠폰만 되돌릴 수 있습니다.',
        });
    }
    return res.status(200).json({ok: true});
}
