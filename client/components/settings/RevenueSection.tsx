import {Fragment, useMemo, useState} from 'react';

import {createPortal} from 'react-dom';
import styled, {css} from 'styled-components';

import {
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../calendar/overlays/ModalStyles';
import {
    getDailyRevenue,
    getOperationInsights,
    getRangeRevenue,
    getRevenueInsights,
    isPaidReservationTarget,
    isRevenueReservationTarget,
    type RevenueFilterMode,
} from '../../utils/revenue';
import {formatPrice, getServiceColor, parseServiceString} from '../../utils/services';
import type {Designer} from '../../utils/designers';
import {getDesignerColor} from '../../utils/designers';
import type {PaymentMethod, Reservation, ReservationMap} from '../../utils/reservations';
import {toDateKey} from '../../utils/reservations';
import type {CustomerMap} from '../../utils/customers';
import {isNewCustomerVisit} from '../../utils/customers';
import {formControlStyle} from '../ui/FormControls';
import {NewCustomerBadge} from '../ui/NewCustomerBadge';

export type RevenueDesignerKey = 'all' | `${number}`;
export type RevenueQuickRange = 'month' | 'week' | 'today';

interface RevenueSectionProps {
    reservationMap: ReservationMap;
    designers: Designer[];
    customerMap: CustomerMap;
    serviceColorMap: Record<string, string>;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectCustomer: (customerId: number) => void;
    designerKey: RevenueDesignerKey;
    setDesignerKey: (v: RevenueDesignerKey) => void;
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

type RevenueViewTab = 'all' | 'chart' | 'list';
type RevenueMetricKey = 'sales' | 'count' | 'new' | 'returning' | 'paid';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const PAYMENT_METHOD_COLORS = ['#2D7FF9', '#00A896', '#FB8C00', '#E85D75', '#7E57C2', '#4C6EF5', '#8E8E93', '#34A853'] as const;
const PAYMENT_METHOD_ORDER: PaymentMethod[] = ['현금', '현금+현금영수증', '카드', '네이버페이', '지역화폐', '지역화폐+현금영수증', '상품권', '적립금'];
const REVENUE_CHART_WIDTH = 320;
const REVENUE_CHART_HEIGHT = 160;

function shiftDateKey(dateKey: string, days: number): string {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDiffDays(fromDateKey: string, toDateKeyValue: string): number {
    const from = new Date(`${fromDateKey}T00:00:00`);
    const to = new Date(`${toDateKeyValue}T00:00:00`);
    return Math.max(Math.round((to.getTime() - from.getTime()) / 86400000), 0);
}

function formatDateLabel(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function getShortDateParts(dateKey: string): {monthDay: string; yearWeekday: string} {
    const parts = dateKey.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(dateKey + 'T00:00:00');
    return {
        monthDay: `${month}월 ${day}일`,
        yearWeekday: `${year}년 (${WEEKDAYS[date.getDay()]})`,
    };
}

function buildRevenueLinePath(values: number[], width: number, height: number): {linePath: string; areaPath: string} {
    if (values.length === 0) return {linePath: '', areaPath: ''};

    const max = Math.max(...values, 1);
    if (values.length === 1) {
        const y = height - (values[0] / max) * height;
        return {
            linePath: `M 0 ${y} L ${width} ${y}`,
            areaPath: `M 0 ${y} L ${width} ${y} L ${width} ${height} L 0 ${height} Z`,
        };
    }

    const stepX = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values.map((value, index) => {
        const x = values.length > 1 ? index * stepX : width / 2;
        const y = height - (value / max) * height;
        return {x, y};
    });
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return {linePath, areaPath};
}

function buildPaymentDonutGradient(colors: string[], totals: number[]): string {
    const sum = totals.reduce((acc, value) => acc + value, 0);
    if (sum <= 0 || colors.length === 0) return 'conic-gradient(#E5E7EB 0deg 360deg)';

    let angle = 0;
    const segments = totals.map((total, index) => {
        const start = angle;
        angle += (total / sum) * 360;
        return `${colors[index]} ${start}deg ${angle}deg`;
    });

    return `conic-gradient(${segments.join(', ')})`;
}

export const RevenueSection = ({
    reservationMap,
    designers,
    customerMap,
    serviceColorMap,
    onSelectReservation,
    onSelectCustomer,
    designerKey,
    setDesignerKey,
    startDateKey,
    setStartDateKey,
    endDateKey,
    setEndDateKey,
    setDateRange,
    selectedDateKey,
    setSelectedDateKey,
    quickRange,
    setQuickRange,
}: RevenueSectionProps) => {
    const [detailDateKey, setDetailDateKey] = useState<string | null>(null);
    const [metricLayerKey, setMetricLayerKey] = useState<RevenueMetricKey | null>(null);
    const [revenueViewTab, setRevenueViewTab] = useState<RevenueViewTab>('all');
    const [revenueFilterMode, setRevenueFilterMode] = useState<RevenueFilterMode>('completed');
    const [hoveredRevenueDateKey, setHoveredRevenueDateKey] = useState<string | null>(null);
    const selectedDesignerId = designerKey === 'all' ? null : Number(designerKey);
    const designerMap = useMemo(
        () => Object.fromEntries(designers.map((designer) => [designer.id, designer])),
        [designers]
    );
    const [fromDateKey, toDateKeyValue] = startDateKey <= endDateKey
        ? [startDateKey, endDateKey]
        : [endDateKey, startDateKey];
    const rangeRevenue = getRangeRevenue(reservationMap, fromDateKey, toDateKeyValue, selectedDesignerId, revenueFilterMode);
    const revenueInsights = getRevenueInsights(reservationMap, fromDateKey, toDateKeyValue, selectedDesignerId, revenueFilterMode);
    const operationInsights = getOperationInsights(reservationMap, fromDateKey, toDateKeyValue, selectedDesignerId);
    const days = [...rangeRevenue.days].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    const dayReservationMap = useMemo(
        () => Object.fromEntries(
            days.map((day) => [
                day.dateKey,
                (reservationMap[day.dateKey] ?? [])
                    .filter((reservation) => isRevenueReservationTarget(reservation, selectedDesignerId, revenueFilterMode))
                    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
            ])
        ),
        [days, reservationMap, selectedDesignerId, revenueFilterMode]
    );
    const openedDateKey = detailDateKey && detailDateKey >= fromDateKey && detailDateKey <= toDateKeyValue
        ? detailDateKey
        : null;
    const layerDaily = openedDateKey ? getDailyRevenue(reservationMap, openedDateKey, selectedDesignerId, revenueFilterMode) : null;
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
    const designerRevenueMap = useMemo(
        () => new Map(revenueInsights.designers.map((entry) => [entry.designerId, entry])),
        [revenueInsights.designers]
    );
    const designerChartItems = useMemo(() => {
        const baseDesigners = selectedDesignerId == null
            ? designers
            : designers.filter((designer) => designer.id === selectedDesignerId);

        return baseDesigners.map((designer) => {
            const matchedRevenue = designerRevenueMap.get(designer.id);

            return {
                designerId: designer.id,
                total: matchedRevenue?.total ?? 0,
                count: matchedRevenue?.count ?? 0,
                name: designer.name,
                color: getDesignerColor(designer),
            };
        });
    }, [designers, designerRevenueMap, selectedDesignerId]);
    const designerBarValueWidthCh = useMemo(
        () => Math.max(...designerChartItems.map((item) => formatPrice(item.total).length), formatPrice(0).length),
        [designerChartItems]
    );
    const customerNoshowItems = useMemo(
        () => operationInsights.customerNoshowRates.slice(0, 5).map((item) => ({
            ...item,
            customer: customerMap[item.customerId],
        })),
        [operationInsights.customerNoshowRates, customerMap]
    );
    const designerCancellationItems = useMemo(
        () => operationInsights.designerCancellationRates
            .slice(0, 5)
            .map((item) => ({
                ...item,
                name: item.designerId == null
                    ? '미지정'
                    : (designerMap[item.designerId]?.name ?? '미지정'),
                color: item.designerId == null
                    ? '#8E8E93'
                    : (designerMap[item.designerId]?.color ?? '#8E8E93'),
            })),
        [operationInsights.designerCancellationRates, designerMap]
    );
    const chartPath = buildRevenueLinePath(revenueInsights.series.map((item) => item.total), REVENUE_CHART_WIDTH, REVENUE_CHART_HEIGHT);
    const linePeak = Math.max(...revenueInsights.series.map((item) => item.total), 0);
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
    const hoveredRevenuePoint = chartPoints.find((item) => item.dateKey === hoveredRevenueDateKey) ?? null;
    const metricReservations = useMemo(() => {
        const items: Reservation[] = [];
        const cursor = new Date(fromDateKey + 'T00:00:00');
        const endCursor = new Date(toDateKeyValue + 'T00:00:00');

        while (cursor <= endCursor) {
            const dateKey = toDateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
            const reservations = (reservationMap[dateKey] ?? []).filter((reservation) => (
                isRevenueReservationTarget(reservation, selectedDesignerId, revenueFilterMode)
            ));
            items.push(...reservations);
            cursor.setDate(cursor.getDate() + 1);
        }

        return items.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    }, [fromDateKey, toDateKeyValue, reservationMap, selectedDesignerId, revenueFilterMode]);
    const firstVisitByCustomer = useMemo(() => {
        const firstVisit = new Map<number, string>();

        for (const [dateKey, reservations] of Object.entries(reservationMap)) {
            for (const reservation of reservations) {
                if (!isRevenueReservationTarget(reservation, selectedDesignerId, revenueFilterMode)) continue;

                const current = firstVisit.get(reservation.customerId);
                if (!current || dateKey < current) {
                    firstVisit.set(reservation.customerId, dateKey);
                }
            }
        }

        return firstVisit;
    }, [reservationMap, selectedDesignerId, revenueFilterMode]);
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
    const returningCustomerList = useMemo(
        () => returningCustomerEntries.map((reservation) => ({
            customer: customerMap[reservation.customerId],
            visitDate: reservation.date,
        })).filter((item): item is {customer: NonNullable<typeof item.customer>; visitDate: string} => !!item.customer),
        [customerMap, returningCustomerEntries]
    );
    const paidReservations = useMemo(
        () => metricReservations.filter((reservation) => isPaidReservationTarget(reservation, selectedDesignerId)),
        [metricReservations, selectedDesignerId]
    );
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
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId('revenue-metric');
    const metricDialogRef = useDialogAccessibility<HTMLDivElement>(() => setMetricLayerKey(null));
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
            <StyledRevenueStickyArea>
                <StyledRangeFilter>
                    <StyledRangeNavButton type="button" onClick={() => handleMoveRange('prev')}>이전</StyledRangeNavButton>
                    <StyledRangeInputWrap>
                        <span>시작일</span>
                        <StyledDateInput type="date" value={startDateKey} onChange={(e) => setStartDateKey(e.target.value)} />
                    </StyledRangeInputWrap>
                    <StyledRangeDivider>~</StyledRangeDivider>
                    <StyledRangeInputWrap>
                        <span>종료일</span>
                        <StyledDateInput type="date" value={endDateKey} onChange={(e) => setEndDateKey(e.target.value)} />
                    </StyledRangeInputWrap>
                    <StyledRangeNavButton type="button" onClick={() => handleMoveRange('next')}>다음</StyledRangeNavButton>
                </StyledRangeFilter>
                <StyledQuickFilters>
                    <StyledQuickFilterButton type="button" $active={quickRange === 'today'} onClick={() => setQuickRange('today')}>오늘</StyledQuickFilterButton>
                    <StyledQuickFilterButton type="button" $active={quickRange === 'week'} onClick={() => setQuickRange('week')}>7일</StyledQuickFilterButton>
                    <StyledQuickFilterButton type="button" $active={quickRange === 'month'} onClick={() => setQuickRange('month')}>30일</StyledQuickFilterButton>
                </StyledQuickFilters>
                <StyledDesignerTabs>
                    <StyledDesignerTab type="button" $active={designerKey === 'all'} onClick={() => setDesignerKey('all')}>전체</StyledDesignerTab>
                    {designers.map((designer) => (
                        <StyledDesignerTab
                            key={designer.id}
                            type="button"
                            $active={designerKey === String(designer.id)}
                            onClick={() => setDesignerKey(String(designer.id) as RevenueDesignerKey)}
                        >
                            {designer.name}
                        </StyledDesignerTab>
                    ))}
                </StyledDesignerTabs>
                <StyledRevenueViewTabs>
                    <StyledRevenueViewTab type="button" $active={revenueViewTab === 'all'} onClick={() => setRevenueViewTab('all')}>전체</StyledRevenueViewTab>
                    <StyledRevenueViewTab type="button" $active={revenueViewTab === 'chart'} onClick={() => setRevenueViewTab('chart')}>그래프</StyledRevenueViewTab>
                    <StyledRevenueViewTab type="button" $active={revenueViewTab === 'list'} onClick={() => setRevenueViewTab('list')}>일별목록</StyledRevenueViewTab>
                </StyledRevenueViewTabs>
                <StyledRevenueFilterTabs>
                    <StyledRevenueFilterTab
                        type="button"
                        $active={revenueFilterMode === 'completed'}
                        onClick={() => setRevenueFilterMode('completed')}
                    >
                        예약완료 매출
                    </StyledRevenueFilterTab>
                    <StyledRevenueFilterTab
                        type="button"
                        $active={revenueFilterMode === 'booked'}
                        onClick={() => setRevenueFilterMode('booked')}
                    >
                        예약매출
                    </StyledRevenueFilterTab>
                </StyledRevenueFilterTabs>
                <StyledRevenueCriteria>
                    <strong>집계 기준</strong>
                    {revenueFilterMode === 'completed' ? (
                        <>
                            <span>예약완료 매출은 예약상태가 예약완료인 건만 집계합니다.</span>
                            <span>결제완료 금액은 해당 집계 대상 중 결제수단과 금액이 입력된 내역만 합산됩니다.</span>
                        </>
                    ) : (
                        <>
                            <span>예약매출은 취소, 노쇼를 제외한 전체 예약을 기준으로 집계합니다.</span>
                            <span>결제완료 금액은 예약완료 기준으로만 집계되며 예약매출 필터에서도 동일하게 유지됩니다.</span>
                        </>
                    )}
                </StyledRevenueCriteria>
            </StyledRevenueStickyArea>
            {(revenueViewTab === 'all' || revenueViewTab === 'chart') && (
                <StyledRevenueDashboard>
                    <StyledKpiGrid>
                        <StyledKpiCard>
                            <span>총 매출</span>
                            <strong onClick={() => setMetricLayerKey('sales')}>{formatPrice(rangeRevenue.total)}</strong>
                        </StyledKpiCard>
                        <StyledKpiCard>
                            <span>예약 건수</span>
                            <strong onClick={() => setMetricLayerKey('count')}>{rangeRevenue.count}건</strong>
                        </StyledKpiCard>
                        <StyledKpiCard>
                            <span>신규 고객 수</span>
                            <strong onClick={() => setMetricLayerKey('new')}>{revenueInsights.newCustomerCount}명</strong>
                        </StyledKpiCard>
                        <StyledKpiCard>
                            <span>재방문 고객 수</span>
                            <strong onClick={() => setMetricLayerKey('returning')}>{revenueInsights.returningCustomerCount}명</strong>
                        </StyledKpiCard>
                        <StyledKpiCard>
                            <span>결제완료</span>
                            <strong onClick={() => setMetricLayerKey('paid')}>{formatPrice(revenueInsights.paidTotal)}</strong>
                        </StyledKpiCard>
                    </StyledKpiGrid>
                    <StyledChartGrid>
                        <StyledChartCard $hero>
                            <StyledChartHeader>
                                <strong>기간별 매출 추이</strong>
                                <span>{fromDateKey} ~ {toDateKeyValue}</span>
                            </StyledChartHeader>
                            {revenueInsights.series.length === 0 ? (
                                <StyledChartEmpty>집계할 매출이 없습니다.</StyledChartEmpty>
                            ) : (
                                <>
                                    <StyledLineChartBox>
                                        {hoveredRevenuePoint && (
                                            <StyledChartTooltip $leftRatio={hoveredRevenuePoint.xRatio} $topRatio={hoveredRevenuePoint.yRatio}>
                                                <strong>{hoveredRevenuePoint.dateKey}</strong>
                                                <span>{formatPrice(hoveredRevenuePoint.total)}</span>
                                            </StyledChartTooltip>
                                        )}
                                        <StyledLineChartFrame>
                                            <StyledYAxis>
                                                <span className="top">{formatPrice(lineMax)}</span>
                                                <span className="middle">{formatPrice(Math.round(lineMax / 2))}</span>
                                                <span className="bottom">{formatPrice(0)}</span>
                                            </StyledYAxis>
                                            <StyledLineChartStage>
                                                <StyledChartHorizontalGuide $topRatio={0} />
                                                <StyledChartHorizontalGuide $topRatio={0.5} />
                                                <StyledChartHorizontalGuide $topRatio={1} />
                                                <StyledLineChart viewBox={`0 0 ${REVENUE_CHART_WIDTH} ${REVENUE_CHART_HEIGHT}`} preserveAspectRatio="none">
                                                    <path d={chartPath.areaPath} fill="rgba(45, 127, 249, 0.14)" />
                                                    <path d={chartPath.linePath} fill="none" stroke="var(--blue-color)" strokeWidth="2.25" strokeLinecap="round" />
                                                </StyledLineChart>
                                                {chartPoints.map((item) => {
                                                    const isActive = hoveredRevenueDateKey === item.dateKey;

                                                    return (
                                                        <Fragment key={item.dateKey}>
                                                            {isActive && (
                                                                <>
                                                                    <StyledChartGuide $leftRatio={item.xRatio} />
                                                                    <StyledChartPointHalo $leftRatio={item.xRatio} $topRatio={item.yRatio} />
                                                                </>
                                                            )}
                                                            <StyledChartPointButton
                                                                type="button"
                                                                aria-label={`${item.dateKey} ${formatPrice(item.total)}`}
                                                                onMouseEnter={() => setHoveredRevenueDateKey(item.dateKey)}
                                                                onMouseLeave={() => setHoveredRevenueDateKey((current) => current === item.dateKey ? null : current)}
                                                                $active={isActive}
                                                                $leftRatio={item.xRatio}
                                                                $topRatio={item.yRatio}
                                                            />
                                                        </Fragment>
                                                    );
                                                })}
                                            </StyledLineChartStage>
                                        </StyledLineChartFrame>
                                    </StyledLineChartBox>
                                    <StyledChartAxis>
                                        <span>{fromDateKey.slice(5)}</span>
                                        <span>{toDateKeyValue.slice(5)}</span>
                                    </StyledChartAxis>
                                </>
                            )}
                        </StyledChartCard>
                        <StyledChartCard $autoHeight>
                            <StyledChartHeader>
                                <strong>디자이너별 매출</strong>
                                <span>{designerKey === 'all' ? '전체 기준' : '선택 디자이너 기준'}</span>
                            </StyledChartHeader>
                            {designerChartItems.length === 0 ? (
                                <StyledChartEmpty>디자이너 매출이 없습니다.</StyledChartEmpty>
                            ) : (
                                <StyledBarChartList>
                                    {designerChartItems.map((item) => {
                                        const ratio = linePeak > 0 ? (item.total / Math.max(...designerChartItems.map((entry) => entry.total), 1)) * 100 : 0;

                                        return (
                                            <StyledBarRow key={`${item.designerId ?? 'none'}-${item.name}`} $valueWidthCh={designerBarValueWidthCh}>
                                                <StyledBarLabel>
                                                    <StyledColorSwatch $color={item.color} />
                                                    <span>{item.name}</span>
                                                </StyledBarLabel>
                                                <StyledBarTrack>
                                                    <StyledBarFill $color={item.color} $width={ratio} />
                                                </StyledBarTrack>
                                                <StyledBarValue>{formatPrice(item.total)}</StyledBarValue>
                                            </StyledBarRow>
                                        );
                                    })}
                                </StyledBarChartList>
                            )}
                        </StyledChartCard>
                        <StyledChartCard $autoHeight>
                            <StyledChartHeader>
                                <strong>결제수단 비중</strong>
                                <span>결제완료 기준</span>
                            </StyledChartHeader>
                            {paymentChartItems.length === 0 ? (
                                <StyledChartEmpty>결제 데이터가 없습니다.</StyledChartEmpty>
                            ) : (
                                <StyledPaymentChartWrap>
                                    <StyledDonutChart $gradient={paymentDonutGradient}>
                                        <div>
                                            <strong>{formatPrice(revenueInsights.paidTotal)}</strong>
                                            <span>결제합계</span>
                                        </div>
                                    </StyledDonutChart>
                                    <StyledLegendList>
                                        {paymentChartItems.map((item) => {
                                            const percent = revenueInsights.paidTotal > 0
                                                ? Math.round((item.total / revenueInsights.paidTotal) * 100)
                                                : 0;

                                            return (
                                                <StyledLegendItem key={item.method}>
                                                    <StyledLegendInlineLabel>
                                                        <StyledColorSwatch $color={item.color} />
                                                        <span>{item.method}</span>
                                                        <strong>{formatPrice(item.total)}</strong>
                                                        <span>{percent}%</span>
                                                    </StyledLegendInlineLabel>
                                                </StyledLegendItem>
                                            );
                                        })}
                                    </StyledLegendList>
                                </StyledPaymentChartWrap>
                            )}
                        </StyledChartCard>
                        <StyledChartCard $autoHeight>
                            <StyledChartHeader>
                                <strong>고객별 노쇼율</strong>
                                <span>기간 내 전체 예약 기준</span>
                            </StyledChartHeader>
                            <StyledOperationSummary>
                                <span>전체 노쇼 {operationInsights.totalNoshowCount}건</span>
                                <strong>{operationInsights.totalNoshowRate}%</strong>
                            </StyledOperationSummary>
                            {customerNoshowItems.length === 0 ? (
                                <StyledChartEmpty>노쇼 데이터가 없습니다.</StyledChartEmpty>
                            ) : (
                                <StyledOperationList>
                                    {customerNoshowItems.map((item) => (
                                        <StyledOperationRow key={`noshow-${item.customerId}`}>
                                            <StyledOperationLabel>
                                                {item.customer ? (
                                                    <StyledOperationCustomerButton
                                                        type="button"
                                                        onClick={() => onSelectCustomer(item.customerId)}
                                                    >
                                                        {item.customer.name}
                                                    </StyledOperationCustomerButton>
                                                ) : (
                                                    <span>고객 미지정</span>
                                                )}
                                                <small>{item.total}건 중 {item.noshow}건</small>
                                            </StyledOperationLabel>
                                            <StyledOperationRate>{item.rate}%</StyledOperationRate>
                                        </StyledOperationRow>
                                    ))}
                                </StyledOperationList>
                            )}
                        </StyledChartCard>
                        <StyledChartCard $autoHeight>
                            <StyledChartHeader>
                                <strong>디자이너별 취소율</strong>
                                <span>기간 내 전체 예약 기준</span>
                            </StyledChartHeader>
                            <StyledOperationSummary>
                                <span>전체 취소 {operationInsights.totalCancelledCount}건</span>
                                <strong>{operationInsights.totalCancelledRate}%</strong>
                            </StyledOperationSummary>
                            {designerCancellationItems.length === 0 ? (
                                <StyledChartEmpty>취소 데이터가 없습니다.</StyledChartEmpty>
                            ) : (
                                <StyledOperationList>
                                    {designerCancellationItems.map((item) => (
                                        <StyledOperationRow key={`cancel-${item.designerId ?? 'none'}`}>
                                            <StyledOperationLabel>
                                                <StyledRevenueMetaLabel>
                                                    <StyledColorSwatch $color={item.color} />
                                                    <span>{item.name}</span>
                                                </StyledRevenueMetaLabel>
                                                <small>{item.total}건 중 {item.cancelled}건</small>
                                            </StyledOperationLabel>
                                            <StyledOperationRate>{item.rate}%</StyledOperationRate>
                                        </StyledOperationRow>
                                    ))}
                                </StyledOperationList>
                            )}
                        </StyledChartCard>
                    </StyledChartGrid>
                </StyledRevenueDashboard>
            )}
            {(revenueViewTab === 'all' || revenueViewTab === 'list') && (
                <>
                    {days.length === 0 ? (
                        <StyledRevenueEmpty>매출 없음</StyledRevenueEmpty>
                    ) : (
                        <StyledList>
                            {days.map((day) => {
                                const dateParts = getShortDateParts(day.dateKey);
                                const reservations = dayReservationMap[day.dateKey] ?? [];

                                return (
                                    <StyledClickableRow
                                        key={day.dateKey}
                                        onClick={() => {
                                            setSelectedDateKey(day.dateKey);
                                            setDetailDateKey(day.dateKey);
                                        }}
                                    >
                                        <StyledDate>
                                            <StyledDateMonthDay>{dateParts.monthDay}</StyledDateMonthDay>
                                            <StyledDateYear>{dateParts.yearWeekday}</StyledDateYear>
                                        </StyledDate>
                                        <StyledRevenueRowBody>
                                            <StyledRevenueRowHead>
                                                <StyledCount>{day.count}건</StyledCount>
                                                <StyledPrice>{formatPrice(day.total)}</StyledPrice>
                                            </StyledRevenueRowHead>
                                            <StyledRevenueMetaList>
                                                {reservations.map((reservation) => (
                                                    <StyledRevenueMetaItem key={reservation.id}>
                                                        <StyledRevenueMetaLabel>
                                                            <StyledColorSwatch $color={designerMap[reservation.designerId ?? -1]?.color ?? '#D1D5DB'} />
                                                            <span>{designerMap[reservation.designerId ?? -1]?.name ?? '미지정'}</span>
                                                        </StyledRevenueMetaLabel>
                                                        <StyledCustomerName>
                                                            {isNewCustomerVisit(customerMap[reservation.customerId]?.firstVisitDate, reservation.date) && <NewCustomerBadge>N</NewCustomerBadge>}
                                                            <StyledInlineCustomerButton
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectCustomer(reservation.customerId);
                                                                }}
                                                            >
                                                                {customerMap[reservation.customerId]?.name ?? '고객 미지정'}
                                                            </StyledInlineCustomerButton>
                                                        </StyledCustomerName>
                                                        <StyledRevenueServiceName>
                                                            {parseServiceString(reservation.service).map((service) => (
                                                                <StyledRevenueServiceChip key={`${reservation.id}-${service}`}>
                                                                    <StyledColorDot $color={getServiceColor(service, serviceColorMap)} />
                                                                    <strong>{service}</strong>
                                                                </StyledRevenueServiceChip>
                                                            ))}
                                                        </StyledRevenueServiceName>
                                                    </StyledRevenueMetaItem>
                                                ))}
                                            </StyledRevenueMetaList>
                                        </StyledRevenueRowBody>
                                    </StyledClickableRow>
                                );
                            })}
                        </StyledList>
                    )}
                    <StyledRevenueSummary>
                        <span>{rangeRevenue.count}건</span>
                        <strong>{formatPrice(rangeRevenue.total)}</strong>
                    </StyledRevenueSummary>
                </>
            )}
            {openedDateKey && layerDaily && (
                <StyledLayerBackdrop onClick={() => setDetailDateKey(null)}>
                    <StyledRevenueLayer onClick={(e) => e.stopPropagation()}>
                        <StyledRevenueLayerHeader>
                            <strong>{formatDateLabel(openedDateKey)} 상세</strong>
                            <StyledLayerCloseButton type="button" onClick={() => setDetailDateKey(null)}>닫기</StyledLayerCloseButton>
                        </StyledRevenueLayerHeader>
                        {layerDaily.count === 0 ? (
                            <StyledRevenueEmpty>예약 없음</StyledRevenueEmpty>
                        ) : (
                            <StyledList>
                                {layerDaily.items.map((item) => {
                                    const reservation = (reservationMap[openedDateKey] || []).find((r) => r.id === item.reservationId);
                                    return (
                                        <StyledClickableRow
                                            key={item.reservationId}
                                            onClick={() => {
                                                if (!reservation) return;
                                                onSelectReservation(reservation);
                                            }}
                                        >
                                            <StyledTime>{item.startTime}</StyledTime>
                                            <StyledRevenueRowBody>
                                                <StyledRevenueMetaList>
                                                    <StyledRevenueMetaItem>
                                                        <StyledRevenueMetaLabel>
                                                            <StyledColorSwatch $color={designerMap[reservation?.designerId ?? -1]?.color ?? '#D1D5DB'} />
                                                            <span>{designerMap[reservation?.designerId ?? -1]?.name ?? '미지정'}</span>
                                                        </StyledRevenueMetaLabel>
                                                        <StyledCustomerName>
                                                            {reservation && isNewCustomerVisit(customerMap[reservation.customerId]?.firstVisitDate, reservation.date) && <NewCustomerBadge>N</NewCustomerBadge>}
                                                            <StyledInlineCustomerButton
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!reservation) return;
                                                                    onSelectCustomer(reservation.customerId);
                                                                }}
                                                            >
                                                                {customerMap[reservation?.customerId ?? -1]?.name ?? '고객 미지정'}
                                                            </StyledInlineCustomerButton>
                                                        </StyledCustomerName>
                                                        <StyledRevenueServiceName>
                                                            {parseServiceString(item.service).map((service) => (
                                                                <StyledRevenueServiceChip key={`${item.reservationId}-${service}`}>
                                                                    <StyledColorDot $color={getServiceColor(service, serviceColorMap)} />
                                                                    <strong>{service}</strong>
                                                                </StyledRevenueServiceChip>
                                                            ))}
                                                        </StyledRevenueServiceName>
                                                    </StyledRevenueMetaItem>
                                                </StyledRevenueMetaList>
                                            </StyledRevenueRowBody>
                                            <StyledPrice>{formatPrice(item.price)}</StyledPrice>
                                        </StyledClickableRow>
                                    );
                                })}
                            </StyledList>
                        )}
                        <StyledSummary>
                            <span>{layerDaily.count}건</span>
                            <strong>{formatPrice(layerDaily.total)}</strong>
                        </StyledSummary>
                    </StyledRevenueLayer>
                </StyledLayerBackdrop>
            )}
            {metricLayer && modalRoot && createPortal(
                <StyledMetricOverlay onClick={() => setMetricLayerKey(null)}
                                     role="dialog"
                                     aria-modal="true"
                                     aria-label={metricLayer.title}
                                     id={layerId}
                                     data-layer-id={layerDataId}>
                    <StyledMetricModal ref={metricDialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                        <StyledHeader>
                            <div>
                                <h3>{metricLayer.title}</h3>
                                {(metricLayerKey === 'new' || metricLayerKey === 'returning') && (
                                    <StyledMetricSubtitle>
                                        {metricLayerKey === 'new'
                                            ? `${revenueFilterMode === 'completed' ? '선택 기간 안에서 첫 예약완료가 발생한 고객 목록' : '선택 기간 안에서 첫 예약이 발생한 고객 목록'}`
                                            : `${revenueFilterMode === 'completed' ? '선택 기간 내 예약완료가 있고, 그 이전 예약완료 이력이 있는 고객 목록' : '선택 기간 내 예약이 있고, 그 이전 예약 이력이 있는 고객 목록'}`}
                                    </StyledMetricSubtitle>
                                )}
                            </div>
                            <button type="button" onClick={() => setMetricLayerKey(null)} aria-label="닫기">닫기</button>
                        </StyledHeader>
                        <StyledMetricBody>
                            {metricLayerKey === 'new' || metricLayerKey === 'returning' ? (
                                metricLayer.customers.length === 0 ? (
                                    <StyledRevenueEmpty>내역이 없습니다.</StyledRevenueEmpty>
                                ) : (
                                    <StyledList>
                                        {metricLayer.customers.map((item) => (
                                            <StyledClickableRow
                                                key={`${metricLayerKey}-customer-${item.customer.id}`}
                                                onClick={() => onSelectCustomer(item.customer.id)}
                                            >
                                                <StyledTime>
                                                    <StyledCustomerName>
                                                        {metricLayerKey === 'new' && <NewCustomerBadge>N</NewCustomerBadge>}
                                                        <span>{item.customer.name}</span>
                                                    </StyledCustomerName>
                                                </StyledTime>
                                                <StyledRevenueRowBody>
                                                    <StyledRevenueMetaList>
                                                        <StyledRevenueMetaItem>
                                                            <StyledCustomerInfoGrid>
                                                                <span><strong>이름</strong>{item.customer.name}</span>
                                                                <span><strong>연락처</strong>{item.customer.tel}</span>
                                                                <span><strong>적립금</strong>{formatPrice(item.customer.points ?? 0)}</span>
                                                                <span><strong>방문일</strong>{item.visitDate}</span>
                                                            </StyledCustomerInfoGrid>
                                                        </StyledRevenueMetaItem>
                                                    </StyledRevenueMetaList>
                                                </StyledRevenueRowBody>
                                            </StyledClickableRow>
                                        ))}
                                    </StyledList>
                                )
                            ) : metricLayer.reservations.length === 0 ? (
                                <StyledRevenueEmpty>내역이 없습니다.</StyledRevenueEmpty>
                            ) : (
                                <StyledList>
                                    {metricLayer.reservations.map((reservation) => (
                                        <StyledClickableRow
                                            key={`${metricLayerKey}-${reservation.id}`}
                                            onClick={() => onSelectReservation(reservation)}
                                        >
                                            <StyledTime>{reservation.date} {reservation.startTime}</StyledTime>
                                            <StyledRevenueRowBody>
                                                <StyledRevenueMetaList>
                                                    <StyledRevenueMetaItem>
                                                        <StyledRevenueMetaLabel>
                                                            <StyledColorSwatch $color={designerMap[reservation.designerId ?? -1]?.color ?? '#D1D5DB'} />
                                                            <span>{designerMap[reservation.designerId ?? -1]?.name ?? '미지정'}</span>
                                                        </StyledRevenueMetaLabel>
                                                        <StyledCustomerName>
                                                            {isNewCustomerVisit(customerMap[reservation.customerId]?.firstVisitDate, reservation.date) && <NewCustomerBadge>N</NewCustomerBadge>}
                                                            <StyledInlineCustomerButton
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectCustomer(reservation.customerId);
                                                                }}
                                                            >
                                                                {customerMap[reservation.customerId]?.name ?? '고객 미지정'}
                                                            </StyledInlineCustomerButton>
                                                        </StyledCustomerName>
                                                        <StyledRevenueServiceName>
                                                            {parseServiceString(reservation.service).map((service) => (
                                                                <StyledRevenueServiceChip key={`${metricLayerKey}-${reservation.id}-${service}`}>
                                                                    <StyledColorDot $color={getServiceColor(service, serviceColorMap)} />
                                                                    <strong>{service}</strong>
                                                                </StyledRevenueServiceChip>
                                                            ))}
                                                        </StyledRevenueServiceName>
                                                    </StyledRevenueMetaItem>
                                                </StyledRevenueMetaList>
                                            </StyledRevenueRowBody>
                                            <StyledPrice>{formatPrice(reservation.price ?? 0)}</StyledPrice>
                                        </StyledClickableRow>
                                    ))}
                                </StyledList>
                            )}
                        </StyledMetricBody>
                        <StyledFooter>
                            <span>{metricLayer.summary}</span>
                            <StyledActionButton type="button" onClick={() => setMetricLayerKey(null)}>닫기</StyledActionButton>
                        </StyledFooter>
                    </StyledMetricModal>
                </StyledMetricOverlay>,
                modalRoot
            )}
        </>
    );
};

