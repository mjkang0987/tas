import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

/**
 * 병합 제안 '건너뛰기' 기록.
 *
 * 예전엔 localStorage 에 뒀다. 그러면 기기·관리자마다 따로 놀고(PC 에서 건너뛴 것이
 * 태블릿에서 또 뜬다), 캐시를 지우면 판단이 통째로 사라진다. 중복예약 처리 이력
 * (`ConflictResolution`)을 서버에 둔 것과 같은 이유로 서버가 갖는다.
 *
 * ⚠️ 여기 오가는 `maskedId`/`candidateId` 는 **프론트 id = `Customer.legacyId`** 다.
 * 서버의 `Customer.id` 는 cuid 문자열이고, `dbCustomerToFrontend` 가 `legacyId` 를
 * 프론트 `id` 로 내보낸다(`mappers.ts:177`). 헷갈려서 `id` 로 조회하면 소유 검사가
 * 항상 실패한다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);
    if (!requireRole(session, 'staff', res)) return;

    if (req.method === 'GET') {
        const skips = await prisma.customerMergeSkip.findMany({
            where: {storeId: session.storeId},
            select: {maskedId: true, candidateId: true},
        });
        return res.status(200).json({skips});
    }

    if (req.method === 'POST') {
        const {maskedId, candidateId} = req.body as {maskedId?: unknown; candidateId?: unknown};

        if (!Number.isInteger(maskedId) || !Number.isInteger(candidateId)) {
            return res.status(400).json({error: 'Invalid maskedId/candidateId'});
        }

        const masked = maskedId as number;
        const candidate = candidateId as number;

        // 다른 매장 고객으로 기록을 심지 못하게 막는다. 두 값 모두 legacyId 다.
        const owned = await prisma.customer.count({
            where: {storeId: session.storeId, legacyId: {in: [masked, candidate]}},
        });
        if (owned !== 2) {
            return res.status(400).json({error: 'Customer not found'});
        }

        await prisma.customerMergeSkip.upsert({
            where: {
                storeId_maskedId_candidateId: {
                    storeId: session.storeId,
                    maskedId: masked,
                    candidateId: candidate,
                },
            },
            update: {skippedBy: session.userId},
            create: {
                storeId: session.storeId,
                maskedId: masked,
                candidateId: candidate,
                skippedBy: session.userId,
            },
        });

        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
