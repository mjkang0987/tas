import {describe, expect, it} from 'vitest';

import {computeCouponDiscount, couponDisplayStatus, describeCouponDiscount, isDirectIssuable} from './model';
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
    it('보관되지 않은 상품은 발급 대상(예전에 넣은 코드는 무시)', () => {
        expect(isDirectIssuable(product({}))).toBe(true);
        expect(isDirectIssuable(product({code: 'WELCOME'}))).toBe(true);
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

describe('computeCouponDiscount', () => {
    it('정액은 결제 금액을 넘지 않는다', () => {
        expect(computeCouponDiscount(product({discountValue: 5000}), 20000)).toBe(5000);
        expect(computeCouponDiscount(product({discountValue: 5000}), 3000)).toBe(3000);
    });

    it('정률은 원 단위 내림 + 최대 할인액', () => {
        expect(computeCouponDiscount(product({discountType: 'rate', discountValue: 10}), 25550)).toBe(2555);
        expect(computeCouponDiscount(product({discountType: 'rate', discountValue: 10, maxDiscount: 2000}), 25550)).toBe(2000);
    });

    it('최소 결제금액 미달이면 쓸 수 없다', () => {
        expect(computeCouponDiscount(product({minOrderAmount: 30000}), 20000)).toBeNull();
        expect(computeCouponDiscount(product({minOrderAmount: 20000}), 20000)).toBe(5000);
    });
});
