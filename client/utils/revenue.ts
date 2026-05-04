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
    newCustomerCount: number;
    returningCustomerCount: number;
}

export interface CustomerNoshowRateEntry {
    customerId: number;
    total: number;
    noshow: number;
    rate: number;
}

export interface DesignerCancellationRateEntry {
    designerId: number | null;
    total: number;
    cancelled: number;
    rate: number;
}

export interface OperationInsights {
    customerNoshowRates: CustomerNoshowRateEntry[];
    designerCancellationRates: DesignerCancellationRateEntry[];
    totalReservations: number;
    totalNoshowCount: number;
    totalCancelledCount: number;
    totalNoshowRate: number;
    totalCancelledRate: number;
}

export type RevenueFilterMode = 'completed' | 'booked';

function resolvePrice(service: string, price?: number): number {
    if (price != null) return price;
    return sumPrice(parseServiceString(service));
}

function matchDesigner(designerId: number | null | undefined, targetDesignerId: number | null): boolean {
    if (targetDesignerId == null) return true;
    return designerId === targetDesignerId;
}

export function isCompletedReservationTarget(reservation: Reservation, designerId: number | null): boolean {
    if (!matchDesigner(reservation.designerId, designerId)) return false;
    return reservation.status === 'completed';
}

export function isBookedReservationTarget(reservation: Reservation, designerId: number | null): boolean {
    return (
        reservation.status !== 'cancelled' &&
        reservation.status !== 'noshow' &&
        matchDesigner(reservation.designerId, designerId)
    );
}

export function isRevenueReservationTarget(
    reservation: Reservation,
    designerId: number | null,
    filterMode: RevenueFilterMode
): boolean {
    return filterMode === 'completed'
        ? isCompletedReservationTarget(reservation, designerId)
        : isBookedReservationTarget(reservation, designerId);
}

