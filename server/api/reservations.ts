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
import {reservationSelect} from '../db/prisma-includes';
import {notifySlackForStore, customerNoteLine} from '../notify/slack';
import type {Reservation, ReservationStatus} from '../../client/features/reservations/model';
import {hasCompletedPayment} from '../../client/features/reservations/model';

async function resolveCustomerCuid(storeId: string, legacyId: number): Promise<string | null> {
    const customer = await prisma.customer.findUnique({
        where: {storeId_legacyId: {storeId, legacyId}},
        select: {id: true},
    });
    return customer?.id ?? null;
}

async function resolveAssigneeCuid(storeId: string, legacyId: number | undefined): Promise<string | null> {
    if (!legacyId) return null;
    const assignee = await prisma.assignee.findUnique({
        where: {storeId_legacyId: {storeId, legacyId}},
        select: {id: true},
    });
    return assignee?.id ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const [dbReservations, dbHistories] = await Promise.all([
            prisma.reservation.findMany({
                where: {storeId: session.storeId},
                select: reservationSelect,
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

        const assigneeId = await resolveAssigneeCuid(session.storeId, reservation.assigneeId);

        const paymentEntries = (reservation.paymentEntries ?? []).map((e) => ({
            method: frontendPaymentMethodToDb(e.method),
            amount: e.amount,
        }));

        const created = await prisma.reservation.create({
            data: {
                storeId: session.storeId,
                legacyId: reservation.id,
                customerId,
                assigneeId,
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
            select: reservationSelect,
        });

        await notifySlackForStore(session.storeId,
            `🗓️ *새 예약*\n• 날짜: ${reservation.date}`
            + `\n• 시간: ${reservation.startTime}~${reservation.endTime}`
            + `\n• 시술: ${reservation.service ?? '-'}`
            + await customerNoteLine(customerId)
        );

        return res.status(201).json({reservation: dbReservationToFrontend(created)});
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'staff', res)) return;

        // 일괄 분기: 서비스 카탈로그 수정으로 다수 예약의 시술명·가격·종료시각만 바뀌는 경우.
        // 한 트랜잭션으로 N건 update + 이력 기록. Slack 미발송(카탈로그 변경은 매장 알림 대상 아님),
        // 클라가 N개 개별 PUT을 동시 발사하던 것을 단일 요청으로 대체(풀 고갈·알림 도배·무음 유실 제거).
        const batch = (req.body as {updates?: Array<{prev: Reservation; updated: Reservation}>}).updates;
        if (Array.isArray(batch)) {
            if (batch.length === 0) return res.status(200).json({count: 0});

            const dbRows = await prisma.reservation.findMany({
                where: {storeId: session.storeId, legacyId: {in: batch.map(({prev}) => prev.id)}},
                select: {id: true, legacyId: true},
            });
            const cuidByLegacy = new Map(dbRows.map((r) => [r.legacyId, r.id]));

            const ops = batch.flatMap(({prev, updated}) => {
                const dbId = cuidByLegacy.get(prev.id);
                if (!dbId) return []; // DB에 없는 예약(이미 삭제 등)은 건너뜀

                return [
                    prisma.reservation.update({
                        where: {id: dbId},
                        data: {
                            serviceSummary: updated.service,
                            price: updated.price ?? 0,
                            endTime: updated.endTime,
                        },
                    }),
                    prisma.reservationHistory.create({
                        data: {
                            storeId: session.storeId,
                            reservationId: dbId,
                            beforeJson: prev as object,
                            afterJson: updated as object,
                        },
                    }),
                ];
            });

            await prisma.$transaction(ops);
            return res.status(200).json({count: ops.length / 2});
        }

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

        const assigneeId = await resolveAssigneeCuid(session.storeId, updated.assigneeId);

        const paymentEntries = (updated.paymentEntries ?? []).map((e) => ({
            method: frontendPaymentMethodToDb(e.method),
            amount: e.amount,
        }));

        const [savedReservation] = await prisma.$transaction([
            prisma.reservation.update({
                where: {id: dbReservation.id},
                data: {
                    customerId,
                    assigneeId,
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
                select: reservationSelect,
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

        // 일정·시술·담당자가 실제로 바뀐 경우에만 알림 (결제만 저장한 경우 제외)
        const scheduleChanged = prev.date !== updated.date
            || prev.startTime !== updated.startTime
            || prev.endTime !== updated.endTime
            || prev.service !== updated.service
            || prev.assigneeId !== updated.assigneeId;
        if (scheduleChanged) {
            await notifySlackForStore(session.storeId,
                `✏️ *예약 변경*\n• 날짜: ${updated.date}`
                + `\n• 시간: ${updated.startTime}~${updated.endTime}`
                + `\n• 시술: ${updated.service ?? '-'}`
                + await customerNoteLine(customerId)
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
            select: reservationSelect,
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
                select: reservationSelect,
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
                + await customerNoteLine(dbReservation.customerId)
            );
        } else if (after.status === 'noshow') {
            await notifySlackForStore(session.storeId,
                `🚫 *노쇼*\n• 날짜: ${after.date}`
                + `\n• 시간: ${after.startTime}~${after.endTime}`
                + `\n• 시술: ${after.service ?? '-'}`
                + await customerNoteLine(dbReservation.customerId)
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
            select: reservationSelect,
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
            + await customerNoteLine(dbReservation.customerId)
        );

        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
