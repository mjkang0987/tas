import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbDesignerToFrontend} from '../db/mappers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end();
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'owner', res)) return;

    const {sourceId, targetId} = req.body as {sourceId: number; targetId: number};

    if (!sourceId || !targetId || sourceId === targetId) {
        return res.status(400).json({error: '잘못된 요청입니다.'});
    }

    const storeId = session!.storeId;

    const [source, target] = await Promise.all([
        prisma.designer.findUnique({
            where: {storeId_legacyId: {storeId, legacyId: sourceId}},
            select: {id: true},
        }),
        prisma.designer.findUnique({
            where: {storeId_legacyId: {storeId, legacyId: targetId}},
            select: {id: true},
        }),
    ]);

    if (!source || !target) {
        return res.status(404).json({error: '디자이너를 찾을 수 없습니다.'});
    }

    await prisma.$transaction(async (tx) => {
        await tx.reservation.updateMany({
            where: {storeId, designerId: source.id},
            data: {designerId: target.id},
        });
        await tx.designer.delete({where: {id: source.id}});
    });

    const dbDesigners = await prisma.designer.findMany({
        where: {storeId},
        include: {schedules: true},
        orderBy: {legacyId: 'asc'},
    });

    return res.json({ok: true, designers: dbDesigners.map(dbDesignerToFrontend)});
}