const compactInputStyle = css`
    ${formControlStyle};
`;

const actionButtonStyle = css`
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;

    &:hover {
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
    }
`;

const mobileStretchButtonStyle = css`
    @media (max-width: 640px) {
        flex: 1;
    }
`;

const StyledRevenueStickyArea = styled.div`
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--white-color);
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledRangeFilter = styled.div`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr) auto;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 0;

    @media (max-width: 640px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const StyledRangeInputWrap = styled.label`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledDateInput = styled.input`
    width: 100%;
    appearance: none;
    ${compactInputStyle};
    padding: 0 8px;
`;

const StyledRangeDivider = styled.span`
    flex-shrink: 0;
    padding-bottom: 6px;
    font-size: 12px;
    color: var(--dark-gray-color2);

    @media (max-width: 640px) {
        display: none;
    }
`;

const StyledRangeNavButton = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: var(--white-color);
    color: var(--dark-gray-color);
    white-space: nowrap;

    @media (max-width: 640px) {
        order: 1;
    }
`;

const StyledQuickFilters = styled.div`
    display: flex;
    gap: 6px;
    padding: 8px 0 0;
`;

const StyledQuickFilterButton = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 13px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
`;

const StyledDesignerTabs = styled.div`
    display: flex;
    gap: 6px;
    padding: 8px 0;
    overflow-x: auto;
    overscroll-behavior: auto;
`;

const StyledDesignerTab = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    ${actionButtonStyle};
    min-height: 30px;
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 14px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
`;

const StyledRevenueViewTabs = styled.div`
    display: flex;
    gap: 6px;
    padding: 0 0 8px;
`;

const StyledRevenueFilterTabs = styled.div`
    display: flex;
    gap: 6px;
    padding: 0 0 8px;
    overflow-x: auto;
    overscroll-behavior: auto;
`;

const StyledRevenueFilterTab = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    ${actionButtonStyle};
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 14px;
    background: ${(p) => p.$active ? 'rgba(45, 127, 249, 0.1)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    font-weight: ${(p) => p.$active ? 700 : 500};
`;

const StyledRevenueCriteria = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 0 10px;

    strong {
        font-size: 11px;
        color: var(--dark-gray-color);
    }

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
        line-height: 1.45;
    }
`;

const StyledRevenueViewTab = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid ${(p) => p.$active ? 'var(--black-color)' : 'var(--light-gray-color)'};
    background: ${(p) => p.$active ? 'var(--black-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
`;

const StyledRevenueDashboard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0;
`;

const StyledKpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 1080px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledKpiCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: 14px;
    background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 18px;
        color: var(--black-color);
        cursor: pointer;
    }
`;

const StyledMetricOverlay = styled(StyledOverlay)`
    z-index: 180;
`;

const StyledMetricModal = styled(StyledDetail)`
    width: min(100%, 720px);
`;

const StyledMetricBody = styled.div`
    max-height: min(60vh, 560px);
    overflow-y: auto;
    padding: 16px;
`;

const StyledMetricSubtitle = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
    font-weight: 500;
`;

const StyledCustomerInfoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
    width: 100%;

    span {
        display: flex;
        gap: 6px;
        font-size: 12px;
        color: var(--dark-gray-color);
    }

    strong {
        color: var(--dark-gray-color2);
        font-weight: 600;
    }

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledChartGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 1080px) {
        grid-template-columns: 1fr;
    }
`;

const StyledChartCard = styled.div<{ $hero?: boolean; $autoHeight?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: ${(props) => props.$autoHeight ? 'auto' : props.$hero ? '320px' : '250px'};
    align-self: ${(props) => props.$autoHeight ? 'start' : 'stretch'};
    padding: 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: 16px;
    background: var(--white-color);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);

    ${(props) => props.$hero && `
        grid-column: span 2;
    `}

    @media (max-width: 1080px) {
        grid-column: span 1;
    }
`;

const StyledChartHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    strong {
        font-size: 14px;
        color: var(--black-color);
    }

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
        text-align: right;
    }
