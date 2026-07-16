export type ReservationStatus = 'active' | 'completed' | 'cancelled' | 'noshow' | 'requested';
export type ReservationChannel = '네이버예약' | '현장방문' | '전화예약' | '온라인예약';
export type PaymentMethod = '현금' | '현금+현금영수증' | '카드' | '네이버페이' | '지역화폐' | '지역화폐+현금영수증' | '상품권' | '적립금' | '할인' | '네이버 예약금';

export interface PaymentEntry {
    method: PaymentMethod;
    amount: number;
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
}

export type ReservationMap = Record<string, Reservation[]>;

export interface ReservationHistoryEntry {
    reservationId: number;
    before: Reservation;
    after: Reservation;
    timestamp: string;
}

export function hasCompletedPayment(reservation: Reservation): boolean {
    return (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0)
        || reservation.paymentCompleted === true;
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
