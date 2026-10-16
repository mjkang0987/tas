// 고객이 지금 쓸 수 있는 회원권·쿠폰(예약·고객 화면, 고객 예약 관리 페이지 표시용).
// 서버 `server/db/customer-benefits.ts`가 "쓸 수 있는 것"만 골라 이 모양으로 낸다.

import type {CouponDiscountType} from '../coupons/model';
import {describeCouponDiscount} from '../coupons/model';
import {toLocalDateKey} from '../reservations/model';

export interface BenefitMembership {
    id: string;
    name: string;
    totalCount: number | null; // null = 무제한
    remainingCount: number | null;
    expiresAt: string | null;
}

export interface BenefitCoupon {
    id: string;
    name: string;
    discountType: CouponDiscountType;
    discountValue: number;
    maxDiscount: number | null;
    minOrderAmount: number | null;
    expiresAt: string | null;
}

export interface CustomerBenefits {
    memberships: BenefitMembership[];
    coupons: BenefitCoupon[];
}

const expiryText = (expiresAt: string | null) => (expiresAt ? `~${toLocalDateKey(expiresAt)}` : '무기한');

/** 매장 화면용 한 줄 — "펌 5회권 · 남은 3/5회 · ~2026-12-31" */
export function describeBenefitMembership(m: BenefitMembership): string {
    const count = m.totalCount != null ? `남은 ${m.remainingCount ?? 0}/${m.totalCount}회` : '무제한';
    return `${m.name} · ${count} · ${expiryText(m.expiresAt)}`;
}

/** 매장 화면용 한 줄 — "첫 방문 · 5,000원 할인 · 무기한" */
export function describeBenefitCoupon(c: BenefitCoupon): string {
    return `${c.name} · ${describeCouponDiscount(c)} · ${expiryText(c.expiresAt)}`;
}
