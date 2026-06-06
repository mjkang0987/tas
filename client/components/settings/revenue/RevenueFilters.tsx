import {useState} from 'react';

import styled from 'styled-components';

import type {Designer} from '../../../utils/designers';
import {sortDesigners} from '../../../utils/designers';
import type {RevenueFilterMode} from '../../../utils/revenue';
import {DirectionIcon} from '../../ui/DirectionIcon';
import {actionButtonStyle, StyledDateInput} from './revenue-styles';

import type {RevenueDesignerKey, RevenueQuickRange} from './RevenueSection';

interface RevenueFiltersProps {
    startDateKey: string;
    endDateKey: string;
    setStartDateKey: (key: string) => void;
    setEndDateKey: (key: string) => void;
    quickRange: RevenueQuickRange | null;
    setQuickRange: (range: RevenueQuickRange) => void;
    onMoveRange: (direction: 'prev' | 'next') => void;
    designers: Designer[];
    designerKey: RevenueDesignerKey;
    setDesignerKey: (key: RevenueDesignerKey) => void;
    revenueViewTab: RevenueViewTab;
    setRevenueViewTab: (tab: RevenueViewTab) => void;
    revenueFilterMode: RevenueFilterMode;
    setRevenueFilterMode: (mode: RevenueFilterMode) => void;
    onExport: () => void;
}

export type RevenueViewTab = 'all' | 'chart' | 'list';

