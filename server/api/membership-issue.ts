import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {frontendPaymentMethodToDb} from '../db/mappers';
import {RECEIVED_PAYMENT_METHODS} from '../../client/features/reservations/model';

// 회원권 발급/취소. (상품 CRUD 는 ./memberships.ts)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'POST') {
        if (!requireRole(session, 'staff', res)) return;

        const {customerId, productId, mode, salePrice, paymentMethod, remainingCount, expiresAt: expiresAtInput} = req.body as {
            customerId?: unknown; productId?: unknown;
            // sale = 판매(그날 매출), carryover = 기존 회원권 등록(시스템 이전 판매분 — 매출 없음). 없으면 판매(예전 앱 호환).
            mode?: unknown; salePrice?: unknown; paymentMethod?: unknown; remainingCount?: unknown; expiresAt?: unknown;
        };
        const isCarryover = mode === 'carryover';
        if (mode !== undefined && mode !== 'sale' && !isCarryover) return res.status(400).json({error: 'Invalid mode'});
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
        if (customer.deletedAt) return res.status(400).json({error: '삭제된 고객에게는 회원권을 발급할 수 없습니다.'});

        const product = await prisma.membershipProduct.findFirst({
            where: {id: productId, storeId: session.storeId},
        });
        if (!product) return res.status(404).json({error: 'Product not found'});

        // 가드: 보관(archived) 상품은 발급 불가. (쿠폰 coupon-issue와 동일 규칙)
        if (product.status !== 'active') {
            return res.status(400).json({error: '보관된 회원권은 발급할 수 없습니다.'});
        }

        let expiresAt = product.validDays != null
            ? new Date(Date.now() + product.validDays * 24 * 60 * 60 * 1000)
            : null;
        let remaining = product.totalCount;
        let sale: {salePrice: number | null; salePaymentMethod: ReturnType<typeof frontendPaymentMethodToDb> | null} = {salePrice: null, salePaymentMethod: null};

        if (isCarryover) {
            // 이미 쓰던 회원권 옮겨 넣기: 남은 횟수·만료일을 받는다(횟수권만 남은 횟수 필요). 매출 없음.
            if (product.totalCount != null) {
                if (typeof remainingCount !== 'number' || !Number.isInteger(remainingCount) || remainingCount < 1 || remainingCount > product.totalCount) {
                    return res.status(400).json({error: `남은 횟수는 1~${product.totalCount}회로 입력해 주세요.`});
                }
                remaining = remainingCount;
            }
            if (expiresAtInput !== undefined && expiresAtInput !== null && expiresAtInput !== '') {
                if (typeof expiresAtInput !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAtInput)) {
                    return res.status(400).json({error: 'Invalid expiresAt'});
                }
                // 그날 끝까지 쓸 수 있게 한국 시간 하루 끝으로.
                expiresAt = new Date(`${expiresAtInput}T23:59:59+09:00`);
            } else if (expiresAtInput === null || expiresAtInput === '') {
                expiresAt = null;
            }
        } else {
            // 판매: 금액(기본 상품가)·결제수단을 남겨 그날 매출로 잡는다.
            const price = salePrice === undefined ? product.price : salePrice;
            if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) {
                return res.status(400).json({error: '판매 금액이 올바르지 않습니다.'});
            }
            if (paymentMethod !== undefined && (typeof paymentMethod !== 'string' || !(RECEIVED_PAYMENT_METHODS as readonly string[]).includes(paymentMethod))) {
                return res.status(400).json({error: 'Invalid paymentMethod'});
            }
            sale = {salePrice: price, salePaymentMethod: typeof paymentMethod === 'string' ? frontendPaymentMethodToDb(paymentMethod) : null};
        }

        const created = await prisma.customerMembership.create({
            data: {
                storeId: session.storeId,
                customerId: customer.id,
                productId: product.id,
                name: product.name,
                totalCount: product.totalCount,
                remainingCount: remaining,
                expiresAt,
                status: 'active',
                ...sale,
                usages: {create: {delta: remaining ?? 0, type: 'issue', memo: isCarryover ? '기존 회원권 등록' : '판매 발급'}},
            },
        });

        return res.status(200).json({id: created.id});
    }

    if (req.method === 'DELETE') {
        if (!requireRole(session, 'staff', res)) return;

        const {id} = req.body as {id?: unknown};
        if (typeof id !== 'string') return res.status(400).json({error: 'Invalid id'});

        const result = await prisma.customerMembership.updateMany({
            where: {id, storeId: session.storeId},
            data: {status: 'cancelled'},
        });
        if (result.count === 0) return res.status(404).json({error: 'Not found'});
        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
