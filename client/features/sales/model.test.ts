process.env.TZ = 'Asia/Seoul';

import {describe, expect, it} from 'vitest';

import {addSalesToRevenue, buildStoreSales} from './model';
import type {Customer} from '../customers/model';
import type {CustomerMembership} from '../memberships/model';

const membership = (over: Partial<CustomerMembership>): CustomerMembership => ({
    id: 'm', customerId: 1, productId: null, name: '펌 5회권', totalCount: 5, remainingCount: 5,
    issuedAt: '2026-10-15T23:30:00.000Z', expiresAt: null, status: 'active', salePrice: 300000, salePaymentMethod: '카드', ...over,
});

const customer: Customer = {
    id: 1, name: '김민지', tel: '01012345678', points: 110000,
    pointHistories: [
        {id: 'h1', type: 'recharge', delta: 110000, balance: 110000, description: '충전', createdAt: '2026-10-16T02:00:00.000Z', paidAmount: 100000, paymentMethod: '현금'},
        {id: 'h2', type: 'recharge', delta: 50000, balance: 160000, description: '예전 충전', createdAt: '2026-10-01T02:00:00.000Z'},
        {id: 'h3', type: 'payment_earn', delta: 1000, balance: 161000, description: '적립', createdAt: '2026-10-16T03:00:00.000Z'},
    ],
};

describe('buildStoreSales', () => {
    it('판매 회원권과 받은 금액이 있는 충전만 매출로, 날짜는 한국 날짜', () => {
        const sales = buildStoreSales([customer], [
            membership({}),
            membership({id: 'm2', salePrice: null, salePaymentMethod: null}), // 기존 등록
            membership({id: 'm3', status: 'cancelled'}), // 취소돼도 판매는 남는다
        ]);
        expect(sales.map((s) => [s.kind, s.dateKey, s.amount, s.method])).toEqual([
            ['membership', '2026-10-16', 300000, '카드'],
            ['membership', '2026-10-16', 300000, '카드'],
            ['recharge', '2026-10-16', 100000, '현금'],
        ]);
    });
});

describe('addSalesToRevenue', () => {
    it('기간 안 판매를 일별·결제수단에 더하고, 판매만 있는 날은 0건으로 끼운다', () => {
        const sales = buildStoreSales([customer], [membership({issuedAt: '2026-10-14T02:00:00.000Z'})]);
        const result = addSalesToRevenue(
            [{dateKey: '2026-10-16', total: 20000, count: 1}],
            [{method: '카드', total: 20000}],
            sales, '2026-10-14', '2026-10-16',
            (dateKey) => ({dateKey, total: 0, count: 0}),
        );
        expect(result.days).toEqual([
            {dateKey: '2026-10-14', total: 300000, count: 0},
            {dateKey: '2026-10-16', total: 120000, count: 1},
        ]);
        expect(result.payments).toEqual([{method: '카드', total: 320000}, {method: '현금', total: 100000}]);
        expect(result.salesTotal).toBe(400000);
        expect(result.paidSalesTotal).toBe(400000);
    });

    it('기간 밖 판매는 더하지 않는다', () => {
        const result = addSalesToRevenue([], [], buildStoreSales([customer], []), '2026-10-01', '2026-10-15', (dateKey) => ({dateKey, total: 0, count: 0}));
        expect(result.salesTotal).toBe(0);
    });
});
