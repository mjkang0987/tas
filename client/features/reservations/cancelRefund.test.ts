import {describe, expect, it} from 'vitest';

import {pointRefundOnCancel} from './model';

describe('pointRefundOnCancel', () => {
    it('결제에 쓴 적립금은 돌려주고 그 결제로 쌓인 적립금은 회수한다', () => {
        expect(pointRefundOnCancel({status: 'completed', paymentCompleted: true, paymentEntries: [{method: '카드', amount: 20000}, {method: '적립금', amount: 3000}], pointEarned: 1000})).toBe(2000);
        expect(pointRefundOnCancel({status: 'completed', paymentCompleted: true, paymentEntries: [{method: '카드', amount: 20000}], pointEarned: 1000})).toBe(-1000);
    });

    it('결제 전 예약·이미 취소된 예약은 바꿀 것이 없다', () => {
        expect(pointRefundOnCancel({status: 'active', paymentEntries: []})).toBe(0);
        expect(pointRefundOnCancel({status: 'cancelled', paymentCompleted: true, paymentEntries: [{method: '적립금', amount: 3000}]})).toBe(0);
    });
});
