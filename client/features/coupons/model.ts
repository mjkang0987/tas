// 쿠폰(coupon, 할인) 프론트 타입. 적립금(금액)·회원권(횟수/기간)과 별개의 할인 수단.
// Phase 1: 상품(카탈로그) CRUD. 고객 발급(직접·코드형)·결제 차감은 후속 단계.

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
