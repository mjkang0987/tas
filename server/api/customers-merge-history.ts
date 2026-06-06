import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

type SourceSnapshot = {
    id: string;
    legacyId: number | null;
    name: string;
    tel: string;
};

type TargetSnapshot = {
    id: string;
    legacyId: number | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'staff', res)) return;

    const customerId = Number(req.query.customerId);
    if (!customerId || Number.isNaN(customerId)) {
        return res.status(400).json({error: 'Invalid customerId'});
    }

    const customer = await prisma.customer.findUnique({
        where: {storeId_legacyId: {storeId: session.storeId, legacyId: customerId}},
        select: {id: true},
    });

    if (!customer) {
        return res.status(404).json({error: 'Customer not found'});
    }

    const allHistories = await prisma.customerMergeHistory.findMany({
        where: {storeId: session.storeId},
        orderBy: {createdAt: 'desc'},
    });

    const histories = allHistories
        .filter((h) => {
            const target = h.targetCustomerJson as unknown as TargetSnapshot;
            return target.id === customer.id;
        })
        .map((h) => {
            const source = h.sourceCustomerJson as unknown as SourceSnapshot;
            return {
                id: h.id,
                sourceName: source.name,
                sourceTel: source.tel,
                mergedAt: h.createdAt.toISOString(),
            };
        });

    return res.status(200).json({histories});
}
