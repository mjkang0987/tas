import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {SYNC_NOTIFICATION_RETENTION_DAYS} from '../db/sync-notifications';
import {notifySlackOpsError} from '../notify/slack';

/**
 * 네이버 예약 동기화 알림(매장 단위) — GET: 최근 30일 + 내 읽음 여부, POST: 읽음 처리(`{ids}` 또는 `{all: true}`).
 * 네이버 연동이 오너 전용이라(화면 `canUseSync`) 오너만.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);
    if (!requireRole(session, 'owner', res)) return;
    const {storeId, userId} = session;

    try {
        if (req.method === 'GET') {
            const since = new Date(Date.now() - SYNC_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
            const rows = await prisma.syncNotification.findMany({
                where: {storeId, createdAt: {gte: since}},
                orderBy: {createdAt: 'desc'},
                take: 100,
                select: {
                    id: true, type: true, bookingId: true, reservationLegacyId: true, customerName: true, assigneeName: true,
                    appointmentDate: true, appointmentTime: true, createdAt: true,
                    reads: {where: {userId}, select: {userId: true}},
                },
            });
            return res.status(200).json({
                notifications: rows.map((row) => ({
                    id: row.id,
                    type: row.type,
                    bookingId: row.bookingId,
                    reservationId: row.reservationLegacyId,
                    customerName: row.customerName,
                    assigneeName: row.assigneeName,
                    appointmentDate: row.appointmentDate,
                    appointmentTime: row.appointmentTime,
                    createdAt: row.createdAt.toISOString(),
                    read: row.reads.length > 0,
                })),
            });
        }

        if (req.method === 'POST') {
            const body = (req.body ?? {}) as {ids?: unknown; all?: unknown};
            const ids = body.all === true
                ? (await prisma.syncNotification.findMany({where: {storeId}, select: {id: true}})).map((row) => row.id)
                : Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string').slice(0, 200) : null;
            if (!ids) return res.status(400).json({error: 'ids or all required'});
            // 다른 매장 알림 id 를 끼워 넣어도 내 매장 것만 읽음 처리한다
            const owned = await prisma.syncNotification.findMany({where: {storeId, id: {in: ids}}, select: {id: true}});
            if (owned.length > 0) {
                await prisma.syncNotificationRead.createMany({
                    data: owned.map((row) => ({notificationId: row.id, userId})),
                    skipDuplicates: true,
                });
            }
            return res.status(200).json({ok: true, read: owned.length});
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error('[sync-notifications]', error);
        await notifySlackOpsError(`${req.method} /api/sync-notifications`, error);
        return res.status(500).json({error: 'Failed to load notifications'});
    }
}
