import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {
    dbReservationToFrontend,
    dbHistoryToFrontend,
    frontendReservationStatusToDb,
    frontendPaymentMethodToDb,
    frontendChannelToDb,
} from '../db/mappers';
import {reservationInclude} from '../db/prisma-includes';
import {notifySlackForStore} from '../notify/slack';
import type {Reservation, ReservationStatus} from '../../client/features/reservations/model';
import {hasCompletedPayment} from '../../client/features/reservations/model';

async function resolveCustomerCuid(storeId: string, legacyId: number): Promise<string | null> {
    const customer = await prisma.customer.findUnique({
        where: {storeId_legacyId: {storeId, legacyId}},
        select: {id: true},
    });
    return customer?.id ?? null;
}

async function resolveDesignerCuid(storeId: string, legacyId: number | undefined): Promise<string | null> {
    if (!legacyId) return null;
    const designer = await prisma.designer.findUnique({
        where: {storeId_legacyId: {storeId, legacyId}},
        select: {id: true},
    });
    return designer?.id ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const [dbReservations, dbHistories] = await Promise.all([
            prisma.reservation.findMany({
                where: {storeId: session.storeId},
                include: reservationInclude,
            }),
            prisma.reservationHistory.findMany({
                where: {storeId: session.storeId},
                include: {reservation: {select: {legacyId: true}}},
                orderBy: {createdAt: 'asc'},
            }),
        ]);

        const reservations = dbReservations.map(dbReservationToFrontend);
        const history = dbHistories.map(dbHistoryToFrontend);

        return res.status(200).json({reservations, history});
    }

    if (req.method === 'POST') {
        if (!requireRole(session, 'staff', res)) return;

        const reservation = req.body as Reservation;

        const customerId = await resolveCustomerCuid(session.storeId, reservation.customerId);
        if (!customerId) {
            return res.status(400).json({error: 'Customer not found'});
        }

        const designerId = await resolveDesignerCuid(session.storeId, reservation.designerId);

        const paymentEntries = (reservation.paymentEntries ?? []).map((e) => ({
            method: frontendPaymentMethodToDb(e.method),
            amount: e.amount,
        }));

        const created = await prisma.reservation.create({
            data: {
                storeId: session.storeId,
                legacyId: reservation.id,
                customerId,
                designerId,
                date: new Date(`${reservation.date}T00:00:00`),
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                serviceSummary: reservation.service,
                status: frontendReservationStatusToDb(reservation.status),
                price: reservation.price ?? 0,
                memo: reservation.memo ?? null,
                paymentCompleted: reservation.paymentCompleted ?? false,
                pointEarned: reservation.pointEarned ?? 0,
                ...(reservation.channel && { channel: frontendChannelToDb(reservation.channel) }),
                paymentEntries: paymentEntries.length > 0
                    ? {createMany: {data: paymentEntries}}
                    : undefined,
            },
            include: reservationInclude,
        });

        await notifySlackForStore(session.storeId,
            `🗓️ *새 예약*\n• 날짜: ${reservation.date}`
            + `\n• 시간: ${reservation.startTime}~${reservation.endTime}`
            + `\n• 시술: ${reservation.service ?? '-'}`
        );

        return res.status(201).json({reservation: dbReservationToFrontend(created)});
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'staff', res)) return;

        const {prev, updated} = req.body as { prev: Reservation; updated: Reservation };

        if (updated.status === 'completed' && !hasCompletedPayment(updated)) {
            return res.status(400).json({error: 'Only paid reservations can be completed'});
        }

        const dbReservation = await prisma.reservation.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: prev.id}},
            select: {id: true},
        });

        if (!dbReservation) {
            return res.status(404).json({error: 'Reservation not found'});
        }

        const customerId = await resolveCustomerCuid(session.storeId, updated.customerId);
        if (!customerId) {
            return res.status(400).json({error: 'Customer not found'});
        }

        const designerId = await resolveDesignerCuid(session.storeId, updated.designerId);

        const paymentEntries = (updated.paymentEntries ?? []).map((e) => ({
            method: frontendPaymentMethodToDb(e.method),
            amount: e.amount,
        }));

        const [savedReservation] = await prisma.$transaction([
            prisma.reservation.update({
                where: {id: dbReservation.id},
                data: {
                    customerId,
                    designerId,
                    date: new Date(`${updated.date}T00:00:00`),
                    startTime: updated.startTime,
                    endTime: updated.endTime,
                    serviceSummary: updated.service,
                    status: frontendReservationStatusToDb(updated.status),
                    price: updated.price ?? 0,
                    memo: updated.memo ?? null,
                    paymentCompleted: updated.paymentCompleted ?? false,
                    pointEarned: updated.pointEarned ?? 0,
                },
                include: reservationInclude,
            }),
            prisma.reservationPaymentEntry.deleteMany({where: {reservationId: dbReservation.id}}),
            ...(paymentEntries.length > 0
                ? [prisma.reservationPaymentEntry.createMany({
                    data: paymentEntries.map((e) => ({reservationId: dbReservation.id, ...e})),
                })]
                : []),
            prisma.reservationHistory.create({
                data: {
                    storeId: session.storeId,
                    reservationId: dbReservation.id,
                    beforeJson: prev as object,
                    afterJson: updated as object,
                },
            }),
        ]);

        const entry = {
            reservationId: prev.id,
            before: prev,
            after: updated,
            timestamp: new Date().toISOString(),
        };

        // 일정·시술·디자이너가 실제로 바뀐 경우에만 알림 (결제만 저장한 경우 제외)
        const scheduleChanged = prev.date !== updated.date
            || prev.startTime !== updated.startTime
            || prev.endTime !== updated.endTime
            || prev.service !== updated.service
            || prev.designerId !== updated.designerId;
        if (scheduleChanged) {
            await notifySlackForStore(session.storeId,
                `✏️ *예약 변경*\n• 날짜: ${updated.date}`
                + `\n• 시간: ${updated.startTime}~${updated.endTime}`
                + `\n• 시술: ${updated.service ?? '-'}`
                + `\n• (이전) ${prev.date} ${prev.startTime}~${prev.endTime} ${prev.service ?? '-'}`
            );
        }

        return res.status(200).json({reservation: dbReservationToFrontend(savedReservation), historyEntry: entry});
    }

    if (req.method === 'PATCH') {
        if (!requireRole(session, 'staff', res)) return;

        const {id, status} = req.body as { id: number; status: ReservationStatus };

        const dbReservation = await prisma.reservation.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: id}},
            include: reservationInclude,
        });

        if (!dbReservation) {
            return res.status(404).json({error: 'Reservation not found'});
        }

        const before = dbReservationToFrontend(dbReservation);

        // 상태 변경과 이력 기록을 한 트랜잭션으로 묶어 원자화(이력 생성 실패 시 상태도 롤백).
        const after = await prisma.$transaction(async (tx) => {
            const updatedReservation = await tx.reservation.update({
                where: {id: dbReservation.id},
                data: {status: frontendReservationStatusToDb(status)},
                include: reservationInclude,
            });

            const afterFront = dbReservationToFrontend(updatedReservation);

            await tx.reservationHistory.create({
                data: {
                    storeId: session.storeId,
                    reservationId: dbReservation.id,
                    beforeJson: before as object,
                    afterJson: afterFront as object,
                },
            });

            return afterFront;
        });

        const entry = {
            reservationId: id,
            before,
            after,
            timestamp: new Date().toISOString(),
        };

        if (after.status === 'cancelled') {
            await notifySlackForStore(session.storeId,
                `❌ *예약 취소*\n• 날짜: ${after.date}`
                + `\n• 시간: ${after.startTime}~${after.endTime}`
                + `\n• 시술: ${after.service ?? '-'}`
            );
        } else if (after.status === 'noshow') {
            await notifySlackForStore(session.storeId,
                `🚫 *노쇼*\n• 날짜: ${after.date}`
                + `\n• 시간: ${after.startTime}~${after.endTime}`
                + `\n• 시술: ${after.service ?? '-'}`
            );
        }

        return res.status(200).json({reservation: after, historyEntry: entry});
    }

    if (req.method === 'DELETE') {
        // 예약 영구 삭제는 매니저 이상(매니저·오너).
        if (!requireRole(session, 'manager', res)) return;

        const {id} = req.body as { id: number };

        const dbReservation = await prisma.reservation.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: id}},
            include: reservationInclude,
        });

        if (!dbReservation) {
            return res.status(404).json({error: 'Reservation not found'});
        }

        const deleted = dbReservationToFrontend(dbReservation);

        // 결제내역·예약이력은 cascade 삭제, 포인트이력의 참조는 SET NULL 로 정리됨.
        await prisma.reservation.delete({where: {id: dbReservation.id}});

        await notifySlackForStore(session.storeId,
            `🗑️ *예약 삭제*\n• 날짜: ${deleted.date}`
            + `\n• 시간: ${deleted.startTime}~${deleted.endTime}`
            + `\n• 시술: ${deleted.service ?? '-'}`
        );

        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
