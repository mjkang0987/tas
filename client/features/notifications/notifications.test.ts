import {describe, expect, it} from 'vitest';

import type {Reservation} from '../reservations/model';
import {bellIndicator, untilLabel, upcomingReservations} from './upcoming';
import {dDayLabel, daysUntil} from './expiring';

const r = (id: number, startTime: string, status?: Reservation['status']): Reservation => ({
    id, date: '2026-10-22', startTime, endTime: '23:00', service: '커트', customerId: 1, status,
});

describe('upcomingReservations', () => {
    const now = new Date(2026, 9, 22, 13, 40);
    it('1시간 안(이른 순)과 그 뒤 다음 예약 하나 — 진행 중 예약만', () => {
        const map = {
            '2026-10-22': [r(1, '14:30'), r(2, '14:00'), r(3, '13:30'), r(4, '14:10', 'cancelled'), r(5, '16:00'), r(6, '14:50'), r(7, '14:20', 'requested')],
            '2026-10-23': [r(8, '10:00')],
        };
        const {soon, next} = upcomingReservations(map, now);
        expect(soon.map((x) => [x.reservation.id, x.minutesUntil])).toEqual([[2, 20], [1, 50]]);
        expect(next?.reservation.id).toBe(6);
        expect(next?.minutesUntil).toBe(70);
    });

    it('정각 시작은 "지금", 오늘 남은 예약이 없으면 둘 다 비어 있다', () => {
        const {soon} = upcomingReservations({'2026-10-22': [r(1, '13:40')]}, now);
        expect(soon[0].minutesUntil).toBe(0);
        expect(upcomingReservations({'2026-10-22': [r(1, '09:00')]}, now)).toEqual({soon: [], next: null});
        expect([0, 20, 60].map(untilLabel)).toEqual(['지금', '20분 후', '1시간 후']);
    });
});

describe('bellIndicator', () => {
    it('처리할 게 있으면 숫자, 곧 시작만 있으면 점, 없으면 둘 다 없음', () => {
        expect(bellIndicator({todo: 2, soon: 3})).toEqual({count: 2, dot: false});
        expect(bellIndicator({todo: 0, soon: 1})).toEqual({count: 0, dot: true});
        expect(bellIndicator({todo: 0, soon: 0})).toEqual({count: 0, dot: false});
    });
});

describe('daysUntil', () => {
    it('로컬 날짜 기준 남은 날, 오늘이면 "오늘 만료"', () => {
        const now = new Date(2026, 9, 22, 23, 50);
        expect(daysUntil(new Date(2026, 9, 25, 0, 10).toISOString(), now)).toBe(3);
        expect(daysUntil(new Date(2026, 9, 22, 23, 59).toISOString(), now)).toBe(0);
        expect([0, 3].map(dDayLabel)).toEqual(['오늘 만료', 'D-3']);
    });
});
