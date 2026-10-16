import {describe, expect, it} from 'vitest';

import {couponDisplayStatus, describeCouponDiscount, isDirectIssuable} from './model';
import type {CouponProduct} from './model';

const product = (over: Partial<CouponProduct>): CouponProduct => ({
    id: 'p', name: '첫 방문', discountType: 'amount', discountValue: 5000, maxDiscount: null,
    minOrderAmount: null, validDays: null, code: null, oncePerCustomer: false, status: 'active', ...over,
});

describe('describeCouponDiscount', () => {
    it('정액은 금액 할인', () => {
        expect(describeCouponDiscount(product({}))).toBe('5,000원 할인');
    });

    it('정률은 상한이 있으면 함께', () => {
        expect(describeCouponDiscount(product({discountType: 'rate', discountValue: 10}))).toBe('10% 할인');
        expect(describeCouponDiscount(product({discountType: 'rate', discountValue: 10, maxDiscount: 3000}))).toBe('10% 할인 (최대 3,000원)');
    });
});

describe('isDirectIssuable', () => {
    it('활성 + 코드 없는 상품만 직접 발급 대상', () => {
        expect(isDirectIssuable(product({}))).toBe(true);
        expect(isDirectIssuable(product({code: 'WELCOME'}))).toBe(false);
        expect(isDirectIssuable(product({status: 'archived'}))).toBe(false);
    });
});

describe('couponDisplayStatus', () => {
    const now = new Date('2026-10-16T00:00:00.000Z');
    it('미사용이어도 만료일이 지났으면 만료', () => {
        expect(couponDisplayStatus({status: 'active', expiresAt: '2026-10-15T00:00:00.000Z'}, now)).toBe('expired');
        expect(couponDisplayStatus({status: 'active', expiresAt: '2026-10-17T00:00:00.000Z'}, now)).toBe('active');
        expect(couponDisplayStatus({status: 'active', expiresAt: null}, now)).toBe('active');
    });

    it('사용·취소는 그대로', () => {
        expect(couponDisplayStatus({status: 'cancelled', expiresAt: '2026-10-15T00:00:00.000Z'}, now)).toBe('cancelled');
        expect(couponDisplayStatus({status: 'used', expiresAt: null}, now)).toBe('used');
    });
});
