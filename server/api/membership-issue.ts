import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 회원권 발급/취소. (상품 CRUD 는 ./memberships.ts)
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
            select: {id: true},
        });
        if (!customer) return res.status(404).json({error: 'Customer not found'});

        const product = await prisma.membershipProduct.findFirst({
            where: {id: productId, storeId: session.storeId},
        });
        if (!product) return res.status(404).json({error: 'Product not found'});

        const expiresAt = product.validDays != null
            ? new Date(Date.now() + product.validDays * 24 * 60 * 60 * 1000)
            : null;

        const created = await prisma.customerMembership.create({
            data: {
                storeId: session.storeId,
                customerId: customer.id,
                productId: product.id,
                name: product.name,
                totalCount: product.totalCount,
                remainingCount: product.totalCount,
                expiresAt,
                status: 'active',
                usages: {create: {delta: product.totalCount ?? 0, type: 'issue', memo: '발급'}},
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
