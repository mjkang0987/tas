import {Fragment, useState} from 'react';

import {formatPrice} from '../../../utils/services';
import type {CustomerMap} from '../../../utils/customers';
import {compareAssigneeName} from '../../../utils/assignees';
import {EMPTY_TEXT} from '../settings-styles';
import {StyledColorSwatch} from './revenue-styles';
import {
    StyledChartGrid, StyledChartCard, StyledChartHeader, StyledChartEmpty,
    StyledChartHeaderTitle, StyledChartHeaderMeta,
    StyledLineChartBox, StyledChartTooltip, StyledLineChartFrame, StyledYAxis,
    StyledChartTooltipLabel, StyledChartTooltipValue, StyledYAxisLabel,
    StyledLineChartStage, StyledChartHorizontalGuide, StyledLineChart,
    StyledChartGuide, StyledChartPointHalo, StyledChartPointButton, StyledChartAxis,
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
    REVENUE_CHART_WIDTH, REVENUE_CHART_HEIGHT,
} from './revenue-chart-styles';

interface ChartPoint {
    dateKey: string;
    total: number;
    xRatio: number;
    yRatio: number;
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
    chartPath: {linePath: string; areaPath: string};
    chartPoints: ChartPoint[];
    lineMax: number;
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
    seriesLength: number;
}

export const RevenueChartGrid = ({
    fromDateKey,
    toDateKeyValue,
    assigneeKey,
    chartPath,
    chartPoints,
    lineMax,
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
    seriesLength,
}: RevenueChartGridProps) => {
    const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
    const hoveredPoint = chartPoints.find((item) => item.dateKey === hoveredDateKey) ?? null;

    return (
        <StyledChartGrid>
            {/* Line chart */}
            <StyledChartCard $hero>
                <StyledChartHeader>
                    <StyledChartHeaderTitle>기간별 매출 추이</StyledChartHeaderTitle>
                    <StyledChartHeaderMeta>{fromDateKey} ~ {toDateKeyValue}</StyledChartHeaderMeta>
                </StyledChartHeader>
                {seriesLength === 0 ? (
                    <StyledChartEmpty>{EMPTY_TEXT}</StyledChartEmpty>
                ) : (
                    <>
                        <StyledLineChartBox>
                            {hoveredPoint && (
                                <StyledChartTooltip $leftRatio={hoveredPoint.xRatio} $topRatio={hoveredPoint.yRatio}>
                                    <StyledChartTooltipLabel>{hoveredPoint.dateKey}</StyledChartTooltipLabel>
                                    <StyledChartTooltipValue>{formatPrice(hoveredPoint.total)}</StyledChartTooltipValue>
                                </StyledChartTooltip>
                            )}
                            <StyledLineChartFrame>
                                <StyledYAxis>
                                    <StyledYAxisLabel className="top">{formatPrice(lineMax)}</StyledYAxisLabel>
                                    <StyledYAxisLabel className="middle">{formatPrice(Math.round(lineMax / 2))}</StyledYAxisLabel>
                                    <StyledYAxisLabel className="bottom">{formatPrice(0)}</StyledYAxisLabel>
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
                                        const isActive = hoveredDateKey === item.dateKey;
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
                                                    onMouseEnter={() => setHoveredDateKey(item.dateKey)}
                                                    onMouseLeave={() => setHoveredDateKey((c) => c === item.dateKey ? null : c)}
                                                    onClick={() => onChartDetailClick({kind: 'date', dateKey: item.dateKey})}
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
                    <StyledChartHeaderTitle>담당자별 매출</StyledChartHeaderTitle>
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
                    <StyledChartHeaderTitle>담당자별 취소율</StyledChartHeaderTitle>
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
