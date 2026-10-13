import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {useMediaQuery} from '../../../hooks/useMediaQuery';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {
    isTodayValue,
} from '../../../utils/constants';

import {toDateKey} from '../../../utils/reservations';

import {getStoreClosedKind, STORE_CLOSED_LABEL, type StoreClosedKind} from '../../../features/store-settings/model';
import {storeClosedCss} from './storeClosedCss';

import {Num} from './Num';
import {ButtonAdd} from '../../ui/Buttons';

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
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    // 칸에 이름을 몇 개까지 둘지. 넘으면 숫자 하나로 접고 내용은 목록이 받는다.
    // 데스크톱은 칸이 넓어 더 담는다.
    const isNarrow = useMediaQuery('(max-width: 640px)');
    const maxNames = isNarrow ? MOBILE_MAX_NAMES : DESKTOP_MAX_NAMES;

    const fullYear = curr!.fullYear;

    return (<>
        {monthDates.map((val, index) => {
            const normalizedDate = new Date(fullYear, currMonth, val);
            const dateKey = toDateKey(fullYear, currMonth, val);
            const dateReservations = (reservationMap[dateKey] || []).filter((reservation) => (
                calendarAssigneeId == null || (calendarAssigneeId === 0 ? !reservation.assigneeId : reservation.assigneeId === calendarAssigneeId)
            ));
            const isAdjacentMonth = type === 'prev' || type === 'next';
            const isTodayDate = isTodayValue(
                today,
                normalizedDate.getFullYear(),
                normalizedDate.getMonth(),
                normalizedDate.getDate()
            );
            const dateLabel = isAdjacentMonth ? `${normalizedDate.getMonth() + 1}/${val}` : String(val);
            const closedKind = getStoreClosedKind(storeSettings, dateKey);

            return (<StyledDate key={`month_${val + index}`}
                                type={type}
                                $closedKind={closedKind}>
                {closedKind && <span className="a11y">{STORE_CLOSED_LABEL[closedKind]}</span>}
                <StyledDateHeader>
                    <Num onClick={() => setReservationListFilter({type: 'date', dateKey})}
                         aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 ${dateReservations.length}건 보기`}
                         isToday={isTodayDate}
                         compact={isAdjacentMonth}
                         className={isAdjacentMonth ? 'faded' : undefined}>{dateLabel}</Num>
                    <ButtonAdd onClick={() => setCreateReservationInitial({date: toDateKey(fullYear, currMonth, val), startTime: '10:00'})}
                               aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 추가`}/>
                </StyledDateHeader>
                {dateReservations.length > 0 && (
                    dateReservations.length <= maxNames
                        ? [...dateReservations]
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))
                            .map((reservation) => (
                                <StyledSingleName key={reservation.id}
                                                  type="button"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      setCreateReservationInitial(null);
                                                      openReservationDetail(reservation);
                                                  }}>
                                    {customerMap[reservation.customerId]?.name ?? '-'}
                                </StyledSingleName>
                            ))
                        : (
                            <StyledCountButton type="button"
                                               aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 ${dateReservations.length}건 보기`}
                                               onClick={(e) => {
                                                   e.stopPropagation();
                                                   setReservationListFilter({type: 'date', dateKey});
                                               }}>
                                {dateReservations.length}
                            </StyledCountButton>
                        )
                )}
            </StyledDate>);
        })}
    </>);
};

/** 칸에 이름을 그대로 둘 수 있는 최대 건수. 넘으면 숫자로 접는다. */
const MOBILE_MAX_NAMES = 1;
const DESKTOP_MAX_NAMES = 3;

/* 이름 한 줄 — 누르면 그 예약 상세로 바로 간다(목록을 거칠 이유가 없다). */
const StyledSingleName = styled.button`
    padding: 0 2px;
    border: none;
    background: none;
    color: var(--black-color);
    font-size: var(--tiny-font);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

/* 담을 수 있는 수를 넘겼을 때 — 숫자만. 내용은 목록(모바일은 달력 아래, 데스크톱은 모달)이 받는다. */
const StyledCountButton = styled.button`
    align-self: center;
    min-width: 18px;
    padding: 0 5px;
    border: none;
    border-radius: var(--chip-radius);
    background-color: var(--brand-color-bg);
    color: var(--brand-color);
    font-size: var(--tiny-font);
    font-weight: 700;
    line-height: 18px;
`;

const StyledDateHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StyledDate = styled.li<{ type: string, $closedKind: StoreClosedKind | null }>`
    ${props => storeClosedCss(props.$closedKind)}
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
