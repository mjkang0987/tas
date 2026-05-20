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

    const body = req.body as { sourceId?: number; sourceIds?: number[]; targetId: number };
    const sourceIds = body.sourceIds ?? (typeof body.sourceId === 'number' ? [body.sourceId] : []);
    const {targetId} = body;

    if (sourceIds.length === 0 || typeof targetId !== 'number' || sourceIds.includes(targetId)) {
        return res.status(400).json({error: 'Invalid sourceIds or targetId'});
    }

    const [sources, target] = await Promise.all([
        prisma.customer.findMany({
            where: {storeId: session.storeId, legacyId: {in: sourceIds}},
            include: {memoTags: true},
        }),
        prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: targetId}},
            include: {memoTags: true},
        }),
    ]);

    if (sources.length !== sourceIds.length || !target) {
        return res.status(404).json({error: 'Customer not found'});
    }

    const result = await prisma.$transaction(async (tx) => {
        const mergeHistoryIds: string[] = [];
        let currentTargetPoints = target.points;
        let currentTargetFirstVisit = target.firstVisitDate;
        const currentTargetTagTexts = new Set(target.memoTags.map((t) => t.text));

        for (const source of sources) {
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

            // 3. 메모태그 병합 (target에 없는 것만 추가)
            const newTags = source.memoTags.filter((t) => !currentTargetTagTexts.has(t.text));
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
                    select: {id: true, text: true},
                });
                addedTagIds = created.map((t) => t.id);
                for (const t of created) currentTargetTagTexts.add(t.text);
            }

            // 4. 병합 이력 저장 (분리 복원용) — target 스냅샷은 이 source 병합 직전 상태
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
                        points: currentTargetPoints,
                        firstVisitDate: currentTargetFirstVisit,
                    },
                    movedReservationIds: movedReservations.map((r) => r.id),
                    movedPointHistoryIds: movedPointHistories.map((p) => p.id),
                    addedMemoTagIds: addedTagIds,
                },
            });
            mergeHistoryIds.push(mergeHistory.id);

            // 5. 포인트 합산 + firstVisitDate 갱신
            currentTargetPoints += source.points;
            const earliestDate = source.firstVisitDate && currentTargetFirstVisit
                ? (source.firstVisitDate < currentTargetFirstVisit ? source.firstVisitDate : currentTargetFirstVisit)
                : source.firstVisitDate ?? currentTargetFirstVisit;
            currentTargetFirstVisit = earliestDate;

            // 6. source 고객 삭제
            await tx.customer.delete({where: {id: source.id}});
        }

        // target 고객 최종 업데이트
        await tx.customer.update({
            where: {id: target.id},
            data: {
                points: currentTargetPoints,
                ...(currentTargetFirstVisit && {firstVisitDate: currentTargetFirstVisit}),
            },
        });

        return {mergeHistoryIds};
    });

    return res.status(200).json({merged: true, targetId, mergeHistoryIds: result.mergeHistoryIds});
}
