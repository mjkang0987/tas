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
import {notifySlack} from '../notify/slack';
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

        await notifySlack(
            `🗓️ *새 예약*\n• 날짜: ${reservation.date} ${reservation.startTime}`
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

        const updatedReservation = await prisma.reservation.update({
            where: {id: dbReservation.id},
            data: {status: frontendReservationStatusToDb(status)},
            include: reservationInclude,
        });

        const after = dbReservationToFrontend(updatedReservation);

        await prisma.reservationHistory.create({
            data: {
                storeId: session.storeId,
                reservationId: dbReservation.id,
                beforeJson: before as object,
                afterJson: after as object,
            },
        });

        const entry = {
            reservationId: id,
            before,
            after,
            timestamp: new Date().toISOString(),
        };

        return res.status(200).json({reservation: after, historyEntry: entry});
    }

    if (req.method === 'DELETE') {
        // 영구 삭제(되돌릴 수 없음)는 오너 전용.
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as { id: number };

        const dbReservation = await prisma.reservation.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: id}},
            select: {id: true},
        });

        if (!dbReservation) {
            return res.status(404).json({error: 'Reservation not found'});
        }

        // 결제내역·예약이력은 cascade 삭제, 포인트이력의 참조는 SET NULL 로 정리됨.
        await prisma.reservation.delete({where: {id: dbReservation.id}});

        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
