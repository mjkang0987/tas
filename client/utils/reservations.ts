export type ReservationStatus = 'active' | 'cancelled' | 'noshow';

export interface Reservation {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    customerId: number;
    status?: ReservationStatus;
    price?: number;
    memo?: string;
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
    const m = String(month + 1).padStart(2, '0');
    const d = String(date).padStart(2, '0');
    return `${fullYear}-${m}-${d}`;
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
