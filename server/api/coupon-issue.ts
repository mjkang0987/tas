import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 쿠폰 직접 발급/취소. (상품 CRUD는 ./coupons.ts) — 회원권 membership-issue 패턴 미러.
// 코드형 발급(고객이 코드 입력) 및 결제 자동 차감(PaymentMethod.coupon)은 후속 Phase.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'POST') {
        if (!requireRole(session, 'staff', res)) return;

        const {customerId, productId} = req.body as {customerId?: unknown; productId?: unknown};
        if (typeof customerId !== 'number' || !Number.isInteger(customerId)) {
            return res.status(400).json({error: 'Invalid customerId'});
        }
        if (typeof productId !== 'string') {
            return res.status(400).json({error: 'Invalid productId'});
        }

        const customer = await prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: customerId}},
            select: {id: true, deletedAt: true},
        });
        if (!customer) return res.status(404).json({error: 'Customer not found'});
        // 삭제(익명 처리)된 고객에게는 발급하지 않는다 — 화면 고객 목록에서도 빠져 있다.
        if (customer.deletedAt) return res.status(400).json({error: '삭제된 고객에게는 쿠폰을 발급할 수 없습니다.'});

        const product = await prisma.couponProduct.findFirst({
            where: {id: productId, storeId: session.storeId},
        });
        if (!product) return res.status(404).json({error: 'Product not found'});

        // 가드: 보관(archived) 상품은 발급 불가.
        if (product.status !== 'active') {
            return res.status(400).json({error: '보관된 쿠폰은 발급할 수 없습니다.'});
        }
        // 가드: 상품이 '고객당 1장'이면 미사용(active)·만료 전 보유분이 있을 때 재발급 불가.
        // (사용/만료/취소된 건 제외 — 다 쓰고 나면 다시 받을 수 있다.)
        // 만료를 status 로 바꾸는 작업이 없어 active 인 채 만료일이 지난 쿠폰이 남는다 → 만료일로도 거른다.
        if (product.oncePerCustomer) {
            const held = await prisma.customerCoupon.count({
                where: {
                    storeId: session.storeId,
                    customerId: customer.id,
                    productId: product.id,
                    status: 'active',
                    OR: [{expiresAt: null}, {expiresAt: {gt: new Date()}}],
                },
            });
            if (held > 0) {
                return res.status(400).json({error: '이미 보유 중인 쿠폰입니다. (고객당 1장)'});
            }
        }

        const expiresAt = product.validDays != null
            ? new Date(Date.now() + product.validDays * 24 * 60 * 60 * 1000)
            : null;

        const created = await prisma.customerCoupon.create({
            data: {
                storeId: session.storeId,
                customerId: customer.id,
                productId: product.id,
                name: product.name,
                discountType: product.discountType,
                discountValue: product.discountValue,
                maxDiscount: product.maxDiscount,
                minOrderAmount: product.minOrderAmount,
                expiresAt,
                status: 'active',
            },
        });

        return res.status(200).json({id: created.id});
    }

    if (req.method === 'DELETE') {
        if (!requireRole(session, 'staff', res)) return;

        const {id} = req.body as {id?: unknown};
        if (typeof id !== 'string') return res.status(400).json({error: 'Invalid id'});

        const result = await prisma.customerCoupon.updateMany({
            where: {id, storeId: session.storeId},
            data: {status: 'cancelled'},
        });
        if (result.count === 0) return res.status(404).json({error: 'Not found'});
        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
