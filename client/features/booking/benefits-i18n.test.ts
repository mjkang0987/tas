process.env.TZ = 'Asia/Seoul';

import {describe, expect, it} from 'vitest';

import {benefitCouponL, benefitMembershipL} from './i18n';

const membership = {id: 'm', name: '펌 5회권', totalCount: 5, remainingCount: 3, expiresAt: '2026-12-30T23:30:00.000Z'};
const coupon = {
    id: 'c', name: '첫 방문', discountType: 'rate' as const, discountValue: 10, maxDiscount: 3000, minOrderAmount: null, expiresAt: null,
};

describe('benefitMembershipL', () => {
    it('언어별 남은 횟수·만료일(한국 날짜)', () => {
        expect(benefitMembershipL(membership, 'ko')).toBe('남은 3/5회 · ~2026-12-31');
        expect(benefitMembershipL(membership, 'en')).toBe('3/5 left · until 2026-12-31');
        expect(benefitMembershipL(membership, 'ja')).toBe('残り3/5回 · 2026-12-31まで');
    });

    it('무제한', () => {
        expect(benefitMembershipL({...membership, totalCount: null, remainingCount: null, expiresAt: null}, 'zh'))
            .toBe('不限次数 · 长期有效');
    });
});

describe('benefitCouponL', () => {
    it('정률은 최대 할인액과 함께', () => {
        expect(benefitCouponL(coupon, 'ko')).toBe('10% 할인 (최대 3,000원) · 무기한');
        expect(benefitCouponL(coupon, 'en')).toBe('10% off (up to ₩3,000) · No expiry');
    });

    it('정액', () => {
        expect(benefitCouponL({...coupon, discountType: 'amount', discountValue: 5000, maxDiscount: null}, 'ja'))
            .toBe('₩5,000引き · 無期限');
    });
});
