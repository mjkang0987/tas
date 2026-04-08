import type {PaymentMethod, Reservation, ReservationMap} from './reservations';
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

export interface RevenueSeriesEntry {
    dateKey: string;
    total: number;
    count: number;
}

export interface RevenueDesignerEntry {
    designerId: number | null;
    total: number;
    count: number;
}

export interface RevenuePaymentEntry {
    method: PaymentMethod;
    total: number;
}

export interface RevenueInsights {
    series: RevenueSeriesEntry[];
    designers: RevenueDesignerEntry[];
    payments: RevenuePaymentEntry[];
    paidTotal: number;
    averagePrice: number;
}

function resolvePrice(service: string, price?: number): number {
    if (price != null) return price;
    return sumPrice(parseServiceString(service));
}

function matchDesigner(designerId: number | null | undefined, targetDesignerId: number | null): boolean {
    if (targetDesignerId == null) return true;
    return designerId === targetDesignerId;
}

function isRevenueTarget(reservation: Reservation, designerId: number | null): boolean {
    return (
        reservation.status !== 'cancelled' &&
        reservation.status !== 'noshow' &&
        matchDesigner(reservation.designerId, designerId)
    );
}

function resolvePaymentEntries(reservation: Reservation): RevenuePaymentEntry[] {
    if (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0) {
        return reservation.paymentEntries
            .filter((entry) => entry.amount > 0)
            .map((entry) => ({method: entry.method, total: entry.amount}));
    }

    if (reservation.paymentCompleted && reservation.paymentMethod) {
        return [{
            method: reservation.paymentMethod,
            total: resolvePrice(reservation.service, reservation.price),
        }];
    }

    return [];
}

export function getDailyRevenue(reservationMap: ReservationMap, dateKey: string, designerId: number | null = null): DailyRevenue {
    const reservations = reservationMap[dateKey] ?? [];
    const active = reservations.filter((r) => isRevenueTarget(r, designerId));

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

export function getRevenueInsights(
    reservationMap: ReservationMap,
    startDateKey: string,
    endDateKey: string,
    designerId: number | null = null
): RevenueInsights {
    const start = new Date(startDateKey + 'T00:00:00');
    const end = new Date(endDateKey + 'T00:00:00');
    const [from, to] = start <= end ? [start, end] : [end, start];
    const series: RevenueSeriesEntry[] = [];
    const designerTotals = new Map<number | null, RevenueDesignerEntry>();
    const paymentTotals = new Map<PaymentMethod, number>();
    let total = 0;
    let count = 0;
    let paidTotal = 0;

    const cursor = new Date(from);

    while (cursor <= to) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const reservations = (reservationMap[dateKey] ?? []).filter((reservation) => isRevenueTarget(reservation, designerId));
        const dayTotal = reservations.reduce((sum, reservation) => sum + resolvePrice(reservation.service, reservation.price), 0);

        series.push({
            dateKey,
            total: dayTotal,
            count: reservations.length,
        });

        for (const reservation of reservations) {
            const resolvedPrice = resolvePrice(reservation.service, reservation.price);
            const entryKey = reservation.designerId ?? null;
            const existingDesigner = designerTotals.get(entryKey);

            if (existingDesigner) {
                existingDesigner.total += resolvedPrice;
                existingDesigner.count += 1;
            } else {
                designerTotals.set(entryKey, {
                    designerId: entryKey,
                    total: resolvedPrice,
                    count: 1,
                });
            }

            for (const paymentEntry of resolvePaymentEntries(reservation)) {
                paymentTotals.set(paymentEntry.method, (paymentTotals.get(paymentEntry.method) ?? 0) + paymentEntry.total);
                paidTotal += paymentEntry.total;
            }
        }

        total += dayTotal;
        count += reservations.length;
        cursor.setDate(cursor.getDate() + 1);
    }

    return {
        series,
        designers: [...designerTotals.values()].sort((a, b) => b.total - a.total),
        payments: [...paymentTotals.entries()]
            .map(([method, methodTotal]) => ({method, total: methodTotal}))
            .sort((a, b) => b.total - a.total),
        paidTotal,
        averagePrice: count > 0 ? Math.round(total / count) : 0,
    };
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
