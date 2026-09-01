import {useRef, useState} from 'react';

import {formatPrice} from '../../../utils/services';
import type {CustomerMap} from '../../../utils/customers';
import {compareAssigneeName} from '../../../utils/assignees';
import {useStoreLabels} from '../../../hooks/useStoreLabels';
import {EMPTY_TEXT} from '../settings-styles';
import {StyledColorSwatch} from './revenue-styles';
import {
    StyledChartGrid, StyledChartCard, StyledChartHeader, StyledChartEmpty,
    StyledChartHeaderTitle, StyledChartHeaderMeta,
    StyledTrendChartBox, StyledChartTooltip, StyledTrendChartFrame, StyledYAxis,
    REVENUE_TOOLTIP_WIDTH,
    StyledChartTooltipLabel, StyledChartTooltipValue, StyledYAxisLabel,
    StyledTrendChartStage, StyledTrendScrollContent, StyledTrendChartTrack, StyledChartHorizontalGuide,
    StyledTrendColumn, StyledTrendColumnFill, StyledChartAxis,
    StyledBarChartList, StyledBarRow, StyledBarHeaderRow, StyledBarLabel,
    StyledBarLabelText, StyledBarValue, StyledBarTrack, StyledBarFill,
    StyledShareSection, StyledShareSectionTitle, StyledShareBar, StyledShareSegment,
    StyledShareLegend, StyledShareLegendItem, StyledShareLegendItemValue,
    StyledDonutColumnWrap, StyledPaymentChartWrap, StyledDonutChart,
    StyledDonutChartCenter, StyledDonutChartValue, StyledDonutChartLabel,
    StyledLegendList, StyledLegendItem, StyledLegendInlineLabel,
    StyledLegendInlineLabelStrong, StyledLegendInlineLabelText,
    StyledOperationSummary, StyledOperationList, StyledClickableOperationRow,
    StyledOperationSummaryLabel, StyledOperationSummaryValue,
    StyledOperationLabel, StyledChartRevenueMetaLabel,
    StyledOperationLabelName, StyledOperationLabelSub,
    StyledOperationCustomerButton, StyledOperationRate,
} from './revenue-chart-styles';

interface ChartPoint {
    dateKey: string;
    total: number;
}

/** 화면에 떠 있는 툴팁 — 위치는 막대를 실제로 재서 담는다. */
interface TrendTooltip {
    dateKey: string;
    total: number;
    left: number;
    top: number;
    arrowLeft: number;
}

interface PaymentChartItem {
    method: string;
    total: number;
    color: string;
}

interface AssigneeChartItem {
    assigneeId: number | null;
    total: number;
    count: number;
    name: string;
    color: string;
}

interface AssigneeCancellationItem {
    assigneeId: number | null;
    total: number;
    cancelled: number;
    rate: number;
    name: string;
    color: string;
}

interface CustomerNoshowItem {
    customerId: number;
    total: number;
    noshow: number;
    rate: number;
    customer: CustomerMap[number] | undefined;
}

interface ChannelChartItem {
    channel: string;
    count: number;
    color: string;
}

export type ChartDetailKey =
    | {kind: 'date'; dateKey: string}
    | {kind: 'payment'; method: string}
    | {kind: 'assignee'; assigneeId: number}
    | {kind: 'cancellation'; assigneeId: number | null}
    | {kind: 'noshow'; customerId: number}
    | {kind: 'channel'; channel: string};

interface RevenueChartGridProps {
    fromDateKey: string;
    toDateKeyValue: string;
    assigneeKey: string;
    chartPoints: ChartPoint[];
    chartMax: number;
    paidTotal: number;
    paymentDonutGradient: string;
    paymentChartItems: PaymentChartItem[];
    assigneeChartItems: AssigneeChartItem[];
    assigneeCancellationItems: AssigneeCancellationItem[];
    customerNoshowItems: CustomerNoshowItem[];
    totalCancelledCount: number;
    totalCancelledRate: number;
    totalNoshowCount: number;
    totalNoshowRate: number;
    channelChartItems: ChannelChartItem[];
    channelDonutGradient: string;
    channelTotalCount: number;
    onSelectCustomer: (customerId: number) => void;
    onChartDetailClick: (key: ChartDetailKey) => void;
}