`;

const StyledChartEmpty = styled.div`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: var(--gray-color2);
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledOperationSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #f6f8fc;

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 18px;
        color: var(--black-color);
    }
`;

const StyledOperationList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledOperationRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 12px;
    background: var(--white-color);
`;

const StyledOperationLabel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    span {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 600;
    }

    small {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }
`;

const StyledOperationCustomerButton = styled.button`
    border: 0;
    padding: 0;
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
    text-align: left;
    cursor: pointer;
`;

const StyledOperationRate = styled.strong`
    flex-shrink: 0;
    font-size: 16px;
    color: var(--blue-color);
`;

const StyledLineChartBox = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 236px;
    padding: 14px 16px 4px;
    border: 1px solid rgba(45, 127, 249, 0.08);
    border-radius: 18px;
    background:
        radial-gradient(circle at top right, rgba(45, 127, 249, 0.12), transparent 28%),
        linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
`;

const StyledChartTooltip = styled.div<{ $leftRatio: number; $topRatio: number }>`
    position: absolute;
    left: ${(props) => `clamp(84px, calc(74px + (${props.$leftRatio} * (100% - 74px)) - 58px), calc(100% - 132px))`};
    top: ${(props) => `max(10px, calc(14px + (${props.$topRatio} * 190px) - 58px))`};
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 116px;
    padding: 9px 11px;
    border: 1px solid rgba(45, 127, 249, 0.14);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(6px);
    transform: translateZ(0);

    &::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -6px;
        width: 10px;
        height: 10px;
        background: rgba(255, 255, 255, 0.96);
        border-right: 1px solid rgba(45, 127, 249, 0.14);
        border-bottom: 1px solid rgba(45, 127, 249, 0.14);
        transform: translateX(-50%) rotate(45deg);
    }

    strong {
        font-size: 11px;
        color: var(--dark-gray-color2);
        font-weight: 600;
    }

    span {
        font-size: 13px;
        font-weight: 800;
        color: var(--blue-color);
    }
`;

