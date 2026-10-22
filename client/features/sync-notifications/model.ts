import type {SyncNotification} from '../../hooks/useNaverBookingSync';

/** GET /api/sync-notifications 한 줄 — 서버가 매장 단위로 저장한 네이버 확정·취소 알림. */
export interface ServerSyncNotification {
    id: string;
    type: string;
    bookingId: string;
    reservationId: number | null;
    customerName: string;
    assigneeName: string;
    appointmentDate: string;
    appointmentTime: string;
    createdAt: string;
    read: boolean;
}

/** 서버 알림 → 화면 알림. 서버 것이라는 표시(`source`)를 달아 읽음을 서버에도 보낸다. */
export function fromServerSyncNotification(n: ServerSyncNotification): SyncNotification {
    return {
        id: n.id,
        bookingId: n.bookingId,
        customerName: n.customerName,
        assigneeName: n.assigneeName,
        appointmentDate: n.appointmentDate,
        appointmentTime: n.appointmentTime,
        reservationId: n.reservationId ?? 0,
        timestamp: new Date(n.createdAt),
        read: n.read,
        type: n.type === 'cancel' ? 'cancel' : undefined, // 확정은 예전 화면처럼 type 없음
        source: 'server',
    };
}

/**
 * 서버 목록으로 바꿔 끼운다 — 기기에서 만든 것(중복예약 알림, 서버 저장 전에 이 기기에 쌓인 확정·취소)은 그대로 두고,
 * 서버 것만 새 목록으로 교체한다. 같은 예약의 취소가 들어와 있으면 그 확정 알림은 읽음으로 본다(예전 화면 규칙).
 * 최신순.
 */
export function mergeServerSyncNotifications(current: SyncNotification[], server: ServerSyncNotification[]): SyncNotification[] {
    const cancelledBookings = new Set(server.filter((n) => n.type === 'cancel').map((n) => n.bookingId));
    const fromServer = server.map(fromServerSyncNotification).map((n) =>
        n.type === undefined && cancelledBookings.has(n.bookingId) ? {...n, read: true} : n
    );
    const local = current.filter((n) => n.source !== 'server');
    return [...fromServer, ...local].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