export const RevenueChartGrid = ({
    fromDateKey,
    toDateKeyValue,
    assigneeKey,
    chartPoints,
    chartMax,
    paidTotal,
    paymentDonutGradient,
    paymentChartItems,
    assigneeChartItems,
    assigneeCancellationItems,
    customerNoshowItems,
    totalCancelledCount,
    totalCancelledRate,
    totalNoshowCount,
    totalNoshowRate,
    channelChartItems,
    channelDonutGradient,
    channelTotalCount,
    onSelectCustomer,
    onChartDetailClick,
}: RevenueChartGridProps) => {
    const labels = useStoreLabels();
    const trendBoxRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<TrendTooltip | null>(null);
    // 매출이 0뿐인 기간도 빈 상태로 — 막대가 하나도 없는 빈 격자에 축만 "1원"(Math.max(…,1))으로 남는다.
    const hasTrend = chartPoints.some((item) => item.total > 0);

    // 툴팁을 막대 중앙·상단에 맞춘다. 비율로 추정하면 툴팁 폭(140px)만큼 어긋나 실제로 가장자리에서 60px 벌어졌다.
    const showTooltip = (point: ChartPoint, column: HTMLElement) => {
        const box = trendBoxRef.current;
        if (!box) return;
        const boxRect = box.getBoundingClientRect();
        const columnRect = column.getBoundingClientRect();
        const fillRect = column.firstElementChild?.getBoundingClientRect();
        const center = columnRect.left + columnRect.width / 2 - boxRect.left;
        // 박스를 벗어나지 않게 가둔다(가장자리 막대). 화살표는 막대 쪽에 남는다.
        const left = Math.min(Math.max(center - REVENUE_TOOLTIP_WIDTH / 2, 0), Math.max(boxRect.width - REVENUE_TOOLTIP_WIDTH, 0));
        const barTop = (fillRect?.top ?? columnRect.bottom) - boxRect.top;
        setTooltip({
            dateKey: point.dateKey,
            total: point.total,
            left,
            arrowLeft: center - left,
            // 막대가 높아도 툴팁이 카드 위로 넘치지 않게. 62 = 툴팁 높이 + 여백 어림값(가둘 때만 쓴다).
            top: Math.max(barTop, 62),
        });
    };
    const hideTooltip = (dateKey: string) => setTooltip((c) => c?.dateKey === dateKey ? null : c);

    return (
        <StyledChartGrid>
            {/* Trend bar chart */}
            <StyledChartCard $hero>
                <StyledChartHeader>
                    <StyledChartHeaderTitle>기간별 매출 추이</StyledChartHeaderTitle>
                    <StyledChartHeaderMeta>{fromDateKey} ~ {toDateKeyValue}</StyledChartHeaderMeta>
                </StyledChartHeader>
                {!hasTrend ? (
                    <StyledChartEmpty>{EMPTY_TEXT}</StyledChartEmpty>
                ) : (
                    <>
                        <StyledTrendChartBox ref={trendBoxRef}>
                            {tooltip && (
                                <StyledChartTooltip $left={tooltip.left} $top={tooltip.top} $arrowLeft={tooltip.arrowLeft}>
                                    <StyledChartTooltipLabel>{tooltip.dateKey}</StyledChartTooltipLabel>
                                    <StyledChartTooltipValue>{formatPrice(tooltip.total)}</StyledChartTooltipValue>
                                </StyledChartTooltip>
                            )}
                            <StyledTrendChartFrame>
                                <StyledYAxis>
                                    <StyledYAxisLabel className="top">{formatPrice(chartMax)}</StyledYAxisLabel>
                                    <StyledYAxisLabel className="middle">{formatPrice(Math.round(chartMax / 2))}</StyledYAxisLabel>
                                    <StyledYAxisLabel className="bottom">{formatPrice(0)}</StyledYAxisLabel>
                                </StyledYAxis>
                                <StyledTrendChartStage>
                                    <StyledTrendScrollContent>
                                        <StyledTrendChartTrack $count={chartPoints.length}>
                                            <StyledChartHorizontalGuide $topRatio={0} />
                                            <StyledChartHorizontalGuide $topRatio={0.5} />
                                            <StyledChartHorizontalGuide $topRatio={1} />
                                            {chartPoints.map((item) => {
                                                const isActive = tooltip?.dateKey === item.dateKey;
                                                return (
                                                    <StyledTrendColumn
                                                        key={item.dateKey}
                                                        type="button"
                                                        aria-label={`${item.dateKey} ${formatPrice(item.total)}`}
                                                        onMouseEnter={(e) => showTooltip(item, e.currentTarget)}
                                                        onMouseLeave={() => hideTooltip(item.dateKey)}
                                                        onFocus={(e) => showTooltip(item, e.currentTarget)}
                                                        onBlur={() => hideTooltip(item.dateKey)}
                                                        onClick={() => onChartDetailClick({kind: 'date', dateKey: item.dateKey})}
                                                        $active={isActive}
                                                    >
                                                        <StyledTrendColumnFill
                                                            $heightRatio={item.total / chartMax}
                                                            $active={isActive}
                                                        />
                                                    </StyledTrendColumn>
                                                );
                                            })}
                                        </StyledTrendChartTrack>
                                        <StyledChartAxis>
                                            <span>{fromDateKey.slice(5)}</span>
                                            <span>{toDateKeyValue.slice(5)}</span>
                                        </StyledChartAxis>
                                    </StyledTrendScrollContent>
                                </StyledTrendChartStage>
                            </StyledTrendChartFrame>
                        </StyledTrendChartBox>
                    </>
                )}
            </StyledChartCard>

            {/* Payment donut */}
            <StyledChartCard $autoHeight $hero>
                <StyledChartHeader>
                    <StyledChartHeaderTitle>결제수단 비중</StyledChartHeaderTitle>
                    <StyledChartHeaderMeta>결제완료 기준</StyledChartHeaderMeta>
                </StyledChartHeader>
                {paymentChartItems.length === 0 ? (
                    <StyledChartEmpty>{EMPTY_TEXT}</StyledChartEmpty>
                ) : (
                    <StyledPaymentChartWrap>
                        <StyledDonutChart $gradient={paymentDonutGradient}>
                            <StyledDonutChartCenter>
                                <StyledDonutChartValue>{formatPrice(paidTotal)}</StyledDonutChartValue>
                                <StyledDonutChartLabel>결제합계</StyledDonutChartLabel>
                            </StyledDonutChartCenter>
                        </StyledDonutChart>
                        <StyledLegendList>
                            {paymentChartItems.map((item) => {
                                const percent = paidTotal > 0 ? Math.round((item.total / paidTotal) * 100) : 0;
                                return (
                                    <StyledLegendItem
                                        key={item.method}
                                        onClick={() => onChartDetailClick({kind: 'payment', method: item.method})}
                                    >
                                        <StyledLegendInlineLabel>
                                            <StyledColorSwatch $color={item.color} />
                                            <StyledLegendInlineLabelText>{item.method}</StyledLegendInlineLabelText>
                                            <StyledLegendInlineLabelStrong>{formatPrice(item.total)}</StyledLegendInlineLabelStrong>
                                            <StyledLegendInlineLabelText>{percent}%</StyledLegendInlineLabelText>
                                        </StyledLegendInlineLabel>
                                    </StyledLegendItem>
                                );
                            })}
                        </StyledLegendList>
                    </StyledPaymentChartWrap>
                )}
            </StyledChartCard>

            {/* Channel donut */}
            <StyledChartCard>
                <StyledChartHeader>
                    <StyledChartHeaderTitle>예약비중</StyledChartHeaderTitle>
                    <StyledChartHeaderMeta>전화 · 방문 · 네이버</StyledChartHeaderMeta>
                </StyledChartHeader>
                {channelTotalCount === 0 ? (
                    <StyledChartEmpty>{EMPTY_TEXT}</StyledChartEmpty>
                ) : (
                    <StyledDonutColumnWrap>
                        <StyledDonutChart $gradient={channelDonutGradient}>
                            <StyledDonutChartCenter>
                                <StyledDonutChartValue>{channelTotalCount}건</StyledDonutChartValue>
                                <StyledDonutChartLabel>전체예약</StyledDonutChartLabel>
                            </StyledDonutChartCenter>
                        </StyledDonutChart>
                        <StyledLegendList>
                            {channelChartItems.map((item) => {
                                const percent = channelTotalCount > 0 ? Math.round((item.count / channelTotalCount) * 100) : 0;
                                return (
                                    <StyledLegendItem
                                        key={item.channel}
                                        onClick={() => onChartDetailClick({kind: 'channel', channel: item.channel})}
                                    >
                                        <StyledLegendInlineLabel>
                                            <StyledColorSwatch $color={item.color} />
                                            <StyledLegendInlineLabelText>{item.channel}</StyledLegendInlineLabelText>
                                            <StyledLegendInlineLabelStrong>{item.count}건</StyledLegendInlineLabelStrong>
                                            <StyledLegendInlineLabelText>{percent}%</StyledLegendInlineLabelText>
                                        </StyledLegendInlineLabel>
                                    </StyledLegendItem>
                                );
                            })}
                        </StyledLegendList>
                    </StyledDonutColumnWrap>
                )}
            </StyledChartCard>

            {/* Assignee bar */}
            <StyledChartCard>
                <StyledChartHeader>
                    <StyledChartHeaderTitle>{labels.assignee}별 매출</StyledChartHeaderTitle>
                    <StyledChartHeaderMeta>{assigneeKey === 'all' ? '전체 기준' : '선택 담당자 기준'}</StyledChartHeaderMeta>
                </StyledChartHeader>
                {assigneeChartItems.length === 0 ? (
                    <StyledChartEmpty>{EMPTY_TEXT}</StyledChartEmpty>
                ) : (
                    <>
                        {(() => {
                            const sumTotal = assigneeChartItems.reduce((sum, e) => sum + e.total, 0);
                            const withPct = [...assigneeChartItems]
                                .map((item) => ({...item, pct: sumTotal > 0 ? (item.total / sumTotal) * 100 : 0}))
                                .sort((a, b) => compareAssigneeName(a.name, b.name));
                            return (
                                <StyledShareSection>
                                    <StyledShareSectionTitle>전체비율</StyledShareSectionTitle>
                                    <StyledShareLegend>
                                        {withPct.map((item) => (
                                            <StyledShareLegendItem key={`legend-${item.assigneeId ?? 'none'}`}>
                                                <StyledColorSwatch $color={item.color} />
                                                <span>{item.name}</span>
                                                <StyledShareLegendItemValue>{Math.round(item.pct)}%</StyledShareLegendItemValue>
                                            </StyledShareLegendItem>
                                        ))}
                                    </StyledShareLegend>
                                    <StyledShareBar>
                                        {withPct.filter((item) => item.pct > 0).map((item) => (
                                            <StyledShareSegment key={`share-${item.assigneeId ?? 'none'}`} $color={item.color} $width={item.pct} title={`${item.name} ${Math.round(item.pct)}%`} />
                                        ))}
                                    </StyledShareBar>
                                </StyledShareSection>
                            );
                        })()}
                        <StyledBarChartList>
                            {[...assigneeChartItems].sort((a, b) => compareAssigneeName(a.name, b.name)).map((item) => {
                                const sumTotal = assigneeChartItems.reduce((sum, e) => sum + e.total, 0) || 1;
                                const barRatio = (item.total / sumTotal) * 100;
                                return (
                                    <StyledBarRow
                                        key={`${item.assigneeId ?? 'none'}-${item.name}`}
                                        onClick={() => item.assigneeId != null && onChartDetailClick({kind: 'assignee', assigneeId: item.assigneeId})}
                                        style={item.assigneeId != null ? {cursor: 'pointer'} : undefined}
                                    >
                                        <StyledBarHeaderRow>
                                            <StyledBarLabel>
                                                <StyledColorSwatch $color={item.color} />
                                                <StyledBarLabelText>{item.name}</StyledBarLabelText>
                                            </StyledBarLabel>
                                            <StyledBarValue>{formatPrice(item.total)}</StyledBarValue>
                                        </StyledBarHeaderRow>
                                        <StyledBarTrack>
                                            <StyledBarFill $color={item.color} $width={barRatio} />
                                        </StyledBarTrack>
                                    </StyledBarRow>
                                );
                            })}
                        </StyledBarChartList>
                    </>
                )}
            </StyledChartCard>

            {/* Cancellation rate */}
            <StyledChartCard>
                <StyledChartHeader>
                    <StyledChartHeaderTitle>{labels.assignee}별 취소율</StyledChartHeaderTitle>
                    <StyledChartHeaderMeta>기간 내 전체 예약 기준</StyledChartHeaderMeta>
                </StyledChartHeader>
                <StyledOperationSummary>
                    <StyledOperationSummaryLabel>전체 취소 {totalCancelledCount}건</StyledOperationSummaryLabel>
                    <StyledOperationSummaryValue>{totalCancelledRate}%</StyledOperationSummaryValue>
                </StyledOperationSummary>
                {assigneeCancellationItems.length === 0 ? (
                    <StyledChartEmpty>{EMPTY_TEXT}</StyledChartEmpty>
                ) : (
                    <StyledOperationList>
                        {[...assigneeCancellationItems].sort((a, b) => compareAssigneeName(a.name, b.name)).map((item) => (
                            <StyledClickableOperationRow
                                key={`cancel-${item.assigneeId ?? 'none'}`}
                                onClick={() => onChartDetailClick({kind: 'cancellation', assigneeId: item.assigneeId})}
                            >
                                <StyledOperationLabel>
                                    <StyledChartRevenueMetaLabel>
                                        <StyledColorSwatch $color={item.color} />
                                        <StyledOperationLabelName>{item.name}</StyledOperationLabelName>
                                    </StyledChartRevenueMetaLabel>
                                    <StyledOperationLabelSub>{item.total}건 중 {item.cancelled}건</StyledOperationLabelSub>
                                </StyledOperationLabel>
                                <StyledOperationRate>{item.rate}%</StyledOperationRate>
                            </StyledClickableOperationRow>
                        ))}
                    </StyledOperationList>
                )}
            </StyledChartCard>

            {/* Noshow rate */}
            <StyledChartCard>
                <StyledChartHeader>
                    <StyledChartHeaderTitle>고객별 노쇼율</StyledChartHeaderTitle>
                    <StyledChartHeaderMeta>기간 내 전체 예약 기준</StyledChartHeaderMeta>
                </StyledChartHeader>
                <StyledOperationSummary>
                    <StyledOperationSummaryLabel>전체 노쇼 {totalNoshowCount}건</StyledOperationSummaryLabel>
                    <StyledOperationSummaryValue>{totalNoshowRate}%</StyledOperationSummaryValue>
                </StyledOperationSummary>
                {customerNoshowItems.length === 0 ? (
                    <StyledChartEmpty>{EMPTY_TEXT}</StyledChartEmpty>
                ) : (
                    <StyledOperationList>
                        {customerNoshowItems.map((item) => (
                            <StyledClickableOperationRow
                                key={`noshow-${item.customerId}`}
                                onClick={() => onChartDetailClick({kind: 'noshow', customerId: item.customerId})}
                            >
                                <StyledOperationLabel>
                                    {item.customer ? (
                                        <StyledOperationCustomerButton
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectCustomer(item.customerId);
                                            }}
                                        >
                                            {item.customer.name}
                                        </StyledOperationCustomerButton>
                                    ) : (
                                        <StyledOperationLabelName>고객 미지정</StyledOperationLabelName>
                                    )}
                                    <StyledOperationLabelSub>{item.total}건 중 {item.noshow}건</StyledOperationLabelSub>
                                </StyledOperationLabel>
                                <StyledOperationRate>{item.rate}%</StyledOperationRate>
                            </StyledClickableOperationRow>
                        ))}
                    </StyledOperationList>
                )}
            </StyledChartCard>
        </StyledChartGrid>
    );
};