const StyledLineChartFrame = styled.div`
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 10px;
    align-items: stretch;
    flex: 1;
    min-height: 0;
`;

const StyledYAxis = styled.div`
    position: relative;
    height: 190px;

    span {
        position: absolute;
        left: 0;
        font-size: 11px;
        color: var(--dark-gray-color2);
        line-height: 1;
    }

    .top {
        top: 0;
        transform: translateY(-50%);
    }

    .middle {
        top: 50%;
        transform: translateY(-50%);
    }

    .bottom {
        top: 100%;
        transform: translateY(-50%);
    }
`;

const StyledLineChartStage = styled.div`
    position: relative;
    height: 190px;
    border-radius: 14px;
    overflow: hidden;
    line-height: 0;
`;

const StyledChartHorizontalGuide = styled.div<{ $topRatio: number }>`
    position: absolute;
    left: 0;
    right: 0;
    top: ${(props) => `${props.$topRatio * 100}%`};
    height: 1px;
    background: rgba(15, 23, 42, 0.06);
    transform: translateY(-50%);
    pointer-events: none;
`;

const StyledLineChart = styled.svg`
    display: block;
    width: 100%;
    height: 190px;
    overflow: visible;
`;

const StyledChartGuide = styled.div<{ $leftRatio: number }>`
    position: absolute;
    top: 0;
    bottom: 0;
    left: ${(props) => `${props.$leftRatio * 100}%`};
    width: 1px;
    border-left: 1px dashed rgba(45, 127, 249, 0.2);
    transform: translateX(-50%);
    pointer-events: none;
`;

