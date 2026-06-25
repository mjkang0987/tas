import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 0 이상 정수 또는 null(빈값/무제한)로 정규화
function parseOptInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const [products, memberships] = await Promise.all([
            prisma.membershipProduct.findMany({
                where: {storeId: session.storeId},
                orderBy: {createdAt: 'asc'},
            }),
            prisma.customerMembership.findMany({
                where: {storeId: session.storeId},
                include: {customer: {select: {legacyId: true}}},
                orderBy: {issuedAt: 'desc'},
            }),
        ]);

        return res.status(200).json({
            products: products.map((p) => ({
                id: p.id,
                name: p.name,
                totalCount: p.totalCount,
                validDays: p.validDays,
                price: p.price,
                status: p.status,
            })),
            memberships: memberships.map((m) => ({
                id: m.id,
                customerId: m.customer.legacyId ?? 0,
                productId: m.productId,
                name: m.name,
                totalCount: m.totalCount,
                remainingCount: m.remainingCount,
                issuedAt: m.issuedAt.toISOString(),
                expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
                status: m.status,
            })),
        });
    }

    if (req.method === 'POST') {
        if (!requireRole(session, 'owner', res)) return;

        const {name} = req.body as {name?: unknown};
        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({error: 'Invalid name'});
        }

        const body = req.body as {totalCount?: unknown; validDays?: unknown; price?: unknown};
        const created = await prisma.membershipProduct.create({
            data: {
                storeId: session.storeId,
                name: name.trim(),
                totalCount: parseOptInt(body.totalCount),
                validDays: parseOptInt(body.validDays),
                price: parseOptInt(body.price) ?? 0,
            },
        });

        return res.status(200).json({
            id: created.id,
            name: created.name,
            totalCount: created.totalCount,
            validDays: created.validDays,
            price: created.price,
            status: created.status,
        });
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'owner', res)) return;

        const {id, name, totalCount, validDays, price, status} = req.body as {
            id?: unknown; name?: unknown; totalCount?: unknown; validDays?: unknown; price?: unknown; status?: unknown;
        };

        if (typeof id !== 'string') return res.status(400).json({error: 'Invalid id'});
        if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
            return res.status(400).json({error: 'Invalid name'});
        }
        if (status !== undefined && status !== 'active' && status !== 'archived') {
            return res.status(400).json({error: 'Invalid status'});
        }

        const result = await prisma.membershipProduct.updateMany({
            where: {id, storeId: session.storeId},
            data: {
                ...(name !== undefined && {name: (name as string).trim()}),
                ...(totalCount !== undefined && {totalCount: parseOptInt(totalCount)}),
                ...(validDays !== undefined && {validDays: parseOptInt(validDays)}),
                ...(price !== undefined && {price: parseOptInt(price) ?? 0}),
                ...(status !== undefined && {status: status as string}),
            },
        });

        if (result.count === 0) return res.status(404).json({error: 'Not found'});
        return res.status(200).json({ok: true});
    }

    if (req.method === 'DELETE') {
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as {id?: unknown};
        if (typeof id !== 'string') return res.status(400).json({error: 'Invalid id'});

        // 이미 고객에게 발급된 상품은 삭제 대신 보관(archive)으로 이력 보존.
        const issuedCount = await prisma.customerMembership.count({
            where: {productId: id, storeId: session.storeId},
        });

        if (issuedCount > 0) {
            await prisma.membershipProduct.updateMany({
                where: {id, storeId: session.storeId},
                data: {status: 'archived'},
            });
            return res.status(200).json({archived: true});
        }

        await prisma.membershipProduct.deleteMany({where: {id, storeId: session.storeId}});
        return res.status(200).json({deleted: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
