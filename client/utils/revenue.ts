import type {ReservationMap} from './reservations';
import {parseServiceString, sumPrice} from './services';

interface RevenueItem {
    reservationId: number;
    service: string;
    price: number;
    startTime: string;
}

export interface DailyRevenue {
    items: RevenueItem[];
    total: number;
    count: number;
}

export interface MonthlyDayEntry {
    dateKey: string;
    total: number;
    count: number;
}

export interface MonthlyRevenue {
    days: MonthlyDayEntry[];
    total: number;
    count: number;
}

export interface RangeRevenue {
    days: MonthlyDayEntry[];
    total: number;
    count: number;
}

function resolvePrice(service: string, price?: number): number {
    if (price != null) return price;
    return sumPrice(parseServiceString(service));
}

function matchDesigner(designerId: number | null | undefined, targetDesignerId: number | null): boolean {
    if (targetDesignerId == null) return true;
    return designerId === targetDesignerId;
}

export function getDailyRevenue(reservationMap: ReservationMap, dateKey: string, designerId: number | null = null): DailyRevenue {
    const reservations = reservationMap[dateKey] ?? [];
    const active = reservations.filter((r) =>
        r.status !== 'cancelled' &&
        r.status !== 'noshow' &&
        matchDesigner(r.designerId, designerId)
    );

    const items: RevenueItem[] = active.map((r) => ({
        reservationId: r.id,
        service: r.service,
        price: resolvePrice(r.service, r.price),
        startTime: r.startTime,
    }));

    items.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const total = items.reduce((sum, item) => sum + item.price, 0);

    return {items, total, count: items.length};
}

export function getMonthlyRevenue(
    reservationMap: ReservationMap,
    year: number,
    month: number,
    designerId: number | null = null
): MonthlyRevenue {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: MonthlyDayEntry[] = [];
    let total = 0;
    let count = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${prefix}-${String(d).padStart(2, '0')}`;
        const daily = getDailyRevenue(reservationMap, dateKey, designerId);

        if (daily.count > 0) {
            days.push({dateKey, total: daily.total, count: daily.count});
        }

        total += daily.total;
        count += daily.count;
    }

    return {days, total, count};
}

export function getRangeRevenue(
    reservationMap: ReservationMap,
    startDateKey: string,
    endDateKey: string,
    designerId: number | null = null
): RangeRevenue {
    const start = new Date(startDateKey + 'T00:00:00');
    const end = new Date(endDateKey + 'T00:00:00');
    const [from, to] = start <= end ? [start, end] : [end, start];

    const days: MonthlyDayEntry[] = [];
    let total = 0;
    let count = 0;

    const cursor = new Date(from);

    while (cursor <= to) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const daily = getDailyRevenue(reservationMap, dateKey, designerId);

        if (daily.count > 0) {
            days.push({dateKey, total: daily.total, count: daily.count});
        }

        total += daily.total;
        count += daily.count;
        cursor.setDate(cursor.getDate() + 1);
    }

    return {days, total, count};
}