export const RevenueFilters = ({
    startDateKey,
    endDateKey,
    setStartDateKey,
    setEndDateKey,
    quickRange,
    setQuickRange,
    onMoveRange,
    designers,
    designerKey,
    setDesignerKey,
    revenueViewTab,
    setRevenueViewTab,
    revenueFilterMode,
    setRevenueFilterMode,
    onExport,
}: RevenueFiltersProps) => {
    const [showCriteriaHint, setShowCriteriaHint] = useState(false);

    return (
        <StyledStickyArea>
            {/* Row 1: Quick range + date range */}
            <StyledRow1>
                <StyledQuickFilters>
                    <StyledQuickFilterButton type="button" $active={quickRange === 'today'} onClick={() => setQuickRange('today')}>오늘</StyledQuickFilterButton>
                    <StyledQuickFilterButton type="button" $active={quickRange === 'week'} onClick={() => setQuickRange('week')}>7일</StyledQuickFilterButton>
                    <StyledQuickFilterButton type="button" $active={quickRange === 'month'} onClick={() => setQuickRange('month')}>30일</StyledQuickFilterButton>
                </StyledQuickFilters>
                <StyledRangeFilter>
                    <StyledRangeNavButton type="button" onClick={() => onMoveRange('prev')} aria-label="이전 기간">
                        <DirectionIcon direction="left" />
                    </StyledRangeNavButton>
                    <StyledRangeInputWrap>
                        <StyledDateInput type="date" value={startDateKey} onChange={(e) => setStartDateKey(e.target.value)} />
                    </StyledRangeInputWrap>
                    <StyledRangeDivider>~</StyledRangeDivider>
                    <StyledRangeInputWrap>
                        <StyledDateInput type="date" value={endDateKey} onChange={(e) => setEndDateKey(e.target.value)} />
                    </StyledRangeInputWrap>
                    <StyledRangeNavButton type="button" onClick={() => onMoveRange('next')} aria-label="다음 기간">
                        <DirectionIcon direction="right" />
                    </StyledRangeNavButton>
                </StyledRangeFilter>
            </StyledRow1>

            {/* Row 2: Designer tabs — horizontal scroll */}
            <StyledDesignerTabs>
                <StyledDesignerTab type="button" $active={designerKey === 'all'} onClick={() => setDesignerKey('all')}>전체</StyledDesignerTab>
                {sortDesigners(designers).map((designer) => (
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

            {/* Row 3: View tabs (left) + Filter mode tabs (right) */}
            <StyledRow3>
                <StyledTabGroup>
                    <StyledViewTab type="button" $active={revenueViewTab === 'all'} onClick={() => setRevenueViewTab('all')}>전체</StyledViewTab>
                    <StyledViewTab type="button" $active={revenueViewTab === 'chart'} onClick={() => setRevenueViewTab('chart')}>매출 그래프</StyledViewTab>
                    <StyledViewTab type="button" $active={revenueViewTab === 'list'} onClick={() => setRevenueViewTab('list')}>매출 일별목록</StyledViewTab>
                    <StyledExportButton type="button" onClick={onExport} aria-label="엑셀 다운로드">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 1.5v8M3.5 6L7 9.5 10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 11.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                    </StyledExportButton>
                </StyledTabGroup>
                <StyledTabGroup>
                    <StyledFilterModeTab
                        type="button"
                        $active={revenueFilterMode === 'completed'}
                        onClick={() => setRevenueFilterMode('completed')}
                    >
                        예약완료매출
                    </StyledFilterModeTab>
                    <StyledFilterModeTab
                        type="button"
                        $active={revenueFilterMode === 'booked'}
                        onClick={() => setRevenueFilterMode('booked')}
                    >
                        예약매출
                    </StyledFilterModeTab>
                    <StyledInfoButton
                        type="button"
                        aria-label="집계기준 설명"
                        onClick={() => setShowCriteriaHint((v) => !v)}
                    >
                        i
                    </StyledInfoButton>
                </StyledTabGroup>
            </StyledRow3>
            {showCriteriaHint && (
                <StyledCriteriaHint>
                    {revenueFilterMode === 'completed'
                        ? '예약완료 매출은 예약상태가 예약완료인 건만 집계합니다. 결제완료 금액은 결제수단과 금액이 입력된 내역만 합산됩니다.'
                        : '예약매출은 취소, 노쇼를 제외한 전체 예약 기준으로 집계합니다. 결제완료 금액은 예약완료 기준으로만 집계됩니다.'}
                </StyledCriteriaHint>
            )}
            <StyledDivider />
        </StyledStickyArea>
    );
};

/* ── Styled ── */

const StyledStickyArea = styled.div`
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 8px;
    background: rgba(255, 255, 255, .1); /* 살짝만 흰색 */
    backdrop-filter: var(--sticky-backdrop);
`;

const StyledRow1 = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-wrap: wrap;
`;

const StyledQuickFilters = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;

const StyledQuickFilterButton = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 13px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
`;

const StyledRangeFilter = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 4px;
    flex: 1;
    min-width: min(300px, 100%);
`;

const StyledRangeNavButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    line-height: 0;
`;

const StyledRangeInputWrap = styled.label`
    flex: 1;
    width: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--dark-gray-color2);
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

const StyledDesignerTabs = styled.div`
    display: flex;
    gap: 6px;
    overflow-x: auto;
    overscroll-behavior: auto;
    padding: 2px 0;
    -webkit-overflow-scrolling: touch;
`;

const StyledDesignerTab = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    ${actionButtonStyle};
    min-height: 30px;
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 10px;
    background: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};
`;

const StyledRow3 = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

const StyledTabGroup = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
`;

const StyledViewTab = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    white-space: nowrap;
    border: 1px solid ${(p) => p.$active ? 'var(--black-color)' : 'var(--light-gray-color)'};
    background: ${(p) => p.$active ? 'var(--black-color)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? '#fff' : 'var(--dark-gray-color)'};

    @media (max-width: 640px) {
        min-width: 0;
        padding: 0 8px;
    }
`;

const StyledFilterModeTab = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    ${actionButtonStyle};
    padding: 0 11px;
    border: 1px solid ${(p) => p.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 10px;
    background: ${(p) => p.$active ? 'rgba(45, 127, 249, 0.1)' : 'var(--white-color)'};
    color: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    font-weight: ${(p) => p.$active ? 700 : 500};
`;

const StyledInfoButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 50%;
    background: var(--white-color);
    font-size: 11px;
    font-weight: 700;
    color: var(--dark-gray-color2);
`;

const StyledCriteriaHint = styled.p`
    margin: 0;
    padding: 6px 8px;
    border-radius: 8px;
    background: #f6f8fc;
    font-size: 11px;
    color: var(--dark-gray-color2);
    line-height: 1.45;
`;

const StyledExportButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    color: var(--dark-gray-color);
    transition: background-color 0.15s, border-color 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--gray-color2);
            border-color: var(--dark-gray-color2);
        }
    }
`;

const StyledDivider = styled.hr`
    margin: 0;
    border: none;
    border-top: 1px solid var(--light-gray-color);
`;
