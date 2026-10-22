/** 쿠폰·회원권 만료 임박으로 알리는 기간(일). shortcut: 매장마다 고르게 하는 건 다음 단계 — 지금은 7일 고정. */
export const EXPIRY_ALERT_DAYS = 7;

/** GET /api/expiring-benefits 한 줄. */
export interface ExpiringBenefit {
    kind: 'coupon' | 'membership';
    /** CustomerCoupon.id / CustomerMembership.id — 확인 체크 열쇠 */
    id: string;
    name: string;
    /** ISO 순간값 — 화면에선 로컬 날짜로 바꿔 쓴다(횡단 규칙 1) */
    expiresAt: string;
    /** 회원권 남은 횟수(무제한·쿠폰이면 null) */
    remainingCount: number | null;
    customerId: number | null;
    customerName: string;
    customerTel: string;
    checked: boolean;
}

/** 오늘(로컬 날짜) 기준 남은 날 — 오늘 만료면 0. */
export function daysUntil(expiresAtIso: string, now: Date): number {
    const end = new Date(expiresAtIso);
    const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((endDay - today) / 86_400_000);
}

/** "D-3" · 오늘이면 "오늘 만료". */
export function dDayLabel(days: number): string {
    return days <= 0 ? '오늘 만료' : `D-${days}`;
}
