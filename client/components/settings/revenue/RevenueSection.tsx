import {useMemo, useState} from 'react';

import {PageHero} from '../../ui/PageHero';
import {
    getDailyRevenue,
    getOperationInsights,
    getRangeRevenue,
    getRevenueInsights,
    isPaidReservationTarget,
    isRevenueReservationTarget,
    type RevenueFilterMode,
} from '../../../utils/revenue';
import {formatPrice, getServiceColor, parseServiceString} from '../../../utils/services';
import type {Assignee} from '../../../utils/assignees';
import {getAssigneeColor, getAssigneeStatus} from '../../../utils/assignees';
import type {PaymentMethod, Reservation, ReservationMap} from '../../../utils/reservations';
import {toDateKey} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';

import {exportRevenueToExcel} from '../../../utils/revenue-export';
import {RevenueFilters, type RevenueViewTab} from './RevenueFilters';
import {RevenueKpiGrid, type RevenueMetricKey} from './RevenueKpiGrid';
import {RevenueChartGrid, type ChartDetailKey} from './RevenueChartGrid';
import {RevenueDailyList} from './RevenueDailyList';
import {RevenueDailyDetailModal} from './RevenueDailyDetailModal';
import {RevenueMetricModal} from './RevenueMetricModal';
import {StyledRevenueEmpty} from './revenue-styles';
import {
    StyledDashboard,
    StyledDailyCard,
} from './RevenueSection.styles';
import {
    CHANNEL_ORDER,
    CHANNEL_COLORS,
    PAYMENT_METHOD_COLORS,
    PAYMENT_METHOD_ORDER,
    shiftDateKey,
    getDiffDays,
    buildRevenueLinePath,
    buildPaymentDonutGradient,
} from './revenueChartUtils';
import {REVENUE_CHART_WIDTH, REVENUE_CHART_HEIGHT} from './revenue-chart-styles';

export type RevenueAssigneeKey = 'all' | `${number}`;
export type RevenueQuickRange = 'month' | 'week' | 'today';

interface RevenueSectionProps {
    reservationMap: ReservationMap;
    assignees: Assignee[];
    customerMap: CustomerMap;
    serviceColorMap: Record<string, string>;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectCustomer: (customerId: number) => void;
    assigneeKey: RevenueAssigneeKey;
    setAssigneeKey: (v: RevenueAssigneeKey) => void;
    startDateKey: string;
    setStartDateKey: (key: string) => void;
    endDateKey: string;
    setEndDateKey: (key: string) => void;
    setDateRange: (startKey: string, endKey: string, selectedKey?: string) => void;
    selectedDateKey: string;
    setSelectedDateKey: (key: string) => void;
    quickRange: RevenueQuickRange | null;
    setQuickRange: (range: RevenueQuickRange) => void;
}

