// 쿠폰(coupon, 할인) 프론트 타입. 적립금(금액)·회원권(횟수/기간)과 별개의 할인 수단.
// 상품 CRUD + 고객 직접 발급·취소. 코드형 발급·사용 처리·결제 차감은 후속 단계.

import {formatPrice} from '../services/model';

export type CouponDiscountType = 'amount' | 'rate';

export interface CouponProduct {
    id: string; // 서버 cuid
    name: string;
    discountType: CouponDiscountType;
    discountValue: number; // 원(amount) 또는 %(rate)
    maxDiscount: number | null; // 정률 상한 (null = 무제한)
    minOrderAmount: number | null; // 최소 결제금액 (null = 제한없음)
    validDays: number | null; // 발급일+유효일수 (null = 무기한)
    code: string | null; // 코드형이면 코드 (null = 직접발급 전용)
    oncePerCustomer: boolean; // true = 고객당 1장(미사용 보유 시 재발급 불가)
    status: 'active' | 'archived';
}

export interface CustomerCoupon {
    id: string;
    customerId: number; // 고객 legacyId
    productId: string | null;
    name: string; // 발급 시점 상품명 스냅샷
    discountType: CouponDiscountType;
    discountValue: number;
    maxDiscount: number | null;
    minOrderAmount: number | null;
    issuedAt: string;
    expiresAt: string | null;
    usedAt: string | null;
    status: 'active' | 'used' | 'expired' | 'cancelled';
}

export interface CouponsPayload {
    products: CouponProduct[];
    coupons: CustomerCoupon[];
}

export const COUPON_STATUS_LABEL: Record<CustomerCoupon['status'], string> = {
    active: '미사용',
    used: '사용',
    expired: '만료',
    cancelled: '취소',
};

/** 할인 내용 한 줄 — "5,000원 할인" / "10% 할인 (최대 3,000원)" */
export function describeCouponDiscount(c: Pick<CouponProduct, 'discountType' | 'discountValue' | 'maxDiscount'>): string {
    if (c.discountType === 'amount') return `${formatPrice(c.discountValue)} 할인`;
    return `${c.discountValue}% 할인${c.maxDiscount != null ? ` (최대 ${formatPrice(c.maxDiscount)})` : ''}`;
}

/** 고객에게 직접 발급할 수 있는 상품 — 보관되지 않았고 코드형이 아닌 것(코드형은 코드 입력 흐름 전용, API도 거부) */
export function isDirectIssuable(p: CouponProduct): boolean {
    return p.status === 'active' && !p.code;
}

/** 화면에 보일 상태 — 만료를 따로 처리하는 작업이 없어 '미사용'이라도 만료일이 지났으면 만료로 본다 */
export function couponDisplayStatus(c: Pick<CustomerCoupon, 'status' | 'expiresAt'>, now: Date): CustomerCoupon['status'] {
    if (c.status === 'active' && c.expiresAt && new Date(c.expiresAt) <= now) return 'expired';
    return c.status;
}