const StyledChartPointHalo = styled.div<{ $leftRatio: number; $topRatio: number }>`
    position: absolute;
    left: ${(props) => `${props.$leftRatio * 100}%`};
    top: ${(props) => `${props.$topRatio * 100}%`};
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(45, 127, 249, 0.14);
    transform: translate(-50%, -50%);
    pointer-events: none;
`;

const StyledChartPointButton = styled.button<{ $active: boolean; $leftRatio: number; $topRatio: number }>`
    position: absolute;
    left: ${(props) => `${props.$leftRatio * 100}%`};
    top: ${(props) => `${props.$topRatio * 100}%`};
    width: ${(props) => props.$active ? '10px' : '7px'};
    height: ${(props) => props.$active ? '10px' : '7px'};
    padding: 0;
    border: 2px solid #fff;
    border-radius: 50%;
    background: ${(props) => props.$active ? 'var(--orange-color)' : 'var(--blue-color)'};
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.14);
    transform: translate(-50%, -50%);
    cursor: pointer;
`;

const StyledChartAxis = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--dark-gray-color2);
    margin-top: -2px;
    padding-left: 74px;
`;

const StyledBarChartList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledBarRow = styled.div<{ $valueWidthCh: number }>`
    display: grid;
    grid-template-columns: minmax(0, 88px) minmax(0, 1fr) minmax(${(props) => `${props.$valueWidthCh}ch`}, max-content);
    align-items: center;
    gap: 10px;
