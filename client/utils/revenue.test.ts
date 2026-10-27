import {describe, expect, it} from 'vitest';

import type {Reservation, ReservationMap} from './reservations';
import {getDailyRevenue, getMonthlyRevenue} from './revenue';

const reservation = (id: number, assigneeId: number | null, price: number): Reservation =>
    ({id, assigneeId, price, service: '컷', date: '2026-10-01', startTime: '10:00', endTime: '11:00', status: 'active', customerId: id}) as Reservation;

const map: ReservationMap = {
    '2026-10-01': [reservation(1, null, 10000), reservation(2, 7, 20000), reservation(3, 0, 5000)],
};

describe('담당자 필터', () => {
    it('전체(null)는 모두 합친다', () => {
        expect(getDailyRevenue(map, '2026-10-01', null, 'booked').total).toBe(35000);
    });

    it('담당자 id 는 그 담당자만', () => {
        expect(getDailyRevenue(map, '2026-10-01', 7, 'booked').total).toBe(20000);
    });

    it('미지정(0)은 담당자 없는 예약(null·0)만 — 카드와 같은 기준', () => {
        expect(getDailyRevenue(map, '2026-10-01', 0, 'booked')).toMatchObject({total: 15000, count: 2});
        expect(getMonthlyRevenue(map, 2026, 9, 0, 'booked').total).toBe(15000);
    });
});
