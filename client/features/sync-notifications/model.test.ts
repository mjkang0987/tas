import {describe, expect, it} from 'vitest';

import type {SyncNotification} from '../../hooks/useNaverBookingSync';
import {mergeServerSyncNotifications, type ServerSyncNotification} from './model';

const server = (id: string, type: string, bookingId: string, createdAt: string, read = false): ServerSyncNotification => ({
    id, type, bookingId, reservationId: 7, customerName: '김민지', assigneeName: '원장',
    appointmentDate: '2026-10-22', appointmentTime: '14:00', createdAt, read,
});

const local = (id: string, iso: string, extra: Partial<SyncNotification> = {}): SyncNotification => ({
    id, bookingId: 'b0', customerName: '이서연', assigneeName: '원장', appointmentDate: '2026-10-21',
    appointmentTime: '10:00', reservationId: 3, timestamp: new Date(iso), read: false, ...extra,
});

describe('mergeServerSyncNotifications', () => {
    it('서버 것만 새 목록으로 바꾸고 기기 것(중복예약·이전 기록)은 남긴다, 최신순', () => {
        const current = [
            local('old-server', '2026-10-20T00:00:00Z', {source: 'server'}),
            local('conflict-1', '2026-10-21T00:00:00Z', {type: 'conflict', conflictKey: '1-2'}),
            local('legacy-sync', '2026-10-19T00:00:00Z'),
        ];
        const merged = mergeServerSyncNotifications(current, [server('s1', 'sync', 'b1', '2026-10-22T01:00:00Z')]);
        expect(merged.map((n) => n.id)).toEqual(['s1', 'conflict-1', 'legacy-sync']);
        expect(merged[0]).toMatchObject({source: 'server', type: undefined, reservationId: 7, read: false});
    });

    it('같은 예약의 취소가 있으면 확정 알림은 읽음으로 본다', () => {
        const merged = mergeServerSyncNotifications([], [
            server('c1', 'cancel', 'b1', '2026-10-22T02:00:00Z'),
            server('s1', 'sync', 'b1', '2026-10-22T01:00:00Z'),
            server('s2', 'sync', 'b2', '2026-10-22T00:30:00Z'),
        ]);
        expect(merged.map((n) => [n.id, n.type ?? 'sync', n.read])).toEqual([
            ['c1', 'cancel', false],
            ['s1', 'sync', true],
            ['s2', 'sync', false],
        ]);
    });

    it('서버가 읽음이라 하면 읽음, 예약 번호가 없으면 0', () => {
        const [n] = mergeServerSyncNotifications([], [{...server('s1', 'sync', 'b1', '2026-10-22T01:00:00Z', true), reservationId: null}]);
        expect(n.read).toBe(true);
        expect(n.reservationId).toBe(0);
    });
});
