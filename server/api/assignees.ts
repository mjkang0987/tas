import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbAssigneeToFrontend, frontendAssigneeStatusToDb, parseI18nText} from '../db/mappers';
import type {Assignee} from '../../client/features/assignees/model';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const dbAssignees = await prisma.assignee.findMany({
            where: {storeId: session.storeId},
            include: {schedules: true},
            orderBy: {legacyId: 'asc'},
        });

        const assignees = dbAssignees.map(dbAssigneeToFrontend);
        return res.status(200).json({assignees});
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'owner', res)) return;

        const {assignees} = req.body as { assignees: Assignee[] };

        if (!Array.isArray(assignees)) {
            return res.status(400).json({error: 'Invalid assignees payload'});
        }

        const incomingLegacyIds = new Set(assignees.map((d) => d.id));

        const existingAssignees = await prisma.assignee.findMany({
            where: {storeId: session.storeId},
            select: {id: true, legacyId: true, name: true},
        });

        const toDelete = existingAssignees.filter((d) => d.legacyId !== null && !incomingLegacyIds.has(d.legacyId));

        if (toDelete.length > 0) {
            const linkedReservations = await prisma.reservation.groupBy({
                by: ['assigneeId'],
                where: {
                    storeId: session.storeId,
                    assigneeId: {in: toDelete.map((assignee) => assignee.id)},
                },
                _count: {_all: true},
            });

            const linkedAssigneeIds = new Set(
                linkedReservations
                    .map((item) => item.assigneeId)
                    .filter((assigneeId): assigneeId is string => !!assigneeId)
            );

            if (linkedAssigneeIds.size > 0) {
                const blockedNames = toDelete
                    .filter((assignee) => linkedAssigneeIds.has(assignee.id))
                    .map((assignee) => assignee.name);

                return res.status(400).json({
                    error: `예약에 연결된 담당자는 삭제할 수 없습니다: ${blockedNames.join(', ')}`
                });
            }
        }

        await prisma.$transaction(async (tx) => {
            if (toDelete.length > 0) {
                await tx.assignee.deleteMany({
                    where: {id: {in: toDelete.map((d) => d.id)}},
                });
            }

            // 담당자 행은 예약 FK라 보존 필요 → upsert 유지(값이 행마다 달라 배치 불가).
            // 스케줄은 담당자별 요일 upsert(N×7) 대신, 모아서 일괄 교체(deleteMany+createMany).
            const scheduleRows: Array<{
                assigneeId: string;
                dayIndex: number;
                enabled: boolean;
                startTime: string;
                endTime: string;
            }> = [];

            for (const assignee of assignees) {
                const savedAssignee = await tx.assignee.upsert({
                    where: {storeId_legacyId: {storeId: session.storeId, legacyId: assignee.id}},
                    update: {
                        name: assignee.name,
                        nameI18nJson: parseI18nText(assignee.nameI18n) ?? Prisma.JsonNull,
                        status: frontendAssigneeStatusToDb(assignee.status),
                        phone: assignee.phone ?? null,
                        note: assignee.note ?? null,
                        color: assignee.color ?? null,
                    },
                    create: {
                        storeId: session.storeId,
                        legacyId: assignee.id,
                        name: assignee.name,
                        nameI18nJson: parseI18nText(assignee.nameI18n) ?? Prisma.JsonNull,
                        status: frontendAssigneeStatusToDb(assignee.status),
                        phone: assignee.phone ?? null,
                        note: assignee.note ?? null,
                        color: assignee.color ?? null,
                    },
                });

                for (const [dayIndex, schedule] of (assignee.schedule ?? []).entries()) {
                    scheduleRows.push({
                        assigneeId: savedAssignee.id,
                        dayIndex,
                        enabled: schedule.enabled,
                        startTime: schedule.start,
                        endTime: schedule.end,
                    });
                }
            }

            // 스케줄 데이터가 온 담당자만 한 번에 교체(deleteMany+createMany).
            // 스케줄이 payload에 없는 담당자의 기존 스케줄은 건드리지 않는다(원동작 보존).
            const scheduledAssigneeIds = [...new Set(scheduleRows.map((r) => r.assigneeId))];
            if (scheduledAssigneeIds.length > 0) {
                await tx.assigneeSchedule.deleteMany({where: {assigneeId: {in: scheduledAssigneeIds}}});
                await tx.assigneeSchedule.createMany({data: scheduleRows});
            }
        });

        return res.status(200).json({assignees});
    }

    if (req.method === 'DELETE') {
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as { id?: number };

        if (typeof id !== 'number') {
            return res.status(400).json({error: 'Invalid assignee id'});
        }

        const assignee = await prisma.assignee.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: id}},
            select: {id: true},
        });

        if (!assignee) {
            return res.status(404).json({error: 'Assignee not found'});
        }

        await prisma.$transaction(async (tx) => {
            // 분리 삭제: 예약은 보존하되 담당자 연결만 해제(미지정).
            // 스케줄은 onDelete Cascade로 assignee.delete 시 함께 삭제된다.
            await tx.reservation.updateMany({
                where: {storeId: session.storeId, assigneeId: assignee.id},
                data: {assigneeId: null},
            });
            await tx.assignee.delete({where: {id: assignee.id}});
        });

        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
