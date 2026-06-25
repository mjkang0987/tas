import {useState} from 'react';

import styled from 'styled-components';

import {formatPrice} from '../../../utils/services';
import type {Assignee} from '../../../utils/assignees';
import type {Reservation} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import {EMPTY_TEXT} from '../settings-styles';
import {
    StyledList,
    StyledRevenueEmpty,
    StyledSummary,
    StyledSummaryStrong,
} from './revenue-styles';
import {RevenueReservationList} from './RevenueReservationList';

interface DayEntry {
    dateKey: string;
    total: number;
    count: number;
}

interface RevenueDailyListProps {
    days: DayEntry[];
    dayReservationMap: Record<string, Reservation[]>;
    assigneeMap: Record<number, Assignee>;
    customerMap: CustomerMap;
    serviceColorMap: Record<string, string>;
    onSelectCustomer: (customerId: number) => void;
    onSelectReservation: (reservation: Reservation) => void;
    onDayClick: (dateKey: string) => void;
    rangeTotal: number;
    rangeCount: number;
}

function getShortDateParts(dateKey: string): {monthDay: string; yearWeekday: string} {
    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
    const parts = dateKey.split('-');
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const year = Number(parts[0]);
    const date = new Date(dateKey + 'T00:00:00');
    return {
        monthDay: `${month}월 ${day}일`,
        yearWeekday: `${year}년 (${WEEKDAYS[date.getDay()]})`,
    };
}

export const RevenueDailyList = ({
    days,
    dayReservationMap,
    assigneeMap,
    customerMap,
    serviceColorMap,
    onSelectCustomer,
    onSelectReservation,
    onDayClick,
    rangeTotal,
    rangeCount,
}: RevenueDailyListProps) => {
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    const toggleDate = (dateKey: string) => {
        setExpandedDates((prev) => {
            const next = new Set(prev);
            if (next.has(dateKey)) {
                next.delete(dateKey);
            } else {
                next.add(dateKey);
            }
            return next;
        });
    };

    if (days.length === 0) {
        return <StyledRevenueEmpty>{EMPTY_TEXT}</StyledRevenueEmpty>;
    }

    return (
        <>
            <StyledList>
                {days.map((day) => {
                    const dateParts = getShortDateParts(day.dateKey);
                    const isExpanded = expandedDates.has(day.dateKey);
                    const reservations = dayReservationMap[day.dateKey] ?? [];

                    return (
                        <StyledDayGroup key={day.dateKey}>
                            <StyledDayHeader onClick={() => toggleDate(day.dateKey)}>
                                <StyledDate>
                                    <StyledDateMonthDay>{dateParts.monthDay}</StyledDateMonthDay>
                                    <StyledDateYear>{dateParts.yearWeekday}</StyledDateYear>
                                </StyledDate>
                                <StyledDayHeaderRight>
                                    <StyledCount>{day.count}건</StyledCount>
                                    <StyledDayTotal>{formatPrice(day.total)}</StyledDayTotal>
                                    <StyledExpandIcon $expanded={isExpanded} aria-hidden="true" />
                                </StyledDayHeaderRight>
                            </StyledDayHeader>
                            {isExpanded && reservations.length > 0 && (
                                <StyledDayReservations>
                                    <RevenueReservationList
                                        reservations={reservations}
                                        assigneeMap={assigneeMap}
                                        customerMap={customerMap}
                                        serviceColorMap={serviceColorMap}
                                        onSelectReservation={onSelectReservation}
                                        onSelectCustomer={onSelectCustomer}
                                    />
                                </StyledDayReservations>
                            )}
                        </StyledDayGroup>
                    );
                })}
            </StyledList>
            <StyledRevenueSummary>
                <span>{rangeCount}건</span>
                <StyledSummaryStrong>{formatPrice(rangeTotal)}</StyledSummaryStrong>
            </StyledRevenueSummary>
        </>
    );
};

/* ── Styled ── */

const StyledDayGroup = styled.div`
    border-bottom: 1px solid var(--black-color-10);
`;

const StyledDayHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 0;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
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

const StyledDayHeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledCount = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledDayTotal = styled.strong`
    font-size: 13px;
    font-weight: 500;
    color: var(--black-color);
`;

const StyledExpandIcon = styled.span<{ $expanded: boolean }>`
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-right: 2px solid var(--dark-gray-color2);
    border-bottom: 2px solid var(--dark-gray-color2);
    transform: ${(p) => p.$expanded ? 'rotate(-135deg)' : 'rotate(45deg)'};
    transition: transform 0.2s ease;
`;

const StyledDayReservations = styled.div``;

const StyledRevenueSummary = styled(StyledSummary)`
    position: sticky;
    bottom: 0;
    z-index: 2;
    background: var(--white-color);
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    margin-top: 8px;
    background: rgba(255, 255, 255, .1);
    backdrop-filter: var(--sticky-backdrop);
`;