`;

const StyledBarLabel = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    color: var(--dark-gray-color);

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const StyledColorSwatch = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(props) => props.$color};
`;

const StyledBarTrack = styled.div`
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: #edf2f7;
    overflow: hidden;
`;

const StyledBarFill = styled.div<{ $color: string; $width: number }>`
    width: ${(props) => `${props.$width}%`};
    height: 100%;
    border-radius: inherit;
    background: ${(props) => props.$color};
`;

const StyledBarValue = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledPaymentChartWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
`;

const StyledDonutChart = styled.div<{ $gradient: string }>`
    position: relative;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: ${(props) => props.$gradient};

    &::after {
        content: '';
        position: absolute;
        inset: 22px;
        border-radius: 50%;
        background: var(--white-color);
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
    }

    > div {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        text-align: center;
    }

    strong {
        font-size: 14px;
        color: var(--black-color);
    }

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }
`;

const StyledLegendList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
`;

const StyledLegendItem = styled.div`
    display: inline-flex;
`;

const StyledLegendInlineLabel = styled.div`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 999px;
    background: var(--white-color);

    strong {
        font-size: 12px;
        color: var(--black-color);
    }

    > span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }
`;

const StyledList = styled.div`
    padding: 0 16px;
`;

const StyledClickableRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--black-color-10);
    cursor: pointer;

    &:hover {
        background-color: var(--black-color-10);
    }
