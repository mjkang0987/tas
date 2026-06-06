import {Fragment, useState} from 'react';

import styled from 'styled-components';

import {formatPrice} from '../../../utils/services';
import type {CustomerMap} from '../../../utils/customers';
import {compareDesignerName} from '../../../utils/designers';
import {StyledColorSwatch} from './revenue-styles';

const REVENUE_CHART_WIDTH = 320;
const REVENUE_CHART_HEIGHT = 160;

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

interface DesignerChartItem {
    designerId: number | null;
    total: number;
    count: number;
    name: string;
    color: string;
}

interface DesignerCancellationItem {
    designerId: number | null;
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
    | {kind: 'designer'; designerId: number}
    | {kind: 'cancellation'; designerId: number | null}
    | {kind: 'noshow'; customerId: number}
    | {kind: 'channel'; channel: string};

interface RevenueChartGridProps {
    fromDateKey: string;
    toDateKeyValue: string;
    designerKey: string;
    chartPath: {linePath: string; areaPath: string};
    chartPoints: ChartPoint[];
    lineMax: number;
    paidTotal: number;
    paymentDonutGradient: string;
    paymentChartItems: PaymentChartItem[];
    designerChartItems: DesignerChartItem[];
    designerCancellationItems: DesignerCancellationItem[];
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
    designerKey,
    chartPath,
    chartPoints,
    lineMax,
    paidTotal,
    paymentDonutGradient,
    paymentChartItems,
    designerChartItems,
    designerCancellationItems,
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
                    <strong>기간별 매출 추이</strong>
                    <span>{fromDateKey} ~ {toDateKeyValue}</span>
                </StyledChartHeader>
                {seriesLength === 0 ? (
                    <StyledChartEmpty>내역이 없습니다.</StyledChartEmpty>
                ) : (
                    <>
                        <StyledLineChartBox>
                            {hoveredPoint && (
                                <StyledChartTooltip $leftRatio={hoveredPoint.xRatio} $topRatio={hoveredPoint.yRatio}>
                                    <strong>{hoveredPoint.dateKey}</strong>
                                    <span>{formatPrice(hoveredPoint.total)}</span>
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
                    <strong>결제수단 비중</strong>
                    <span>결제완료 기준</span>
                </StyledChartHeader>
                {paymentChartItems.length === 0 ? (
                    <StyledChartEmpty>내역이 없습니다.</StyledChartEmpty>
                ) : (
                    <StyledPaymentChartWrap>
                        <StyledDonutChart $gradient={paymentDonutGradient}>
                            <div>
                                <strong>{formatPrice(paidTotal)}</strong>
                                <span>결제합계</span>
                            </div>
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

            {/* Channel donut */}
            <StyledChartCard>
                <StyledChartHeader>
                    <strong>예약비중</strong>
                    <span>전화 · 방문 · 네이버</span>
                </StyledChartHeader>
                {channelTotalCount === 0 ? (
                    <StyledChartEmpty>내역이 없습니다.</StyledChartEmpty>
                ) : (
                    <StyledDonutColumnWrap>
                        <StyledDonutChart $gradient={channelDonutGradient}>
                            <div>
                                <strong>{channelTotalCount}건</strong>
                                <span>전체예약</span>
                            </div>
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
                                            <span>{item.channel}</span>
                                            <strong>{item.count}건</strong>
                                            <span>{percent}%</span>
                                        </StyledLegendInlineLabel>
                                    </StyledLegendItem>
                                );
                            })}
                        </StyledLegendList>
                    </StyledDonutColumnWrap>
                )}
            </StyledChartCard>

            {/* Designer bar */}
            <StyledChartCard>
                <StyledChartHeader>
                    <strong>디자이너별 매출</strong>
                    <span>{designerKey === 'all' ? '전체 기준' : '선택 디자이너 기준'}</span>
                </StyledChartHeader>
                {designerChartItems.length === 0 ? (
                    <StyledChartEmpty>내역이 없습니다.</StyledChartEmpty>
                ) : (
                    <>
                        {(() => {
                            const sumTotal = designerChartItems.reduce((sum, e) => sum + e.total, 0);
                            const withPct = [...designerChartItems]
                                .map((item) => ({...item, pct: sumTotal > 0 ? (item.total / sumTotal) * 100 : 0}))
                                .sort((a, b) => compareDesignerName(a.name, b.name));
                            return (
                                <StyledShareSection>
                                    <StyledShareSectionTitle>전체비율</StyledShareSectionTitle>
                                    <StyledShareLegend>
                                        {withPct.map((item) => (
                                            <StyledShareLegendItem key={`legend-${item.designerId ?? 'none'}`}>
                                                <StyledColorSwatch $color={item.color} />
                                                <span>{item.name}</span>
                                                <strong>{Math.round(item.pct)}%</strong>
                                            </StyledShareLegendItem>
                                        ))}
                                    </StyledShareLegend>
                                    <StyledShareBar>
                                        {withPct.filter((item) => item.pct > 0).map((item) => (
                                            <StyledShareSegment key={`share-${item.designerId ?? 'none'}`} $color={item.color} $width={item.pct} title={`${item.name} ${Math.round(item.pct)}%`} />
                                        ))}
                                    </StyledShareBar>
                                </StyledShareSection>
                            );
                        })()}
                        <StyledBarChartList>
                            {[...designerChartItems].sort((a, b) => compareDesignerName(a.name, b.name)).map((item) => {
                                const sumTotal = designerChartItems.reduce((sum, e) => sum + e.total, 0) || 1;
                                const barRatio = (item.total / sumTotal) * 100;
                                return (
                                    <StyledBarRow
                                        key={`${item.designerId ?? 'none'}-${item.name}`}
                                        onClick={() => item.designerId != null && onChartDetailClick({kind: 'designer', designerId: item.designerId})}
                                        style={item.designerId != null ? {cursor: 'pointer'} : undefined}
                                    >
                                        <StyledBarHeaderRow>
                                            <StyledBarLabel>
                                                <StyledColorSwatch $color={item.color} />
                                                <span>{item.name}</span>
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
                    <strong>디자이너별 취소율</strong>
                    <span>기간 내 전체 예약 기준</span>
                </StyledChartHeader>
                <StyledOperationSummary>
                    <span>전체 취소 {totalCancelledCount}건</span>
                    <strong>{totalCancelledRate}%</strong>
                </StyledOperationSummary>
                {designerCancellationItems.length === 0 ? (
                    <StyledChartEmpty>내역이 없습니다.</StyledChartEmpty>
                ) : (
                    <StyledOperationList>
                        {[...designerCancellationItems].sort((a, b) => compareDesignerName(a.name, b.name)).map((item) => (
                            <StyledClickableOperationRow
                                key={`cancel-${item.designerId ?? 'none'}`}
                                onClick={() => onChartDetailClick({kind: 'cancellation', designerId: item.designerId})}
                            >
                                <StyledOperationLabel>
                                    <StyledRevenueMetaLabel>
                                        <StyledColorSwatch $color={item.color} />
                                        <span>{item.name}</span>
                                    </StyledRevenueMetaLabel>
                                    <small>{item.total}건 중 {item.cancelled}건</small>
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
                    <strong>고객별 노쇼율</strong>
                    <span>기간 내 전체 예약 기준</span>
                </StyledChartHeader>
                <StyledOperationSummary>
                    <span>전체 노쇼 {totalNoshowCount}건</span>
                    <strong>{totalNoshowRate}%</strong>
                </StyledOperationSummary>
                {customerNoshowItems.length === 0 ? (
                    <StyledChartEmpty>내역이 없습니다.</StyledChartEmpty>
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
                                        <span>고객 미지정</span>
                                    )}
                                    <small>{item.total}건 중 {item.noshow}건</small>
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

/* ── Styled ── */

const StyledChartGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    @media (max-width: 1080px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const StyledChartCard = styled.div<{ $hero?: boolean; $autoHeight?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: ${(props) => props.$autoHeight ? 'auto' : props.$hero ? '320px' : '250px'};
    align-self: ${(props) => props.$autoHeight ? 'start' : 'stretch'};
    padding: 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: var(--white-color);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);

    ${(props) => props.$hero && `grid-column: span 2;`};

    @media (max-width: 900px) {
        grid-column: span 1;
        min-height: auto;
    }
`;

const StyledChartHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    strong { font-size: 14px; color: var(--black-color); }
    span { font-size: 11px; color: var(--dark-gray-color2); text-align: right; }
`;

const StyledChartEmpty = styled.div`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--gray-color2);
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledLineChartBox = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 236px;

    @media (max-width: 640px) {
        min-height: auto;
    }
    padding: 14px 16px 4px;
    border: 1px solid rgba(45, 127, 249, 0.08);
    border-radius: 18px;
    background:
        radial-gradient(circle at top right, rgba(45, 127, 249, 0.12), transparent 28%),
        linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
`;

const StyledChartTooltip = styled.div<{ $leftRatio: number; $topRatio: number }>`
    position: absolute;
    left: ${(p) => `clamp(84px, calc(74px + (${p.$leftRatio} * (100% - 74px)) - 58px), calc(100% - 132px))`};
    top: ${(p) => `max(10px, calc(14px + (${p.$topRatio} * 190px) - 58px))`};
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 116px;
    padding: 9px 11px;
    border: 1px solid rgba(45, 127, 249, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
    backdrop-filter: var(--sticky-backdrop);
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

    strong { font-size: 11px; color: var(--dark-gray-color2); font-weight: 600; }
    span { font-size: 13px; font-weight: 800; color: var(--blue-color); }
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

    span { position: absolute; left: 0; font-size: 11px; color: var(--dark-gray-color2); line-height: 1; }
    .top { top: 0; transform: translateY(-50%); }
    .middle { top: 50%; transform: translateY(-50%); }
    .bottom { top: 100%; transform: translateY(-50%); }
`;

const StyledLineChartStage = styled.div`
    position: relative;
    height: 190px;
    border-radius: 10px;
    overflow: hidden;
    line-height: 0;
`;

const StyledChartHorizontalGuide = styled.div<{ $topRatio: number }>`
    position: absolute;
    left: 0; right: 0;
    top: ${(p) => `${p.$topRatio * 100}%`};
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
    top: 0; bottom: 0;
    left: ${(p) => `${p.$leftRatio * 100}%`};
    width: 1px;
    border-left: 1px dashed rgba(45, 127, 249, 0.2);
    transform: translateX(-50%);
    pointer-events: none;
`;

const StyledChartPointHalo = styled.div<{ $leftRatio: number; $topRatio: number }>`
    position: absolute;
    left: ${(p) => `${p.$leftRatio * 100}%`};
    top: ${(p) => `${p.$topRatio * 100}%`};
    width: 24px; height: 24px;
    border-radius: 50%;
    background: rgba(45, 127, 249, 0.14);
    transform: translate(-50%, -50%);
    pointer-events: none;
`;

const StyledChartPointButton = styled.button<{ $active: boolean; $leftRatio: number; $topRatio: number }>`
    position: absolute;
    left: ${(p) => `${p.$leftRatio * 100}%`};
    top: ${(p) => `${p.$topRatio * 100}%`};
    width: ${(p) => p.$active ? '10px' : '7px'};
    height: ${(p) => p.$active ? '10px' : '7px'};
    padding: 0;
    border: 2px solid #fff;
    border-radius: 50%;
    background: ${(p) => p.$active ? 'var(--orange-color)' : 'var(--blue-color)'};
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.14);
    transform: translate(-50%, -50%);
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

const StyledBarRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledBarHeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const StyledBarLabel = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    color: var(--dark-gray-color);
    > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const StyledBarValue = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--black-color);
    white-space: nowrap;
`;

const StyledBarTrack = styled.div`
    position: relative;
    height: 20px;
    border-radius: 999px;
    background: #edf2f7;
    overflow: hidden;
`;

const StyledBarFill = styled.div<{ $color: string; $width: number }>`
    width: ${(p) => `${p.$width}%`};
    height: 100%;
    border-radius: inherit;
    background: ${(p) => p.$color};
`;

const StyledShareSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledShareSectionTitle = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--dark-gray-color2);
`;

const StyledShareBar = styled.div`
    display: flex;
    height: 20px;
    border-radius: 999px;
    overflow: hidden;
    background: #edf2f7;
    margin-top: 4px;
`;

const StyledShareSegment = styled.div<{ $color: string; $width: number }>`
    width: ${(p) => `${p.$width}%`};
    height: 100%;
    background: ${(p) => p.$color};
`;

const StyledShareLegend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
`;

const StyledShareLegendItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--dark-gray-color);

    > strong {
        font-weight: 600;
        color: var(--black-color);
    }
`;

const StyledDonutColumnWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
`;

const StyledPaymentChartWrap = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;

    @media (max-width: 900px) {
        flex-direction: column;
        gap: 16px;
    }
`;

const StyledDonutChart = styled.div<{ $gradient: string }>`
    position: relative;
    width: 150px; height: 150px;
    flex-shrink: 0;
    margin: 25px 50px;
    border-radius: 50%;

    @media (max-width: 900px) {
        margin: 10px;
    }
    background: ${(p) => p.$gradient};

    &::after {
        content: '';
        position: absolute;
        inset: 22px;
        border-radius: 50%;
        background: var(--white-color);
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
    }

    > div {
        position: absolute; inset: 0; z-index: 1;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 4px; text-align: center;
    }

    strong { font-size: 14px; color: var(--black-color); }
    span { font-size: 11px; color: var(--dark-gray-color2); }
`;

const StyledLegendList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
`;

const StyledLegendItem = styled.div`
    display: inline-flex;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.75;
        }
    }
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

    strong { font-size: 12px; color: var(--black-color); }
    > span { font-size: 11px; color: var(--dark-gray-color2); }
`;

const StyledOperationSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #f6f8fc;

    span { font-size: 12px; color: var(--dark-gray-color2); }
    strong { font-size: 18px; color: var(--black-color); }
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
    border-radius: 8px;
    background: var(--white-color);
`;

const StyledClickableOperationRow = styled(StyledOperationRow)`
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

const StyledOperationLabel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    span { font-size: 13px; color: var(--dark-gray-color); font-weight: 600; }
    small { font-size: 11px; color: var(--dark-gray-color2); }
`;

const StyledRevenueMetaLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: var(--dark-gray-color2);
`;

const StyledOperationCustomerButton = styled.button`
    border: 0;
    padding: 0;
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
    text-align: left;
`;

const StyledOperationRate = styled.strong`
    flex-shrink: 0;
    font-size: 16px;
    color: var(--blue-color);
`;