export function isPaidReservationTarget(reservation: Reservation, designerId: number | null): boolean {
    if (!matchDesigner(reservation.designerId, designerId)) return false;
    if (reservation.status === 'cancelled' || reservation.status === 'noshow') return false;

    if (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0) {
        return reservation.paymentEntries.some((entry) => entry.amount > 0);
    }

    return reservation.paymentCompleted === true;
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

export function getDailyRevenue(
    reservationMap: ReservationMap,
    dateKey: string,
    designerId: number | null = null,
    filterMode: RevenueFilterMode = 'completed'
): DailyRevenue {
    const reservations = reservationMap[dateKey] ?? [];
    const active = reservations.filter((r) => isRevenueReservationTarget(r, designerId, filterMode));

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
    designerId: number | null = null,
    filterMode: RevenueFilterMode = 'completed'
): MonthlyRevenue {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: MonthlyDayEntry[] = [];
    let total = 0;
    let count = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${prefix}-${String(d).padStart(2, '0')}`;
        const daily = getDailyRevenue(reservationMap, dateKey, designerId, filterMode);

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
    designerId: number | null = null,
    filterMode: RevenueFilterMode = 'completed'
): RevenueInsights {
    const start = new Date(startDateKey + 'T00:00:00');
    const end = new Date(endDateKey + 'T00:00:00');
    const [from, to] = start <= end ? [start, end] : [end, start];
    const series: RevenueSeriesEntry[] = [];
    const designerTotals = new Map<number | null, RevenueDesignerEntry>();
    const paymentTotals = new Map<PaymentMethod, number>();
    const firstVisitByCustomer = new Map<number, string>();
    const customerIdsInRange = new Set<number>();
    let total = 0;
    let count = 0;
    let paidTotal = 0;

    for (const [dateKey, reservations] of Object.entries(reservationMap)) {
        for (const reservation of reservations) {
            if (!isRevenueReservationTarget(reservation, designerId, filterMode)) continue;

            const existingDate = firstVisitByCustomer.get(reservation.customerId);
            if (!existingDate || dateKey < existingDate) {
                firstVisitByCustomer.set(reservation.customerId, dateKey);
            }
        }
    }

    const cursor = new Date(from);

    while (cursor <= to) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const reservations = (reservationMap[dateKey] ?? []).filter((reservation) => isRevenueReservationTarget(reservation, designerId, filterMode));
        const dayTotal = reservations.reduce((sum, reservation) => sum + resolvePrice(reservation.service, reservation.price), 0);

        series.push({
            dateKey,
            total: dayTotal,
            count: reservations.length,
        });

        for (const reservation of reservations) {
            const resolvedPrice = resolvePrice(reservation.service, reservation.price);
            const entryKey = reservation.designerId ?? null;
            customerIdsInRange.add(reservation.customerId);
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

    let newCustomerCount = 0;
    let returningCustomerCount = 0;

    for (const customerId of customerIdsInRange) {
        const firstVisitDate = firstVisitByCustomer.get(customerId);
        if (firstVisitDate && firstVisitDate >= startDateKey && firstVisitDate <= endDateKey) {
            newCustomerCount += 1;
        } else {
            returningCustomerCount += 1;
        }
    }

    return {
        series,
        designers: [...designerTotals.values()].sort((a, b) => b.total - a.total),
        payments: [...paymentTotals.entries()]
            .map(([method, methodTotal]) => ({method, total: methodTotal}))
            .sort((a, b) => b.total - a.total),
        paidTotal,
        averagePrice: count > 0 ? Math.round(total / count) : 0,
        newCustomerCount,
        returningCustomerCount,
    };
}

export function getRangeRevenue(
    reservationMap: ReservationMap,
    startDateKey: string,
    endDateKey: string,
    designerId: number | null = null,
    filterMode: RevenueFilterMode = 'completed'
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
        const daily = getDailyRevenue(reservationMap, dateKey, designerId, filterMode);

        if (daily.count > 0) {
            days.push({dateKey, total: daily.total, count: daily.count});
        }

        total += daily.total;
        count += daily.count;
        cursor.setDate(cursor.getDate() + 1);
    }

    return {days, total, count};
}

export function getOperationInsights(
    reservationMap: ReservationMap,
    startDateKey: string,
    endDateKey: string,
    designerId: number | null = null
): OperationInsights {
    const start = new Date(startDateKey + 'T00:00:00');
    const end = new Date(endDateKey + 'T00:00:00');
    const [from, to] = start <= end ? [start, end] : [end, start];
    const customerStats = new Map<number, {total: number; noshow: number}>();
    const designerStats = new Map<number | null, {total: number; cancelled: number}>();
    let totalReservations = 0;
    let totalNoshowCount = 0;
    let totalCancelledCount = 0;

    const cursor = new Date(from);

    while (cursor <= to) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const reservations = reservationMap[dateKey] ?? [];

        for (const reservation of reservations) {
            if (!matchDesigner(reservation.designerId, designerId)) continue;

            totalReservations += 1;

            const customerEntry = customerStats.get(reservation.customerId) ?? {total: 0, noshow: 0};
            customerEntry.total += 1;
            if (reservation.status === 'noshow') {
                customerEntry.noshow += 1;
                totalNoshowCount += 1;
            }
            customerStats.set(reservation.customerId, customerEntry);

            const designerEntryKey = reservation.designerId ?? null;
            const designerEntry = designerStats.get(designerEntryKey) ?? {total: 0, cancelled: 0};
            designerEntry.total += 1;
            if (reservation.status === 'cancelled') {
                designerEntry.cancelled += 1;
                totalCancelledCount += 1;
            }
            designerStats.set(designerEntryKey, designerEntry);
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return {
        customerNoshowRates: [...customerStats.entries()]
            .map(([customerId, stats]) => ({
                customerId,
                total: stats.total,
                noshow: stats.noshow,
                rate: stats.total > 0 ? Math.round((stats.noshow / stats.total) * 100) : 0,
            }))
            .sort((a, b) => b.rate - a.rate || b.noshow - a.noshow || b.total - a.total),
        designerCancellationRates: [...designerStats.entries()]
            .map(([designerIdValue, stats]) => ({
                designerId: designerIdValue,
                total: stats.total,
                cancelled: stats.cancelled,
                rate: stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0,
            }))
            .sort((a, b) => b.rate - a.rate || b.cancelled - a.cancelled || b.total - a.total),
        totalReservations,
        totalNoshowCount,
        totalCancelledCount,
        totalNoshowRate: totalReservations > 0 ? Math.round((totalNoshowCount / totalReservations) * 100) : 0,
        totalCancelledRate: totalReservations > 0 ? Math.round((totalCancelledCount / totalReservations) * 100) : 0,
    };
}
