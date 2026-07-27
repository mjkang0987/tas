import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {
    isTodayValue,
    ViewType,
} from '../../../utils/constants';

import {toDateKey} from '../../../utils/reservations';

import {Num} from './Num';
import {ButtonAdd} from '../../ui/Buttons';
import {ReservationList} from './ReservationList';

interface MonthType {
    monthDates: number[];
    currMonth: number;
    type: string;
}

export const Month = ({
                          monthDates,
                          currMonth,
                          type
                      }: MonthType) => {
    const today = useCalendarStore((s) => s.today);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);

    const fullYear = curr!.fullYear;

    return (<>
        {monthDates.map((val, index) => {
            const normalizedDate = new Date(fullYear, currMonth, val);
            const dateKey = toDateKey(fullYear, currMonth, val);
            const dateReservations = (reservationMap[dateKey] || []).filter((reservation) => (
                calendarAssigneeId == null || (calendarAssigneeId === 0 ? !reservation.assigneeId : reservation.assigneeId === calendarAssigneeId)
            ));
            const hasReservations = dateReservations.length > 0;
            const isAdjacentMonth = type === 'prev' || type === 'next';
            const isTodayDate = isTodayValue(
                today,
                normalizedDate.getFullYear(),
                normalizedDate.getMonth(),
                normalizedDate.getDate()
            );
            const dateLabel = isAdjacentMonth ? `${normalizedDate.getMonth() + 1}/${val}` : String(val);

            return (<StyledDate key={`month_${val + index}`}
                                type={type}>
                <StyledDateHeader>
                    <Num onClick={() => {
                        setCurr(new Date(fullYear, currMonth, val));
                        setView({type: ViewType.Day});
                    }}
                         isToday={isTodayDate}
                         compact={isAdjacentMonth}
                         className={isAdjacentMonth ? 'faded' : undefined}>{dateLabel}</Num>
                    <ButtonAdd onClick={() => setCreateReservationInitial({date: toDateKey(fullYear, currMonth, val), startTime: '10:00'})}
                               aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 추가`}/>
                </StyledDateHeader>
                {hasReservations && (
                    <ReservationList reservations={dateReservations}
                                     variant="date"
                                     onViewAll={() => setReservationListFilter({type: 'date', dateKey})}
                                     hideViewAll/>
                )}
                {dateReservations.length > 0 && (
                    <StyledViewAllButton type="button"
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             setReservationListFilter({type: 'date', dateKey});
                                         }}>
                        전체 ({dateReservations.length})
                    </StyledViewAllButton>
                )}
            </StyledDate>);
        })}
    </>);
};

const StyledDateHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StyledDate = styled.li<{ type: string }>`
    display: flex;
    flex-direction: column;
    padding: 2px;
    text-align: center;
    overflow-y: auto;
    overscroll-behavior: auto;
    border-right: 1px solid var(--light-gray-color);
    border-top: 1px solid var(--light-gray-color);

    &:nth-child(7n) {
        border-right: none;
    }

    &:nth-child(-n+7) {
        border-top: none;
    }

    ${props => (props.type === 'prev' || props.type === 'next') && `
    .faded { color: var(--gray-color); }
  `}
`;

const StyledViewAllButton = styled.button`
    margin-top: auto;
    padding: 2px 0;
    flex-shrink: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 3px;
    background-color: var(--white-color);
    font-size: 9px;
    font-weight: 600;
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--light-gray-color);
    }
    }
`;
