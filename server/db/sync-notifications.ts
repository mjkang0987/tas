import {prisma} from './prisma';

/** 알림을 남겨 두는 기간 — 화면도 최근 30일만 보여 준다. */
export const SYNC_NOTIFICATION_RETENTION_DAYS = 30;

export interface SyncNotificationInput {
    type: 'sync' | 'cancel';
    bookingId: string;
    reservationLegacyId: number | null;
    customerName: string;
    assigneeName: string;
    appointmentDate: string;
    appointmentTime: string;
}

/**
 * 동기화 결과를 매장 알림으로 남긴다. 어느 기기가 동기화했든(또는 서버가 혼자 했든) 같은 매장의 모든 기기가 같은 목록을 본다.
 * **실패해도 동기화는 그대로 둔다** — 예약은 이미 저장됐고 알림만 빠진다(테이블이 아직 없을 때도 여기서 멈춘다).
 */
export async function recordSyncNotifications(storeId: string, items: SyncNotificationInput[]): Promise<void> {
    try {
        if (items.length > 0) {
            await prisma.syncNotification.createMany({data: items.map((item) => ({storeId, ...item}))});
        }
        const cutoff = new Date(Date.now() - SYNC_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        await prisma.syncNotification.deleteMany({where: {storeId, createdAt: {lt: cutoff}}});
    } catch (error) {
        console.error('[naver-sync] 알림 저장 실패', error);
    }
}
