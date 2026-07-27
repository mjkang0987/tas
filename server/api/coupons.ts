import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 0 이상 정수 또는 null(빈값/무제한)로 정규화
function parseOptInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

// 코드: 공백 trim 후 빈값이면 null(직접발급 전용)
function parseCode(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

// 할인값 검증: 정액=0 이상 정수, 정률=0~100 정수. 빈값/누락은 무효(Number('')=0 통과 방지).
function parseDiscountValue(value: unknown, discountType: string): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    if (discountType === 'rate' && n > 100) return null;
    return Math.floor(n);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const [products, coupons] = await Promise.all([
            prisma.couponProduct.findMany({
                where: {storeId: session.storeId},
                orderBy: {createdAt: 'asc'},
            }),
            prisma.customerCoupon.findMany({
                where: {storeId: session.storeId},
                include: {customer: {select: {legacyId: true}}},
                orderBy: {issuedAt: 'desc'},
            }),
        ]);

        return res.status(200).json({
            products: products.map((p) => ({
                id: p.id,
                name: p.name,
                discountType: p.discountType,
                discountValue: p.discountValue,
                maxDiscount: p.maxDiscount,
                minOrderAmount: p.minOrderAmount,
                validDays: p.validDays,
                code: p.code,
                status: p.status,
            })),
            coupons: coupons.map((c) => ({
                id: c.id,
                customerId: c.customer.legacyId ?? 0,
                productId: c.productId,
                name: c.name,
                discountType: c.discountType,
                discountValue: c.discountValue,
                maxDiscount: c.maxDiscount,
                minOrderAmount: c.minOrderAmount,
                issuedAt: c.issuedAt.toISOString(),
                expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
                usedAt: c.usedAt ? c.usedAt.toISOString() : null,
                status: c.status,
            })),
        });
    }

    if (req.method === 'POST') {
        if (!requireRole(session, 'owner', res)) return;

        const body = req.body as {
            name?: unknown; discountType?: unknown; discountValue?: unknown;
            maxDiscount?: unknown; minOrderAmount?: unknown; validDays?: unknown; code?: unknown;
        };

        if (typeof body.name !== 'string' || !body.name.trim()) {
            return res.status(400).json({error: 'Invalid name'});
        }
        if (body.discountType !== 'amount' && body.discountType !== 'rate') {
            return res.status(400).json({error: 'Invalid discountType'});
        }
        const discountValue = parseDiscountValue(body.discountValue, body.discountType);
        if (discountValue === null) {
            return res.status(400).json({error: 'Invalid discountValue'});
        }

        const code = parseCode(body.code);
        try {
            const created = await prisma.couponProduct.create({
                data: {
                    storeId: session.storeId,
                    name: body.name.trim(),
                    discountType: body.discountType,
                    discountValue,
                    maxDiscount: body.discountType === 'rate' ? parseOptInt(body.maxDiscount) : null,
                    minOrderAmount: parseOptInt(body.minOrderAmount),
                    validDays: parseOptInt(body.validDays),
                    code,
                },
            });
            return res.status(200).json({
                id: created.id,
                name: created.name,
                discountType: created.discountType,
                discountValue: created.discountValue,
                maxDiscount: created.maxDiscount,
                minOrderAmount: created.minOrderAmount,
                validDays: created.validDays,
                code: created.code,
                status: created.status,
            });
        } catch (err) {
            if (err && typeof err === 'object' && 'code' in err && (err as {code?: string}).code === 'P2002') {
                return res.status(409).json({error: 'Duplicate code'});
            }
            throw err;
        }
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'owner', res)) return;

        const body = req.body as {
            id?: unknown; name?: unknown; discountType?: unknown; discountValue?: unknown;
            maxDiscount?: unknown; minOrderAmount?: unknown; validDays?: unknown; code?: unknown; status?: unknown;
        };

        if (typeof body.id !== 'string') return res.status(400).json({error: 'Invalid id'});
        if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
            return res.status(400).json({error: 'Invalid name'});
        }
        if (body.discountType !== undefined && body.discountType !== 'amount' && body.discountType !== 'rate') {
            return res.status(400).json({error: 'Invalid discountType'});
        }
        if (body.status !== undefined && body.status !== 'active' && body.status !== 'archived') {
            return res.status(400).json({error: 'Invalid status'});
        }

        // 할인값 검증은 (수정 후) 할인방식 기준으로. 방식 미전달 시 기존 레코드 방식 사용.
        let discountValue: number | undefined;
        if (body.discountValue !== undefined) {
            const existing = body.discountType === undefined
                ? await prisma.couponProduct.findFirst({where: {id: body.id, storeId: session.storeId}, select: {discountType: true}})
                : null;
            const effectiveType = (body.discountType as string | undefined) ?? existing?.discountType ?? 'amount';
            const parsed = parseDiscountValue(body.discountValue, effectiveType);
            if (parsed === null) return res.status(400).json({error: 'Invalid discountValue'});
            discountValue = parsed;
        }

        try {
            const result = await prisma.couponProduct.updateMany({
                where: {id: body.id, storeId: session.storeId},
                data: {
                    ...(body.name !== undefined && {name: (body.name as string).trim()}),
                    ...(body.discountType !== undefined && {discountType: body.discountType as string}),
                    ...(discountValue !== undefined && {discountValue}),
                    ...(body.maxDiscount !== undefined && {maxDiscount: parseOptInt(body.maxDiscount)}),
                    ...(body.minOrderAmount !== undefined && {minOrderAmount: parseOptInt(body.minOrderAmount)}),
                    ...(body.validDays !== undefined && {validDays: parseOptInt(body.validDays)}),
                    ...(body.code !== undefined && {code: parseCode(body.code)}),
                    ...(body.status !== undefined && {status: body.status as string}),
                },
            });
            if (result.count === 0) return res.status(404).json({error: 'Not found'});
            return res.status(200).json({ok: true});
        } catch (err) {
            if (err && typeof err === 'object' && 'code' in err && (err as {code?: string}).code === 'P2002') {
                return res.status(409).json({error: 'Duplicate code'});
            }
            throw err;
        }
    }

    if (req.method === 'DELETE') {
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as {id?: unknown};
        if (typeof id !== 'string') return res.status(400).json({error: 'Invalid id'});

        // 이미 고객에게 발급된 상품은 삭제 대신 보관(archive)으로 이력 보존.
        const issuedCount = await prisma.customerCoupon.count({
            where: {productId: id, storeId: session.storeId},
        });

        if (issuedCount > 0) {
            await prisma.couponProduct.updateMany({
                where: {id, storeId: session.storeId},
                data: {status: 'archived'},
            });
            return res.status(200).json({archived: true});
        }

        await prisma.couponProduct.deleteMany({where: {id, storeId: session.storeId}});
        return res.status(200).json({deleted: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
