import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'staff', res)) return;

    const {sourceId, targetId} = req.body as { sourceId: number; targetId: number };

    if (typeof sourceId !== 'number' || typeof targetId !== 'number' || sourceId === targetId) {
        return res.status(400).json({error: 'Invalid sourceId or targetId'});
    }

    const [source, target] = await Promise.all([
        prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: sourceId}},
            include: {memoTags: true},
        }),
        prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: targetId}},
            include: {memoTags: true},
        }),
    ]);

    if (!source || !target) {
        return res.status(404).json({error: 'Customer not found'});
    }

    const result = await prisma.$transaction(async (tx) => {
        // 이동할 예약·포인트이력 ID 수집
        const movedReservations = await tx.reservation.findMany({
            where: {customerId: source.id},
            select: {id: true},
        });
        const movedPointHistories = await tx.customerPointHistory.findMany({
            where: {customerId: source.id},
            select: {id: true},
        });

        // 1. 예약 이전
        await tx.reservation.updateMany({
            where: {customerId: source.id},
            data: {customerId: target.id},
        });

        // 2. 포인트 이력 이전
        await tx.customerPointHistory.updateMany({
            where: {customerId: source.id},
            data: {customerId: target.id},
        });

        // 3. 메모태그 병합 (source에만 있는 것 추가)
        const targetTagTexts = new Set(target.memoTags.map((t) => t.text));
        const newTags = source.memoTags.filter((t) => !targetTagTexts.has(t.text));
        let addedTagIds: string[] = [];
        if (newTags.length > 0) {
            await tx.customerMemoTag.createMany({
                data: newTags.map((t) => ({
                    customerId: target.id,
                    text: t.text,
                    color: t.color,
                })),
            });
            const created = await tx.customerMemoTag.findMany({
                where: {
                    customerId: target.id,
                    text: {in: newTags.map((t) => t.text)},
                },
                select: {id: true},
            });
            addedTagIds = created.map((t) => t.id);
        }

        // 4. 포인트 합산 + firstVisitDate 갱신
        const earliestDate = source.firstVisitDate && target.firstVisitDate
            ? (source.firstVisitDate < target.firstVisitDate ? source.firstVisitDate : target.firstVisitDate)
            : source.firstVisitDate ?? target.firstVisitDate;

        await tx.customer.update({
            where: {id: target.id},
            data: {
                points: target.points + source.points,
                ...(earliestDate && {firstVisitDate: earliestDate}),
            },
        });

        // 5. 병합 이력 저장 (분리 복원용)
        const mergeHistory = await tx.customerMergeHistory.create({
            data: {
                storeId: session.storeId,
                sourceCustomerJson: {
                    id: source.id,
                    legacyId: source.legacyId,
                    name: source.name,
                    tel: source.tel,
                    points: source.points,
                    firstVisitDate: source.firstVisitDate,
                    allergyNote: source.allergyNote,
                    claimNote: source.claimNote,
                    preferenceNote: source.preferenceNote,
                    memoTags: source.memoTags.map((t) => ({text: t.text, color: t.color})),
                },
                targetCustomerJson: {
                    id: target.id,
                    legacyId: target.legacyId,
                    points: target.points,
                    firstVisitDate: target.firstVisitDate,
                },
                movedReservationIds: movedReservations.map((r) => r.id),
                movedPointHistoryIds: movedPointHistories.map((p) => p.id),
                addedMemoTagIds: addedTagIds,
            },
        });

        // 6. source 고객 삭제 (memoTags cascade 삭제)
        await tx.customer.delete({where: {id: source.id}});

        return {mergeHistoryId: mergeHistory.id};
    });

    return res.status(200).json({merged: true, targetId, mergeHistoryId: result.mergeHistoryId});
}
