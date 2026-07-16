import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';
import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';

// 고객이 보낸 변경/취소 요청(오너 승인형)을 오너가 수락/거절하는 인증 API.
// 로그인 + staff 이상 역할 + storeId 스코프.

interface DecideBody {
    id?: unknown;
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
    customer: {select: {name: true}},
    assignee: {select: {name: true}},
} as const;

const CLEAR_PENDING = {
    pendingAction: 'none',
    pendingPayloadJson: Prisma.DbNull,
    pendingRequestedAt: null,
} as const;

function isChangePayload(v: unknown): v is ChangePayload {
    if (!v || typeof v !== 'object') return false;
    const p = v as Record<string, unknown>;
    return typeof p.date === 'string' && typeof p.startTime === 'string'
        && typeof p.endTime === 'string' && typeof p.serviceSummary === 'string';
}

function toRequestDto(r: Prisma.ReservationGetPayload<{select: typeof PENDING_SELECT}>) {
    return {
        id: r.id,
        legacyId: r.legacyId,
        customerName: r.customer?.name ?? '',
        assigneeName: r.assignee?.name ?? null,
        pendingAction: r.pendingAction,
        pendingRequestedAt: r.pendingRequestedAt?.toISOString() ?? null,
        current: {
            date: r.date.toISOString().slice(0, 10),
            startTime: r.startTime,
            endTime: r.endTime,
            serviceSummary: r.serviceSummary,
        },
        requestedChange: r.pendingAction === 'change' && isChangePayload(r.pendingPayloadJson)
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
            where: {storeId: session.storeId, pendingAction: {not: 'none'}},
            select: PENDING_SELECT,
            orderBy: {pendingRequestedAt: 'asc'},
        });
        return res.status(200).json({requests: rows.map(toRequestDto)});
    }

    if (req.method === 'POST') {
        if (!requireRole(session, 'staff', res)) return;

        const body = (req.body ?? {}) as DecideBody;
        const id = typeof body.id === 'string' ? body.id : '';
        const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
        if (!id || !decision) return res.status(400).json({error: 'invalid_input'});

        const reservation = await prisma.reservation.findFirst({
            where: {id, storeId: session.storeId},
            select: PENDING_SELECT,
        });
        if (!reservation) return res.status(404).json({error: 'not_found'});
        if (reservation.pendingAction === 'none') return res.status(409).json({error: 'no_pending'});

        if (decision === 'reject') {
            await prisma.reservation.update({where: {id}, data: CLEAR_PENDING});
            return res.status(200).json({ok: true, applied: 'rejected'});
        }

        // 수락(approve)
        if (reservation.pendingAction === 'cancel') {
            await prisma.reservation.update({where: {id}, data: {status: 'cancelled', ...CLEAR_PENDING}});
            return res.status(200).json({ok: true, applied: 'cancelled'});
        }

        // pendingAction === 'change' → 저장된 payload 적용
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