export const RevenueSection = ({
    reservationMap,
    assignees,
    customerMap,
    serviceColorMap,
    onSelectReservation,
    onSelectCustomer,
    assigneeKey,
    setAssigneeKey,
    startDateKey,
    setStartDateKey,
    endDateKey,
    setEndDateKey,
    setDateRange,
    setSelectedDateKey,
    quickRange,
    setQuickRange,
}: RevenueSectionProps) => {
    const [detailDateKey, setDetailDateKey] = useState<string | null>(null);
    const [metricLayerKey, setMetricLayerKey] = useState<RevenueMetricKey | null>(null);
    const [chartDetailKey, setChartDetailKey] = useState<ChartDetailKey | null>(null);
    const [revenueViewTab, setRevenueViewTab] = useState<RevenueViewTab>('all');
    const [revenueFilterMode, setRevenueFilterMode] = useState<RevenueFilterMode>('booked');

    const selectedAssigneeId = assigneeKey === 'all' ? null : Number(assigneeKey);
    const assigneeMap = useMemo(
        () => Object.fromEntries(assignees.map((assignee) => [assignee.id, assignee])),
        [assignees]
    );

    const [fromDateKey, toDateKeyValue] = startDateKey <= endDateKey
        ? [startDateKey, endDateKey]
        : [endDateKey, startDateKey];

    const rangeRevenue = getRangeRevenue(reservationMap, fromDateKey, toDateKeyValue, selectedAssigneeId, revenueFilterMode);
    const revenueInsights = getRevenueInsights(reservationMap, fromDateKey, toDateKeyValue, selectedAssigneeId, revenueFilterMode);
    const operationInsights = getOperationInsights(reservationMap, fromDateKey, toDateKeyValue, selectedAssigneeId);
    const days = [...rangeRevenue.days].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    const dayReservationMap = useMemo(
        () => Object.fromEntries(
            days.map((day) => [
                day.dateKey,
                (reservationMap[day.dateKey] ?? [])
                    .filter((reservation) => isRevenueReservationTarget(reservation, selectedAssigneeId, revenueFilterMode))
                    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
            ])
        ),
        [days, reservationMap, selectedAssigneeId, revenueFilterMode]
    );

    const openedDateKey = detailDateKey && detailDateKey >= fromDateKey && detailDateKey <= toDateKeyValue
        ? detailDateKey
        : null;
    const layerDaily = openedDateKey ? getDailyRevenue(reservationMap, openedDateKey, selectedAssigneeId, revenueFilterMode) : null;

    // Chart data
    const paymentRevenueMap = useMemo(
        () => new Map(revenueInsights.payments.map((entry) => [entry.method, entry.total])),
        [revenueInsights.payments]
    );
    const paymentChartItems = useMemo(
        () => PAYMENT_METHOD_ORDER.map((method, index) => ({
            method,
            total: paymentRevenueMap.get(method) ?? 0,
            color: PAYMENT_METHOD_COLORS[index % PAYMENT_METHOD_COLORS.length],
        })),
        [paymentRevenueMap]
    );
    const assigneeRevenueMap = useMemo(
        () => new Map(revenueInsights.assignees.map((entry) => [entry.assigneeId, entry])),
        [revenueInsights.assignees]
    );
    const assigneeChartItems = useMemo(() => {
        const baseAssignees = selectedAssigneeId == null
            ? assignees
            : assignees.filter((assignee) => assignee.id === selectedAssigneeId);
        return baseAssignees
            .filter((assignee) => {
                const matchedRevenue = assigneeRevenueMap.get(assignee.id);
                if (getAssigneeStatus(assignee) === '퇴직' && (!matchedRevenue || matchedRevenue.total === 0)) return false;
                return true;
            })
            .map((assignee) => {
                const matchedRevenue = assigneeRevenueMap.get(assignee.id);
                return {
                    assigneeId: assignee.id,
                    total: matchedRevenue?.total ?? 0,
                    count: matchedRevenue?.count ?? 0,
                    name: assignee.name,
                    color: getAssigneeColor(assignee),
                };
            });
    }, [assignees, assigneeRevenueMap, selectedAssigneeId]);
    const customerNoshowItems = useMemo(
        () => operationInsights.customerNoshowRates.slice(0, 5).map((item) => ({
            ...item,
            customer: customerMap[item.customerId],
        })),
        [operationInsights.customerNoshowRates, customerMap]
    );
    const assigneeCancellationItems = useMemo(
        () => operationInsights.assigneeCancellationRates
            .slice(0, 5)
            .map((item) => ({
                ...item,
                name: item.assigneeId == null ? '미지정' : (assigneeMap[item.assigneeId]?.name ?? '미지정'),
                color: item.assigneeId == null ? '#8E8E93' : (assigneeMap[item.assigneeId]?.color ?? '#8E8E93'),
            })),
        [operationInsights.assigneeCancellationRates, assigneeMap]
    );
    const chartPath = buildRevenueLinePath(revenueInsights.series.map((item) => item.total), REVENUE_CHART_WIDTH, REVENUE_CHART_HEIGHT);
    const lineMax = Math.max(...revenueInsights.series.map((item) => item.total), 1);
    const chartPoints = useMemo(
        () => revenueInsights.series.map((item, index) => ({
            ...item,
            xRatio: revenueInsights.series.length > 1 ? index / (revenueInsights.series.length - 1) : 0.5,
            yRatio: 1 - (item.total / lineMax),
        })),
        [revenueInsights.series, lineMax]
    );
    const paymentDonutGradient = buildPaymentDonutGradient(
        paymentChartItems.map((item) => item.color),
        paymentChartItems.map((item) => item.total)
    );
    const channelChartItems = useMemo(
        () => CHANNEL_ORDER.map((channel) => ({
            channel,
            count: revenueInsights.channels.find((c) => c.channel === channel)?.count ?? 0,
            color: CHANNEL_COLORS[channel],
        })),
        [revenueInsights.channels]
    );
    const channelTotalCount = useMemo(
        () => channelChartItems.reduce((sum, item) => sum + item.count, 0),
        [channelChartItems]
    );
    const channelDonutGradient = buildPaymentDonutGradient(
        channelChartItems.map((item) => item.color),
        channelChartItems.map((item) => item.count)
    );

    // Metric modal data
    const metricReservations = useMemo(() => {
        const items: Reservation[] = [];
        const cursor = new Date(fromDateKey + 'T00:00:00');
        const endCursor = new Date(toDateKeyValue + 'T00:00:00');
        while (cursor <= endCursor) {
            const dateKey = toDateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
            const reservations = (reservationMap[dateKey] ?? []).filter((reservation) => (
                isRevenueReservationTarget(reservation, selectedAssigneeId, revenueFilterMode)
            ));
            items.push(...reservations);
            cursor.setDate(cursor.getDate() + 1);
        }
        return items.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    }, [fromDateKey, toDateKeyValue, reservationMap, selectedAssigneeId, revenueFilterMode]);

    const firstVisitByCustomer = useMemo(() => {
        const firstVisit = new Map<number, string>();
        for (const [dateKey, reservations] of Object.entries(reservationMap)) {
            for (const reservation of reservations) {
                if (!isRevenueReservationTarget(reservation, selectedAssigneeId, revenueFilterMode)) continue;
                const current = firstVisit.get(reservation.customerId);
                if (!current || dateKey < current) {
                    firstVisit.set(reservation.customerId, dateKey);
                }
            }
        }
        return firstVisit;
    }, [reservationMap, selectedAssigneeId, revenueFilterMode]);

    const newCustomerEntries = useMemo(() => {
        const seen = new Set<number>();
        return metricReservations.filter((reservation) => {
            if (seen.has(reservation.customerId)) return false;
            seen.add(reservation.customerId);
            return firstVisitByCustomer.get(reservation.customerId) === reservation.date;
        });
    }, [metricReservations, firstVisitByCustomer]);

    const returningCustomerEntries = useMemo(() => {
        const seen = new Set<number>();
        return metricReservations.filter((reservation) => {
            if (seen.has(reservation.customerId)) return false;
            seen.add(reservation.customerId);
            const firstVisit = firstVisitByCustomer.get(reservation.customerId);
            return !!firstVisit && firstVisit < reservation.date;
        });
    }, [metricReservations, firstVisitByCustomer]);

    const newCustomerList = useMemo(
        () => newCustomerEntries.map((reservation) => ({
            customer: customerMap[reservation.customerId],
            visitDate: reservation.date,
        })).filter((item): item is {customer: NonNullable<typeof item.customer>; visitDate: string} => !!item.customer),
        [customerMap, newCustomerEntries]
    );

    const prevVisitByCustomer = useMemo(() => {
        const visitDates = new Map<number, string[]>();
        for (const [dateKey, reservations] of Object.entries(reservationMap)) {
            for (const reservation of reservations) {
                if (!isRevenueReservationTarget(reservation, selectedAssigneeId, revenueFilterMode)) continue;
                const dates = visitDates.get(reservation.customerId) ?? [];
                if (!dates.includes(dateKey)) dates.push(dateKey);
                visitDates.set(reservation.customerId, dates);
            }
        }
        const result = new Map<number, string>();
        for (const reservation of returningCustomerEntries) {
            const dates = (visitDates.get(reservation.customerId) ?? [])
                .filter((d) => d < reservation.date)
                .sort((a, b) => b.localeCompare(a));
            if (dates.length > 0) result.set(reservation.customerId, dates[0]);
        }
        return result;
    }, [reservationMap, selectedAssigneeId, revenueFilterMode, returningCustomerEntries]);

    const returningCustomerList = useMemo(
        () => returningCustomerEntries.map((reservation) => ({
            customer: customerMap[reservation.customerId],
            visitDate: reservation.date,
            prevVisitDate: prevVisitByCustomer.get(reservation.customerId),
        })).filter((item): item is {customer: NonNullable<typeof item.customer>; visitDate: string; prevVisitDate: string | undefined} => !!item.customer),
        [customerMap, returningCustomerEntries, prevVisitByCustomer]
    );

    const paidReservations = useMemo(
        () => metricReservations.filter((reservation) => isPaidReservationTarget(reservation, selectedAssigneeId)),
        [metricReservations, selectedAssigneeId]
    );

    // All reservations in range (regardless of status, for operation detail views)
    const allRangeReservations = useMemo(() => {
        const items: Reservation[] = [];
        const cursor = new Date(fromDateKey + 'T00:00:00');
        const endCursor = new Date(toDateKeyValue + 'T00:00:00');
        while (cursor <= endCursor) {
            const dateKey = toDateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
            const reservations = (reservationMap[dateKey] ?? []).filter((reservation) => {
                if (selectedAssigneeId == null) return true;
                return reservation.assigneeId === selectedAssigneeId;
            });
            items.push(...reservations);
            cursor.setDate(cursor.getDate() + 1);
        }
        return items.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    }, [fromDateKey, toDateKeyValue, reservationMap, selectedAssigneeId]);

    const chartDetailLayer = useMemo(() => {
        if (!chartDetailKey) return null;

        switch (chartDetailKey.kind) {
            case 'date': {
                const dayReservations = metricReservations.filter((r) => r.date === chartDetailKey.dateKey);
                const total = dayReservations.reduce((sum, r) => sum + (r.price ?? 0), 0);
                return {
                    title: `${chartDetailKey.dateKey} 매출 상세`,
                    summary: `${dayReservations.length}건 · ${formatPrice(total)}`,
                    reservations: dayReservations,
                    customers: [],
                };
            }
            case 'payment': {
                const method = chartDetailKey.method;
                const filtered = paidReservations.filter((r) => {
                    if (Array.isArray(r.paymentEntries) && r.paymentEntries.length > 0) {
                        return r.paymentEntries.some((e) => e.method === method && e.amount > 0);
                    }
                    return r.paymentCompleted && r.paymentMethod === method;
                });
                const total = filtered.reduce((sum, r) => sum + (r.price ?? 0), 0);
                return {
                    title: `${method} 결제 상세`,
                    summary: `${filtered.length}건 · ${formatPrice(total)}`,
                    reservations: filtered,
                    customers: [],
                };
            }
            case 'assignee': {
                const did = chartDetailKey.assigneeId;
                const filtered = metricReservations.filter((r) => r.assigneeId === did);
                const total = filtered.reduce((sum, r) => sum + (r.price ?? 0), 0);
                const name = assigneeMap[did]?.name ?? '미지정';
                return {
                    title: `${name} 매출 상세`,
                    summary: `${filtered.length}건 · ${formatPrice(total)}`,
                    reservations: filtered,
                    customers: [],
                };
            }
            case 'cancellation': {
                const did = chartDetailKey.assigneeId;
                const filtered = allRangeReservations.filter((r) => {
                    const rAssigneeId = r.assigneeId ?? null;
                    return rAssigneeId === did && r.status === 'cancelled';
                });
                const name = did == null ? '미지정' : (assigneeMap[did]?.name ?? '미지정');
                return {
                    title: `${name} 취소 예약 상세`,
                    summary: `${filtered.length}건`,
                    reservations: filtered,
                    customers: [],
                };
            }
            case 'noshow': {
                const cid = chartDetailKey.customerId;
                const filtered = allRangeReservations.filter((r) => r.customerId === cid && r.status === 'noshow');
                const name = customerMap[cid]?.name ?? '고객 미지정';
                return {
                    title: `${name} 노쇼 예약 상세`,
                    summary: `${filtered.length}건`,
                    reservations: filtered,
                    customers: [],
                };
            }
            case 'channel': {
                const ch = chartDetailKey.channel;
                const filtered = metricReservations.filter((r) => (r.channel ?? '전화예약') === ch);
                const total = filtered.reduce((sum, r) => sum + (r.price ?? 0), 0);
                return {
                    title: `${ch} 상세`,
                    summary: `${filtered.length}건 · ${formatPrice(total)}`,
                    reservations: filtered,
                    customers: [],
                };
            }
            default:
                return null;
        }
    }, [chartDetailKey, metricReservations, paidReservations, allRangeReservations, assigneeMap, customerMap]);

    const metricLayer = useMemo(() => {
        switch (metricLayerKey) {
            case 'sales':
                return {title: '총 매출 상세', summary: `${metricReservations.length}건 · ${formatPrice(rangeRevenue.total)}`, reservations: metricReservations, customers: []};
            case 'count':
                return {title: '예약 건수 상세', summary: `${metricReservations.length}건`, reservations: metricReservations, customers: []};
            case 'new':
                return {title: '신규 고객 상세', summary: `${newCustomerEntries.length}명`, reservations: newCustomerEntries, customers: newCustomerList};
            case 'returning':
                return {title: '재방문 고객 상세', summary: `${returningCustomerEntries.length}명`, reservations: returningCustomerEntries, customers: returningCustomerList};
            case 'paid':
                return {title: '결제완료 상세', summary: `${paidReservations.length}건 · ${formatPrice(revenueInsights.paidTotal)}`, reservations: paidReservations, customers: []};
            default:
                return null;
        }
    }, [metricLayerKey, metricReservations, newCustomerEntries, newCustomerList, paidReservations, rangeRevenue.total, returningCustomerEntries, returningCustomerList, revenueInsights.paidTotal]);

    const rangeShiftDays = quickRange === 'today'
        ? 1
        : quickRange === 'week'
            ? 7
            : quickRange === 'month'
                ? 30
                : Math.max(getDiffDays(fromDateKey, toDateKeyValue), 1);

    const handleMoveRange = (direction: 'prev' | 'next') => {
        const today = toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

        if (quickRange === 'today') {
            const nextDate = direction === 'prev'
                ? shiftDateKey(toDateKeyValue, -1)
                : shiftDateKey(toDateKeyValue, 1);
            const clampedDate = nextDate > today ? today : nextDate;
            setDateRange(clampedDate, clampedDate, clampedDate);
            return;
        }

        if (direction === 'prev') {
            const nextStart = shiftDateKey(fromDateKey, -rangeShiftDays);
            const nextEnd = shiftDateKey(toDateKeyValue, -rangeShiftDays);
            setDateRange(nextStart, nextEnd, nextEnd);
            return;
        }

        const tentativeEnd = shiftDateKey(toDateKeyValue, rangeShiftDays);
        const nextEnd = tentativeEnd > today ? today : tentativeEnd;
        const nextStart = shiftDateKey(nextEnd, -getDiffDays(fromDateKey, toDateKeyValue));
        setDateRange(nextStart, nextEnd, nextEnd);
    };

    return (
        <>
            <PageHero eyebrow="REVENUE" title="매출" subtitle="기간별 매출 현황과 담당자별 실적을 확인합니다." />
            <RevenueFilters
                startDateKey={startDateKey}
                endDateKey={endDateKey}
                setStartDateKey={setStartDateKey}
                setEndDateKey={setEndDateKey}
                quickRange={quickRange}
                setQuickRange={setQuickRange}
                onMoveRange={handleMoveRange}
                assignees={assignees}
                assigneeKey={assigneeKey}
                setAssigneeKey={setAssigneeKey}
                revenueViewTab={revenueViewTab}
                setRevenueViewTab={setRevenueViewTab}
                revenueFilterMode={revenueFilterMode}
                setRevenueFilterMode={setRevenueFilterMode}
                onExport={() => exportRevenueToExcel({
                    reservationMap,
                    customerMap,
                    assignees,
                    startDateKey: fromDateKey,
                    endDateKey: toDateKeyValue,
                    assigneeId: selectedAssigneeId,
                    filterMode: revenueFilterMode,
                })}
            />

            {(revenueViewTab === 'all' || revenueViewTab === 'chart') && (
                <StyledDashboard>
                    <RevenueKpiGrid
                        total={rangeRevenue.total}
                        count={rangeRevenue.count}
                        newCustomerCount={revenueInsights.newCustomerCount}
                        returningCustomerCount={revenueInsights.returningCustomerCount}
                        paidTotal={revenueInsights.paidTotal}
                        onMetricClick={setMetricLayerKey}
                    />
                    <RevenueChartGrid
                        fromDateKey={fromDateKey}
                        toDateKeyValue={toDateKeyValue}
                        assigneeKey={assigneeKey}
                        chartPath={chartPath}
                        chartPoints={chartPoints}
                        lineMax={lineMax}
                        paidTotal={revenueInsights.paidTotal}
                        paymentDonutGradient={paymentDonutGradient}
                        paymentChartItems={paymentChartItems}
                        assigneeChartItems={assigneeChartItems}
                        assigneeCancellationItems={assigneeCancellationItems}
                        customerNoshowItems={customerNoshowItems}
                        channelChartItems={channelChartItems}
                        channelDonutGradient={channelDonutGradient}
                        channelTotalCount={channelTotalCount}
                        totalCancelledCount={operationInsights.totalCancelledCount}
                        totalCancelledRate={operationInsights.totalCancelledRate}
                        totalNoshowCount={operationInsights.totalNoshowCount}
                        totalNoshowRate={operationInsights.totalNoshowRate}
                        onSelectCustomer={onSelectCustomer}
                        onChartDetailClick={setChartDetailKey}
                        seriesLength={revenueInsights.series.length}
                    />
                </StyledDashboard>
            )}

            {(revenueViewTab === 'all' || revenueViewTab === 'list') && (
                <StyledDailyCard>
                    <RevenueDailyList
                        days={days}
                        dayReservationMap={dayReservationMap}
                        assigneeMap={assigneeMap}
                        customerMap={customerMap}
                        serviceColorMap={serviceColorMap}
                        onSelectCustomer={onSelectCustomer}
                        onSelectReservation={onSelectReservation}
                        onDayClick={(dateKey) => {
                            setSelectedDateKey(dateKey);
                            setDetailDateKey(dateKey);
                        }}
                        rangeTotal={rangeRevenue.total}
                        rangeCount={rangeRevenue.count}
                    />
                </StyledDailyCard>
            )}

            {openedDateKey && layerDaily && (
                <RevenueDailyDetailModal
                    dateKey={openedDateKey}
                    daily={layerDaily}
                    reservationMap={reservationMap}
                    assigneeMap={assigneeMap}
                    customerMap={customerMap}
                    serviceColorMap={serviceColorMap}
                    onClose={() => setDetailDateKey(null)}
                    onSelectReservation={onSelectReservation}
                    onSelectCustomer={onSelectCustomer}
                />
            )}

            {metricLayerKey && metricLayer && (
                <RevenueMetricModal
                    metricLayerKey={metricLayerKey}
                    metricLayer={metricLayer}
                    revenueFilterMode={revenueFilterMode}
                    assigneeMap={assigneeMap}
                    customerMap={customerMap}
                    serviceColorMap={serviceColorMap}
                    onClose={() => setMetricLayerKey(null)}
                    onSelectReservation={onSelectReservation}
                    onSelectCustomer={onSelectCustomer}
                />
            )}

            {chartDetailKey && chartDetailLayer && (
                <RevenueMetricModal
                    metricLayerKey="sales"
                    metricLayer={chartDetailLayer}
                    revenueFilterMode={revenueFilterMode}
                    assigneeMap={assigneeMap}
                    customerMap={customerMap}
                    serviceColorMap={serviceColorMap}
                    onClose={() => setChartDetailKey(null)}
                    onSelectReservation={onSelectReservation}
                    onSelectCustomer={onSelectCustomer}
                />
            )}
        </>
    );
};

/* ── Styled ── */
