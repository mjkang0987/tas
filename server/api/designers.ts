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

            // 디자이너 행은 예약 FK라 보존 필요 → upsert 유지(값이 행마다 달라 배치 불가).
            // 스케줄은 디자이너별 요일 upsert(N×7) 대신, 모아서 일괄 교체(deleteMany+createMany).
            const scheduleRows: Array<{
                designerId: string;
                dayIndex: number;
                enabled: boolean;
                startTime: string;
                endTime: string;
            }> = [];

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
                    scheduleRows.push({
                        designerId: savedDesigner.id,
                        dayIndex,
                        enabled: schedule.enabled,
                        startTime: schedule.start,
                        endTime: schedule.end,
                    });
                }
            }

            // 스케줄 데이터가 온 디자이너만 한 번에 교체(deleteMany+createMany).
            // 스케줄이 payload에 없는 디자이너의 기존 스케줄은 건드리지 않는다(원동작 보존).
            const scheduledDesignerIds = [...new Set(scheduleRows.map((r) => r.designerId))];
            if (scheduledDesignerIds.length > 0) {
                await tx.designerSchedule.deleteMany({where: {designerId: {in: scheduledDesignerIds}}});
                await tx.designerSchedule.createMany({data: scheduleRows});
            }
        });

        return res.status(200).json({designers});
    }

    if (req.method === 'DELETE') {
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as { id?: number };

        if (typeof id !== 'number') {
            return res.status(400).json({error: 'Invalid designer id'});
        }

        const designer = await prisma.designer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: id}},
            select: {id: true},
        });

        if (!designer) {
            return res.status(404).json({error: 'Designer not found'});
        }

        await prisma.$transaction(async (tx) => {
            // 분리 삭제: 예약은 보존하되 디자이너 연결만 해제(미지정).
            // 스케줄은 onDelete Cascade로 designer.delete 시 함께 삭제된다.
            await tx.reservation.updateMany({
                where: {storeId: session.storeId, designerId: designer.id},
                data: {designerId: null},
            });
            await tx.designer.delete({where: {id: designer.id}});
        });

        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
