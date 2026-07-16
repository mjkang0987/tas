import type {PaymentMethod, Reservation, ReservationChannel, ReservationMap} from './reservations';
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

export interface RevenueAssigneeEntry {
    assigneeId: number | null;
    total: number;
    count: number;
}

export interface RevenuePaymentEntry {
    method: PaymentMethod;
    total: number;
}

export interface RevenueChannelEntry {
    channel: ReservationChannel;
    count: number;
}

export interface RevenueInsights {
    series: RevenueSeriesEntry[];
    assignees: RevenueAssigneeEntry[];
    payments: RevenuePaymentEntry[];
    channels: RevenueChannelEntry[];
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

export interface AssigneeCancellationRateEntry {
    assigneeId: number | null;
    total: number;
    cancelled: number;
    rate: number;
}

export interface OperationInsights {
    customerNoshowRates: CustomerNoshowRateEntry[];
    assigneeCancellationRates: AssigneeCancellationRateEntry[];
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

function matchAssignee(assigneeId: number | null | undefined, targetAssigneeId: number | null): boolean {
    if (targetAssigneeId == null) return true;
    return assigneeId === targetAssigneeId;
}

export function isCompletedReservationTarget(reservation: Reservation, assigneeId: number | null): boolean {
    if (!matchAssignee(reservation.assigneeId, assigneeId)) return false;
    return reservation.status === 'completed';
}

export function isBookedReservationTarget(reservation: Reservation, assigneeId: number | null): boolean {
    return (
        reservation.status !== 'cancelled' &&
        reservation.status !== 'noshow' &&
        reservation.status !== 'requested' &&
        matchAssignee(reservation.assigneeId, assigneeId)
    );
}

export function isRevenueReservationTarget(
    reservation: Reservation,
    assigneeId: number | null,
    filterMode: RevenueFilterMode
): boolean {
    return filterMode === 'completed'
        ? isCompletedReservationTarget(reservation, assigneeId)
        : isBookedReservationTarget(reservation, assigneeId);
}

export function isPaidReservationTarget(reservation: Reservation, assigneeId: number | null): boolean {
    if (!matchAssignee(reservation.assigneeId, assigneeId)) return false;
    if (reservation.status === 'cancelled' || reservation.status === 'noshow' || reservation.status === 'requested') return false;

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
    assigneeId: number | null = null,
    filterMode: RevenueFilterMode = 'completed'
): DailyRevenue {
    const reservations = reservationMap[dateKey] ?? [];
    const active = reservations.filter((r) => isRevenueReservationTarget(r, assigneeId, filterMode));

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
    assigneeId: number | null = null,
    filterMode: RevenueFilterMode = 'completed'
): MonthlyRevenue {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: MonthlyDayEntry[] = [];
    let total = 0;
    let count = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${prefix}-${String(d).padStart(2, '0')}`;
        const daily = getDailyRevenue(reservationMap, dateKey, assigneeId, filterMode);

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
    assigneeId: number | null = null,
    filterMode: RevenueFilterMode = 'completed'
): RevenueInsights {
    const start = new Date(startDateKey + 'T00:00:00');
    const end = new Date(endDateKey + 'T00:00:00');
    const [from, to] = start <= end ? [start, end] : [end, start];
    const series: RevenueSeriesEntry[] = [];
    const assigneeTotals = new Map<number | null, RevenueAssigneeEntry>();
    const paymentTotals = new Map<PaymentMethod, number>();
    const channelTotals = new Map<ReservationChannel, number>();
    const firstVisitByCustomer = new Map<number, string>();
    const customerIdsInRange = new Set<number>();
    let total = 0;
    let count = 0;
    let paidTotal = 0;

    for (const [dateKey, reservations] of Object.entries(reservationMap)) {
        for (const reservation of reservations) {
            if (!isRevenueReservationTarget(reservation, assigneeId, filterMode)) continue;

            const existingDate = firstVisitByCustomer.get(reservation.customerId);
            if (!existingDate || dateKey < existingDate) {
                firstVisitByCustomer.set(reservation.customerId, dateKey);
            }
        }
    }

    const cursor = new Date(from);

    while (cursor <= to) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const reservations = (reservationMap[dateKey] ?? []).filter((reservation) => isRevenueReservationTarget(reservation, assigneeId, filterMode));
        const dayTotal = reservations.reduce((sum, reservation) => sum + resolvePrice(reservation.service, reservation.price), 0);

        series.push({
            dateKey,
            total: dayTotal,
            count: reservations.length,
        });

        for (const reservation of reservations) {
            const resolvedPrice = resolvePrice(reservation.service, reservation.price);
            const entryKey = reservation.assigneeId ?? null;
            customerIdsInRange.add(reservation.customerId);
            const existingAssignee = assigneeTotals.get(entryKey);

            if (existingAssignee) {
                existingAssignee.total += resolvedPrice;
                existingAssignee.count += 1;
            } else {
                assigneeTotals.set(entryKey, {
                    assigneeId: entryKey,
                    total: resolvedPrice,
                    count: 1,
                });
            }

            const ch = reservation.channel ?? '전화예약';
            channelTotals.set(ch, (channelTotals.get(ch) ?? 0) + 1);

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
        assignees: [...assigneeTotals.values()].sort((a, b) => b.total - a.total),
        payments: [...paymentTotals.entries()]
            .map(([method, methodTotal]) => ({method, total: methodTotal}))
            .sort((a, b) => b.total - a.total),
        channels: [...channelTotals.entries()]
            .map(([channel, channelCount]) => ({channel, count: channelCount}))
            .sort((a, b) => b.count - a.count),
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
    assigneeId: number | null = null,
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
        const daily = getDailyRevenue(reservationMap, dateKey, assigneeId, filterMode);

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
    assigneeId: number | null = null
): OperationInsights {
    const start = new Date(startDateKey + 'T00:00:00');
    const end = new Date(endDateKey + 'T00:00:00');
    const [from, to] = start <= end ? [start, end] : [end, start];
    const customerStats = new Map<number, {total: number; noshow: number}>();
    const assigneeStats = new Map<number | null, {total: number; cancelled: number}>();
    let totalReservations = 0;
    let totalNoshowCount = 0;
    let totalCancelledCount = 0;

    const cursor = new Date(from);

    while (cursor <= to) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const reservations = reservationMap[dateKey] ?? [];

        for (const reservation of reservations) {
            if (!matchAssignee(reservation.assigneeId, assigneeId)) continue;

            totalReservations += 1;

            const customerEntry = customerStats.get(reservation.customerId) ?? {total: 0, noshow: 0};
            customerEntry.total += 1;
            if (reservation.status === 'noshow') {
                customerEntry.noshow += 1;
                totalNoshowCount += 1;
            }
            customerStats.set(reservation.customerId, customerEntry);

            const assigneeEntryKey = reservation.assigneeId ?? null;
            const assigneeEntry = assigneeStats.get(assigneeEntryKey) ?? {total: 0, cancelled: 0};
            assigneeEntry.total += 1;
            if (reservation.status === 'cancelled') {
                assigneeEntry.cancelled += 1;
                totalCancelledCount += 1;
            }
            assigneeStats.set(assigneeEntryKey, assigneeEntry);
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
        assigneeCancellationRates: [...assigneeStats.entries()]
            .map(([assigneeIdValue, stats]) => ({
                assigneeId: assigneeIdValue,
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
