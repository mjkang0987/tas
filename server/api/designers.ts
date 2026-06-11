import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbDesignerToFrontend, frontendDesignerStatusToDb} from '../db/mappers';
import type {Designer} from '../../client/features/designers/model';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const dbDesigners = await prisma.designer.findMany({
            where: {storeId: session.storeId},
            include: {schedules: true},
            orderBy: {legacyId: 'asc'},
        });

        const designers = dbDesigners.map(dbDesignerToFrontend);
        return res.status(200).json({designers});
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'owner', res)) return;

        const {designers} = req.body as { designers: Designer[] };

        if (!Array.isArray(designers)) {
            return res.status(400).json({error: 'Invalid designers payload'});
        }

        const incomingLegacyIds = new Set(designers.map((d) => d.id));

        const existingDesigners = await prisma.designer.findMany({
            where: {storeId: session.storeId},
            select: {id: true, legacyId: true, name: true},
        });

        const toDelete = existingDesigners.filter((d) => d.legacyId !== null && !incomingLegacyIds.has(d.legacyId));

        if (toDelete.length > 0) {
            const linkedReservations = await prisma.reservation.groupBy({
                by: ['designerId'],
                where: {
                    storeId: session.storeId,
                    designerId: {in: toDelete.map((designer) => designer.id)},
                },
                _count: {_all: true},
            });

            const linkedDesignerIds = new Set(
                linkedReservations
                    .map((item) => item.designerId)
                    .filter((designerId): designerId is string => !!designerId)
            );

            if (linkedDesignerIds.size > 0) {
                const blockedNames = toDelete
                    .filter((designer) => linkedDesignerIds.has(designer.id))
                    .map((designer) => designer.name);

                return res.status(400).json({
                    error: `예약에 연결된 디자이너는 삭제할 수 없습니다: ${blockedNames.join(', ')}`
                });
            }
        }

        await prisma.$transaction(async (tx) => {
            if (toDelete.length > 0) {
                await tx.designer.deleteMany({
                    where: {id: {in: toDelete.map((d) => d.id)}},
                });
            }

            for (const designer of designers) {
                const savedDesigner = await tx.designer.upsert({
                    where: {storeId_legacyId: {storeId: session.storeId, legacyId: designer.id}},
                    update: {
                        name: designer.name,
                        status: frontendDesignerStatusToDb(designer.status),
                        phone: designer.phone ?? null,
                        note: designer.note ?? null,
                        color: designer.color ?? null,
                    },
                    create: {
                        storeId: session.storeId,
                        legacyId: designer.id,
                        name: designer.name,
                        status: frontendDesignerStatusToDb(designer.status),
                        phone: designer.phone ?? null,
                        note: designer.note ?? null,
                        color: designer.color ?? null,
                    },
                });

                for (const [dayIndex, schedule] of (designer.schedule ?? []).entries()) {
                    await tx.designerSchedule.upsert({
                        where: {designerId_dayIndex: {designerId: savedDesigner.id, dayIndex}},
                        update: {
                            enabled: schedule.enabled,
                            startTime: schedule.start,
                            endTime: schedule.end,
                        },
                        create: {
                            designerId: savedDesigner.id,
                            dayIndex,
                            enabled: schedule.enabled,
                            startTime: schedule.start,
                            endTime: schedule.end,
                        },
                    });
                }
            }
        });

        return res.status(200).json({designers});
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
