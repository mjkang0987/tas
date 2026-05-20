import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

type SourceSnapshot = {
    id: string;
    legacyId: number | null;
    name: string;
    tel: string;
    points: number;
    firstVisitDate: string | null;
    allergyNote: string | null;
    claimNote: string | null;
    preferenceNote: string | null;
    memoTags: { text: string; color: string }[];
};

type TargetSnapshot = {
    id: string;
    legacyId: number | null;
    points: number;
    firstVisitDate: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'staff', res)) return;

    const {mergeHistoryId} = req.body as { mergeHistoryId: string };

    if (typeof mergeHistoryId !== 'string') {
        return res.status(400).json({error: 'Invalid mergeHistoryId'});
    }

    const history = await prisma.customerMergeHistory.findUnique({
        where: {id: mergeHistoryId},
    });

    if (!history || history.storeId !== session.storeId) {
        return res.status(404).json({error: 'Merge history not found'});
    }

    const source = history.sourceCustomerJson as unknown as SourceSnapshot;
    const target = history.targetCustomerJson as unknown as TargetSnapshot;
    const movedReservationIds = history.movedReservationIds as string[];
    const movedPointHistoryIds = history.movedPointHistoryIds as string[];
    const addedMemoTagIds = history.addedMemoTagIds as string[];

    await prisma.$transaction(async (tx) => {
        // 1. source 고객 복원
        await tx.customer.create({
            data: {
                id: source.id,
                storeId: session.storeId,
                legacyId: source.legacyId,
                name: source.name,
                tel: source.tel,
                points: source.points,
                firstVisitDate: source.firstVisitDate ? new Date(source.firstVisitDate) : null,
                allergyNote: source.allergyNote,
                claimNote: source.claimNote,
                preferenceNote: source.preferenceNote,
            },
        });

        // 2. source 메모태그 복원
        if (source.memoTags.length > 0) {
            await tx.customerMemoTag.createMany({
                data: source.memoTags.map((t) => ({
                    customerId: source.id,
                    text: t.text,
                    color: t.color,
                })),
            });
        }

        // 3. 예약 원복 (source로 되돌리기)
        if (movedReservationIds.length > 0) {
            await tx.reservation.updateMany({
                where: {id: {in: movedReservationIds}},
                data: {customerId: source.id},
            });
        }

        // 4. 포인트 이력 원복
        if (movedPointHistoryIds.length > 0) {
            await tx.customerPointHistory.updateMany({
                where: {id: {in: movedPointHistoryIds}},
                data: {customerId: source.id},
            });
        }

        // 5. 병합 시 추가된 메모태그 삭제
        if (addedMemoTagIds.length > 0) {
            await tx.customerMemoTag.deleteMany({
                where: {id: {in: addedMemoTagIds}},
            });
        }

        // 6. target 고객 포인트·firstVisitDate 원복
        await tx.customer.update({
            where: {id: target.id},
            data: {
                points: target.points,
                firstVisitDate: target.firstVisitDate ? new Date(target.firstVisitDate) : null,
            },
        });

        // 7. 병합 이력 삭제
        await tx.customerMergeHistory.delete({where: {id: mergeHistoryId}});
    });

    return res.status(200).json({unmerged: true, sourceId: source.legacyId, targetId: target.legacyId});
}
