process.env.TZ = 'Asia/Seoul';

import {describe, expect, it} from 'vitest';

import {describeBenefitCoupon, describeBenefitMembership} from './benefits';

describe('describeBenefitMembership', () => {
    it('횟수권은 남은/전체 횟수와 만료일(한국 날짜)', () => {
        expect(describeBenefitMembership({
            id: 'm', name: '펌 5회권', totalCount: 5, remainingCount: 3, expiresAt: '2026-12-30T23:30:00.000Z',
        })).toBe('펌 5회권 · 남은 3/5회 · ~2026-12-31');
    });

    it('무제한·무기한', () => {
        expect(describeBenefitMembership({
            id: 'm', name: '두피케어', totalCount: null, remainingCount: null, expiresAt: null,
        })).toBe('두피케어 · 무제한 · 무기한');
    });
});

describe('describeBenefitCoupon', () => {
    it('이름 · 할인 · 만료', () => {
        expect(describeBenefitCoupon({
            id: 'c', name: '첫 방문', discountType: 'amount', discountValue: 5000, maxDiscount: null, minOrderAmount: null, expiresAt: null,
        })).toBe('첫 방문 · 5,000원 할인 · 무기한');
    });
});
