export type ReservationStatus = 'active' | 'cancelled' | 'noshow';
export type PaymentMethod = '현금' | '현금+현금영수증' | '카드' | '네이버페이' | '지역화폐' | '지역화폐+현금영수증' | '상품권' | '적립금';

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
    designerId?: number;
    status?: ReservationStatus;
    price?: number;
    memo?: string;
    paymentCompleted?: boolean;
    paymentMethod?: PaymentMethod;
    paymentEntries?: PaymentEntry[];
    pointEarned?: number;
}

export type ReservationMap = Record<string, Reservation[]>;

export interface ReservationHistoryEntry {
    reservationId: number;
    before: Reservation;
    after: Reservation;
    timestamp: string;
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
