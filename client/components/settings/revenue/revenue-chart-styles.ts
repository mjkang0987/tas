import styled from 'styled-components';

const REVENUE_CHART_WIDTH = 320;
const REVENUE_CHART_HEIGHT = 160;

/* ── Grid / card wrappers ── */

export const StyledChartGrid = styled.div`
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

export const StyledChartCard = styled.div<{ $hero?: boolean; $autoHeight?: boolean }>`
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

export const StyledChartHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

export const StyledChartHeaderTitle = styled.strong`
    font-size: 14px;
    color: var(--black-color);
`;

export const StyledChartHeaderMeta = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
    text-align: right;
`;

export const StyledChartEmpty = styled.div`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--gray-color2);
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

/* ── Line chart ── */

export const StyledLineChartBox = styled.div`
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

export const StyledChartTooltip = styled.div<{ $leftRatio: number; $topRatio: number }>`
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
`;

export const StyledChartTooltipLabel = styled.strong`
    font-size: 11px;
    color: var(--dark-gray-color2);
    font-weight: 600;
`;

export const StyledChartTooltipValue = styled.span`
    font-size: 13px;
    font-weight: 800;
    color: var(--blue-color);
`;

export const StyledLineChartFrame = styled.div`
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 10px;
    align-items: stretch;
    flex: 1;
    min-height: 0;
`;

export const StyledYAxis = styled.div`
    position: relative;
    height: 190px;

    .top { top: 0; transform: translateY(-50%); }
    .middle { top: 50%; transform: translateY(-50%); }
    .bottom { top: 100%; transform: translateY(-50%); }
`;

export const StyledYAxisLabel = styled.span`
    position: absolute;
    left: 0;
    font-size: 11px;
    color: var(--dark-gray-color2);
    line-height: 1;
`;

export const StyledLineChartStage = styled.div`
    position: relative;
    height: 190px;
    border-radius: 10px;
    overflow: hidden;
    line-height: 0;
`;

export const StyledChartHorizontalGuide = styled.div<{ $topRatio: number }>`
    position: absolute;
    left: 0; right: 0;
    top: ${(p) => `${p.$topRatio * 100}%`};
    height: 1px;
    background: rgba(15, 23, 42, 0.06);
    transform: translateY(-50%);
    pointer-events: none;
`;

export const StyledLineChart = styled.svg`
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
`;

export const StyledChartGuide = styled.div<{ $leftRatio: number }>`
    position: absolute;
    top: 0; bottom: 0;
    left: ${(p) => `${p.$leftRatio * 100}%`};
    width: 1px;
    border-left: 1px dashed rgba(45, 127, 249, 0.2);
    transform: translateX(-50%);
    pointer-events: none;
`;

export const StyledChartPointHalo = styled.div<{ $leftRatio: number; $topRatio: number }>`
    position: absolute;
    left: ${(p) => `${p.$leftRatio * 100}%`};
    top: ${(p) => `${p.$topRatio * 100}%`};
    width: 24px; height: 24px;
    border-radius: 50%;
    background: rgba(45, 127, 249, 0.14);
    transform: translate(-50%, -50%);
    pointer-events: none;
`;

export const StyledChartPointButton = styled.button<{ $active: boolean; $leftRatio: number; $topRatio: number }>`
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

export const StyledChartAxis = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--dark-gray-color2);
    margin-top: -2px;
    padding-left: 74px;
`;

/* ── Bar chart (assignee) ── */

export const StyledBarChartList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const StyledBarRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const StyledBarHeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

export const StyledBarLabel = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    color: var(--dark-gray-color);
`;

export const StyledBarLabelText = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const StyledBarValue = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--black-color);
    white-space: nowrap;
`;

export const StyledBarTrack = styled.div`
    position: relative;
    height: 20px;
    border-radius: 999px;
    background: #edf2f7;
    overflow: hidden;
`;

export const StyledBarFill = styled.div<{ $color: string; $width: number }>`
    width: ${(p) => `${p.$width}%`};
    height: 100%;
    border-radius: inherit;
    background: ${(p) => p.$color};
`;

export const StyledShareSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const StyledShareSectionTitle = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--dark-gray-color2);
`;

export const StyledShareBar = styled.div`
    display: flex;
    height: 20px;
    border-radius: 999px;
    overflow: hidden;
    background: #edf2f7;
    margin-top: 4px;
`;

export const StyledShareSegment = styled.div<{ $color: string; $width: number }>`
    width: ${(p) => `${p.$width}%`};
    height: 100%;
    background: ${(p) => p.$color};
`;

export const StyledShareLegend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
`;

export const StyledShareLegendItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--dark-gray-color);
`;

export const StyledShareLegendItemValue = styled.strong`
    font-weight: 600;
    color: var(--black-color);
`;

/* ── Donut charts ── */

export const StyledDonutColumnWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
`;

export const StyledPaymentChartWrap = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;

    @media (max-width: 900px) {
        flex-direction: column;
        gap: 16px;
    }
`;

export const StyledDonutChart = styled.div<{ $gradient: string }>`
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

`;

export const StyledDonutChartCenter = styled.div`
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-align: center;
`;

export const StyledDonutChartValue = styled.strong`
    font-size: 14px;
    color: var(--black-color);
`;

export const StyledDonutChartLabel = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

export const StyledLegendList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
`;

export const StyledLegendItem = styled.div`
    display: inline-flex;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.75;
        }
    }
`;

export const StyledLegendInlineLabel = styled.div`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 999px;
    background: var(--white-color);
`;

export const StyledLegendInlineLabelStrong = styled.strong`
    font-size: 12px;
    color: var(--black-color);
`;

export const StyledLegendInlineLabelText = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

/* ── Operation rows (cancellation / noshow) ── */

export const StyledOperationSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #f6f8fc;
`;

export const StyledOperationSummaryLabel = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

export const StyledOperationSummaryValue = styled.strong`
    font-size: 18px;
    color: var(--black-color);
`;

export const StyledOperationList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const StyledOperationRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
`;

export const StyledClickableOperationRow = styled(StyledOperationRow)`
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

export const StyledOperationLabel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

export const StyledOperationLabelName = styled.span`
    font-size: 13px;
    color: var(--dark-gray-color);
    font-weight: 600;
`;

export const StyledOperationLabelSub = styled.small`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

export const StyledChartRevenueMetaLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: var(--dark-gray-color2);
`;

export const StyledOperationCustomerButton = styled.button`
    border: 0;
    padding: 0;
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
    text-align: left;
`;

export const StyledOperationRate = styled.strong`
    flex-shrink: 0;
    font-size: 16px;
    color: var(--blue-color);
`;

/* ── SVG dimensions (exported for use in JSX) ── */
export {REVENUE_CHART_WIDTH, REVENUE_CHART_HEIGHT};
