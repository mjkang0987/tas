import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';
import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 오너 확정 대기 항목을 오너가 수락/거절하는 인증 API. 로그인 + staff 이상 + storeId 스코프.
// 두 종류:
//  - 신규 예약 신청(status='requested', pendingAction='none') → 수락=확정(active), 거절=취소(cancelled)
//  - 변경/취소 요청(pendingAction != 'none', active 예약) → 수락 시 반영, 거절 시 요청 폐기(예약 유지)

interface DecideBody {
    id?: unknown;
    legacyId?: unknown;
    decision?: unknown;
}

interface ChangePayload {
    date: string;
    startTime: string;
    endTime: string;
    serviceSummary: string;
    assigneeId: string | null;
    price?: number;
}

const PENDING_SELECT = {
    id: true,
    legacyId: true,
    date: true,
    startTime: true,
    endTime: true,
    serviceSummary: true,
    status: true,
    assigneeId: true,
    pendingAction: true,
    pendingPayloadJson: true,
    pendingRequestedAt: true,
    createdAt: true,
    customer: {select: {name: true}},
    assignee: {select: {name: true}},
} as const;

const CLEAR_PENDING = {
    pendingAction: 'none',
    pendingPayloadJson: Prisma.DbNull,
    pendingRequestedAt: null,
} as const;

type PendingRow = Prisma.ReservationGetPayload<{select: typeof PENDING_SELECT}>;

// 항목 종류: 신규 신청 vs 변경/취소 요청
function kindOf(r: PendingRow): 'new' | 'cancel' | 'change' {
    if (r.status === 'requested' && r.pendingAction === 'none') return 'new';
    return r.pendingAction === 'change' ? 'change' : 'cancel';
}

function isChangePayload(v: unknown): v is ChangePayload {
    if (!v || typeof v !== 'object') return false;
    const p = v as Record<string, unknown>;
    return typeof p.date === 'string' && typeof p.startTime === 'string'
        && typeof p.endTime === 'string' && typeof p.serviceSummary === 'string';
}

function toRequestDto(r: PendingRow) {
    const kind = kindOf(r);
    return {
        id: r.id,
        legacyId: r.legacyId,
        kind,
        customerName: r.customer?.name ?? '',
        assigneeName: r.assignee?.name ?? null,
        requestedAt: (r.pendingRequestedAt ?? r.createdAt)?.toISOString() ?? null,
        current: {
            date: r.date.toISOString().slice(0, 10),
            startTime: r.startTime,
            endTime: r.endTime,
            serviceSummary: r.serviceSummary,
        },
        requestedChange: kind === 'change' && isChangePayload(r.pendingPayloadJson)
            ? {
                date: r.pendingPayloadJson.date,
                startTime: r.pendingPayloadJson.startTime,
                endTime: r.pendingPayloadJson.endTime,
                serviceSummary: r.pendingPayloadJson.serviceSummary,
            }
            : null,
    };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;
        const rows = await prisma.reservation.findMany({
            where: {storeId: session.storeId, OR: [{status: 'requested'}, {pendingAction: {not: 'none'}}]},
            select: PENDING_SELECT,
            orderBy: {createdAt: 'asc'},
        });
        return res.status(200).json({requests: rows.map(toRequestDto)});
    }

    if (req.method === 'POST') {
        if (!requireRole(session, 'staff', res)) return;

        const body = (req.body ?? {}) as DecideBody;
        // 오너 벨은 cuid(id), 예약 상세 레이어는 클라 Reservation의 legacyId로 대상 지정.
        const id = typeof body.id === 'string' ? body.id : '';
        const legacyId = typeof body.legacyId === 'number' ? body.legacyId : null;
        const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
        if ((!id && legacyId === null) || !decision) return res.status(400).json({error: 'invalid_input'});

        const reservation = await prisma.reservation.findFirst({
            where: {storeId: session.storeId, ...(id ? {id} : {legacyId: legacyId as number})},
            select: PENDING_SELECT,
        });
        if (!reservation) return res.status(404).json({error: 'not_found'});

        const kind = kindOf(reservation);
        const hasPending = reservation.status === 'requested' || reservation.pendingAction !== 'none';
        if (!hasPending) return res.status(409).json({error: 'no_pending'});

        // 신규 예약 신청 확정/거절
        if (kind === 'new') {
            const status = decision === 'approve' ? 'active' : 'cancelled';
            await prisma.reservation.update({where: {id: reservation.id}, data: {status}});
            return res.status(200).json({ok: true, applied: decision === 'approve' ? 'confirmed' : 'rejected'});
        }

        // 변경/취소 요청 거절 → 요청만 폐기(예약 유지)
        if (decision === 'reject') {
            await prisma.reservation.update({where: {id: reservation.id}, data: CLEAR_PENDING});
            return res.status(200).json({ok: true, applied: 'rejected'});
        }

        // 취소 요청 수락
        if (kind === 'cancel') {
            await prisma.reservation.update({where: {id: reservation.id}, data: {status: 'cancelled', ...CLEAR_PENDING}});
            return res.status(200).json({ok: true, applied: 'cancelled'});
        }

        // 변경 요청 수락 → 저장된 payload 적용
        const payload = reservation.pendingPayloadJson;
        if (!isChangePayload(payload)) return res.status(422).json({error: 'invalid_payload'});
        await prisma.reservation.update({
            where: {id},
            data: {
                date: new Date(`${payload.date}T00:00:00`),
                startTime: payload.startTime,
                endTime: payload.endTime,
                serviceSummary: payload.serviceSummary,
                assigneeId: payload.assigneeId ?? null,
                ...(typeof payload.price === 'number' ? {price: payload.price} : {}),
                ...CLEAR_PENDING,
            },
        });
        return res.status(200).json({ok: true, applied: 'changed'});
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
