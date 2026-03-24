export interface Reservation {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    service: string;
    name: string;
    tel: string;
}

export type ReservationMap = Record<string, Reservation[]>;

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