`;

const StyledTime = styled.span`
    flex-shrink: 0;
    width: 40px;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledDate = styled.span`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    width: 96px;
`;

const StyledDateMonthDay = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color);
    font-weight: 500;
`;

const StyledDateYear = styled.span`
    font-size: 10px;
    color: var(--dark-gray-color2);
`;

const StyledCount = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledRevenueRowBody = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledRevenueRowHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const StyledRevenueMetaList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const StyledRevenueMetaItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 11px;
    color: var(--dark-gray-color2);

    span {
        flex-shrink: 0;
    }
`;

const StyledRevenueMetaLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: var(--dark-gray-color2);
`;

const StyledCustomerName = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
`;

const StyledInlineCustomerButton = styled.button`
    min-width: 0;
    border: 0;
    padding: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const StyledRevenueServiceName = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex-wrap: wrap;
`;

const StyledRevenueServiceChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;

    strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        font-weight: 500;
        color: var(--dark-gray-color);
    }
`;

const StyledColorDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(p) => p.$color};
    align-self: center;
`;

const StyledPrice = styled.span`
    flex-shrink: 0;
    margin-left: auto;
    font-weight: 500;
    color: var(--black-color);
`;

const StyledSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-top: 1px solid var(--light-gray-color);
    font-size: 14px;
    color: var(--dark-gray-color);

    strong {
        font-size: 16px;
        color: var(--blue-color);
    }
`;

const StyledRevenueSummary = styled(StyledSummary)`
    position: sticky;
    bottom: 0;
    z-index: 2;
    background: var(--white-color);
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    margin-top: 8px;
    box-shadow: 0 -8px 18px rgba(0, 0, 0, 0.06);
`;

const StyledRevenueEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledLayerBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
`;

const StyledRevenueLayer = styled.div`
    width: min(560px, 100%);
    max-height: 80vh;
    overflow-y: auto;
    background: var(--white-color);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
`;

const StyledRevenueLayerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--light-gray-color);
    font-size: 14px;
    color: var(--dark-gray-color);
`;

const StyledLayerCloseButton = styled.button`
    border: 1px solid var(--light-gray-color);
    background: var(--white-color);
    color: var(--dark-gray-color);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
`;
