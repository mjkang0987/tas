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

/** ISO 순간(이력 시각 등)을 로컬(한국 시간) `YYYY-MM-DD HH:mm`로. `iso.slice(0, 16)`은 UTC라 9시간 이르게 보인다.
 *  못 읽는 값은 받은 그대로 낸다('NaN-NaN-NaN' 대신). 실행 환경 시간대를 따르므로 서버 렌더링(Cloud Run=UTC)에선 쓰지 않는다 — 지금은 모두 화면에서만 그린다. */
export function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${toLocalDateKey(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

// 글자색은 배경 위 대비 4.5:1 이상(WCAG AA, 11px 작은 글자) — 2026-10-19 웹·iOS·안드로이드 함께 진하게 바꿈.
// 예전 값(대비): booked #4285F4(3.1) · cancelled #999(2.5) · completed #34A853(2.7) · noshow #EA4335(3.3) · requested #a88417(3.3).
// badgeContrast.test.ts 가 다시 옅어지지 않게 지킨다.
export const RESERVATION_STATUS_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    booked: {bg: '#E8F0FE', color: '#1967D2'},
    cancelled: {bg: '#F1F1F1', color: '#666666'},
    completed: {bg: '#E6F4EA', color: '#137333'},
    noshow: {bg: '#FCE8E6', color: '#C5221F'},
    paid: {bg: 'rgba(101, 38, 217, 0.08)', color: '#6526d9'},
    unpaid: {bg: '#FEF3C7', color: '#92400E'},
    requested: {bg: '#FEF7E0', color: '#806600'},
};

/** 어두운 화면 배지 — iOS `BadgeTone.dark*`·안드로이드와 같은 값. 글자 7:1 이상, 바탕이 카드(#1C1C1E)와 구분된다. */
export const RESERVATION_STATUS_BADGE_STYLES_DARK: Record<string, { bg: string; color: string }> = {
    booked: {bg: '#1F3A63', color: '#C2D7FB'},
    cancelled: {bg: '#3A3A3C', color: '#D1D1D6'},
    completed: {bg: '#1D4A2C', color: '#BDE5C8'},
    noshow: {bg: '#5C221E', color: '#FFB4AB'},
    paid: {bg: '#3B2A6B', color: '#D0BCFF'},
    unpaid: {bg: '#574209', color: '#FDE68A'},
    requested: {bg: '#4D3F0B', color: '#F6D860'},
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
