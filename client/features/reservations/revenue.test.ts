import {describe, expect, it} from 'vitest';

import {getReservationRevenue, isRevenuePaymentMethod} from './model';

describe('getReservationRevenue', () => {
    it('할인·적립금으로 낸 만큼 매출에서 뺀다', () => {
        expect(getReservationRevenue(20000, [
            {method: '카드', amount: 12000},
            {method: '할인', amount: 5000},
            {method: '적립금', amount: 3000},
        ])).toBe(12000);
    });

    it('결제 내역이 없으면 서비스 금액 그대로', () => {
        expect(getReservationRevenue(20000)).toBe(20000);
        expect(getReservationRevenue(20000, [])).toBe(20000);
    });

    it('0 미만이 되지 않는다', () => {
        expect(getReservationRevenue(5000, [{method: '할인', amount: 8000}])).toBe(0);
    });
});

describe('isRevenuePaymentMethod', () => {
    it('할인·적립금만 매출 제외', () => {
        expect(isRevenuePaymentMethod('카드')).toBe(true);
        expect(isRevenuePaymentMethod('네이버 예약금')).toBe(true);
        expect(isRevenuePaymentMethod('할인')).toBe(false);
        expect(isRevenuePaymentMethod('적립금')).toBe(false);
    });
});
