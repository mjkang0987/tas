import type {BenefitCoupon, BenefitMembership} from '../customers/benefits';
export type ReservationStatus = 'active' | 'completed' | 'cancelled' | 'noshow' | 'requested';
export type ReservationChannel = '네이버예약' | '현장방문' | '전화예약' | '온라인예약';
export type PaymentMethod = '현금' | '현금+현금영수증' | '카드' | '네이버페이' | '지역화폐' | '지역화폐+현금영수증' | '상품권' | '적립금' | '할인' | '네이버 예약금' | '회원권';

export interface PaymentEntry {
    method: PaymentMethod;
    amount: number;
}

/**
 * 매출(받은 돈)에 넣지 않는 결제수단 — 할인(쿠폰 포함)·적립금·회원권으로 낸 만큼은 이 예약에서 받은 돈이 아니다.
 * (적립금 충전·회원권 판매는 그때 매출로 따로 잡힌다 — `features/sales`)
 * 매출 합계·결제 합계·적립 자동 계산이 모두 이 목록을 기준으로 뺀다.
 */
export const NON_REVENUE_PAYMENT_METHODS: readonly PaymentMethod[] = ['할인', '적립금', '회원권'];

/** 실제로 돈을 받는 결제수단 — 적립금 충전·회원권 판매처럼 '받은 돈'을 고를 때 쓴다(적립금·할인·회원권·네이버 예약금 제외) */
export const RECEIVED_PAYMENT_METHODS: readonly PaymentMethod[] = ['현금', '현금+현금영수증', '카드', '네이버페이', '지역화폐', '지역화폐+현금영수증', '상품권'];

export function isRevenuePaymentMethod(method: PaymentMethod): boolean {
    return !NON_REVENUE_PAYMENT_METHODS.includes(method);
}

/** 예약 하나의 매출 = 서비스 금액 − 할인·적립금으로 낸 금액 (0 미만이 되지 않게) */
export function getReservationRevenue(price: number, entries?: PaymentEntry[]): number {
    const deducted = (entries ?? [])
        .filter((entry) => !isRevenuePaymentMethod(entry.method) && entry.amount > 0)
        .reduce((sum, entry) => sum + entry.amount, 0);
    return Math.max(price - deducted, 0);
}

export interface Reservation {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    customerId: number;
    assigneeId?: number;
    status?: ReservationStatus;
    price?: number;
    memo?: string;
    paymentCompleted?: boolean;
    paymentMethod?: PaymentMethod;
    paymentEntries?: PaymentEntry[];
    pointEarned?: number;
    naverBookingId?: string;
    naverBookingUrl?: string;
    naverDeposit?: number;
    channel?: ReservationChannel;
    /** 이 예약 결제에 쓴 쿠폰(서버 기록). 결제 레이어가 보이고, 바꾸면 되돌린다 */
    usedCoupon?: BenefitCoupon;
    /** 이 예약 결제에 쓴 회원권(서버 기록) */
    usedMembership?: BenefitMembership;
}

export type ReservationMap = Record<string, Reservation[]>;

export interface ReservationHistoryEntry {
    reservationId: number;
    before: Reservation;
    after: Reservation;
    timestamp: string;
}

export function hasCompletedPayment(reservation: Pick<Reservation, 'paymentEntries' | 'paymentCompleted'>): boolean {
    return (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0)
        || reservation.paymentCompleted === true;
}

// 고객 예약 페이지 경유(온라인) 예약인지. 승인/거절/취소 사유 노출·타임라인 취소 유지의 판별자.
export function isOnlineReservation(reservation: Pick<Reservation, 'channel'>): boolean {
    return reservation.channel === '온라인예약';
}

export function groupByDate(list: Reservation[]): ReservationMap {
    const map: ReservationMap = {};

    for (const item of list) {
        if (!map[item.date]) {
            map[item.date] = [];
        }
        map[item.date].push(item);
    }

    return map;
}

export function toDateKey(fullYear: number, month: number, date: number): string {
    const normalized = new Date(fullYear, month, date);
    const m = String(normalized.getMonth() + 1).padStart(2, '0');
    const d = String(normalized.getDate()).padStart(2, '0');
    return `${normalized.getFullYear()}-${m}-${d}`;
}

/** ISO 순간(만료일 등)을 로컬(한국 시간) 날짜 키로. `iso.slice(0, 10)`은 UTC 날짜라 오전 0~9시 값이 하루 이르게 보인다 */
export function toLocalDateKey(iso: string): string {
    const d = new Date(iso);
    return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function findOverlap(
    reservationMap: ReservationMap,
    dateKey: string,
    startTime: string,
    endTime: string,
    excludeId?: number
): Reservation | undefined {
    const others = (reservationMap[dateKey] ?? [])
        .filter((r) => r.status !== 'cancelled' && r.status !== 'noshow' && (excludeId == null || r.id !== excludeId));
    return others.find((r) => startTime < r.endTime && endTime > r.startTime);
}

export function getFirstVisitDateByCustomer(reservationMap: ReservationMap): Map<number, string> {
    const firstVisitByCustomer = new Map<number, string>();

    for (const [dateKey, reservations] of Object.entries(reservationMap)) {
        for (const reservation of reservations) {
            if (reservation.status === 'cancelled' || reservation.status === 'noshow' || reservation.status === 'requested') continue;
            const existingDate = firstVisitByCustomer.get(reservation.customerId);
            if (!existingDate || dateKey < existingDate) {
                firstVisitByCustomer.set(reservation.customerId, dateKey);
            }
        }
    }

    return firstVisitByCustomer;
}

export function isFirstVisitReservation(
    firstVisitByCustomer: Map<number, string>,
    reservation: Reservation
): boolean {
    return firstVisitByCustomer.get(reservation.customerId) === reservation.date;
}

export const RESERVATION_STATUS_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    booked: {bg: '#E8F0FE', color: '#4285F4'},
    cancelled: {bg: '#F1F1F1', color: '#999'},
    completed: {bg: '#E6F4EA', color: '#34A853'},
    noshow: {bg: '#FCE8E6', color: '#EA4335'},
    paid: {bg: 'rgba(101, 38, 217, 0.08)', color: '#6526d9'},
    unpaid: {bg: '#FEF3C7', color: '#92400E'},
    requested: {bg: '#FEF7E0', color: '#a88417'},
};

/**
 * 결제한 예약이 취소·삭제될 때 고객 적립금에 되돌릴 양 — 결제에 쓴 적립금은 돌려주고, 그 결제로 쌓인 적립금은 회수한다.
 * (지시자 2026-10-19 — 쿠폰·회원권·적립금은 예약 취소 시 돌려준다. 쿠폰·회원권은 서버가 돌려준다.)
 * 0 이면 바꿀 것이 없다. 이미 취소된 예약은 0(두 번 돌려주지 않게).
 */
export function pointRefundOnCancel(reservation: Pick<Reservation, 'status' | 'paymentEntries' | 'paymentCompleted' | 'pointEarned'>): number {
    if (reservation.status === 'cancelled') return 0;
    if (!hasCompletedPayment(reservation)) return 0;
    const used = (reservation.paymentEntries ?? [])
        .filter((entry) => entry.method === '적립금')
        .reduce((sum, entry) => sum + entry.amount, 0);
    return used - (reservation.pointEarned ?? 0);
}
