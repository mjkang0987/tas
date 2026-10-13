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
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const reservationListFilter = useCalendarStore((s) => s.reservationListFilter);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
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
            // 아래(또는 모달) 목록이 열려 있는 날짜. 어느 칸을 보고 있는지 달력에서 짚어준다.
            const isActive = reservationListFilter?.type === 'date' && reservationListFilter.dateKey === dateKey;

            return (<StyledDate key={`month_${val + index}`}
                                type={type}
                                $active={isActive}
                                $closedKind={closedKind}>
                {closedKind && <span className="a11y">{STORE_CLOSED_LABEL[closedKind]}</span>}
                <StyledDateHeader>
                    <Num onClick={() => setReservationListFilter({type: 'date', dateKey})}
                         aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 ${dateReservations.length}건 보기`}
                         isToday={isTodayDate}
                         isSelected={isActive}
                         compact={isAdjacentMonth}
                         className={isAdjacentMonth ? 'faded' : undefined}>{dateLabel}</Num>
                </StyledDateHeader>
                {dateReservations.length > 0 && (
                    dateReservations.length > maxNames
                        ? (
                            <StyledCountButton type="button"
                                               aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 ${dateReservations.length}건 보기`}
                                               onClick={(e) => {
                                                   e.stopPropagation();
                                                   setReservationListFilter({type: 'date', dateKey});
                                               }}>
                                {dateReservations.length}
                            </StyledCountButton>
                        )
                        : (
                            <ReservationList reservations={dateReservations}
                                             variant="date"
                                             onViewAll={() => setReservationListFilter({type: 'date', dateKey})}
                                             hideViewAll/>
                        )
                )}
            </StyledDate>);
        })}
    </>);
};

/** 칸에 이름을 그대로 둘 수 있는 최대 건수. 넘으면 숫자로 접는다. */
const MOBILE_MAX_NAMES = 1;
const DESKTOP_MAX_NAMES = 3;


/* 담을 수 있는 수를 넘겼을 때 — 건수만. iOS monthDayCell 은 칩이 아니라
   accent 색 평문 숫자다(caption2 semibold). 같은 모양으로 둔다. */
const StyledCountButton = styled.button`
    align-self: center;
    padding: 0;
    border: none;
    background: none;
    color: var(--brand-color);
    font-size: var(--tiny-font);
    font-weight: 600;
`;

const StyledDateHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StyledDate = styled.li<{ type: string, $active: boolean, $closedKind: StoreClosedKind | null }>`
    ${props => storeClosedCss(props.$closedKind)}
    /* 선택 표시는 날짜 원(Num)이 맡는다 — iOS 와 같다.
       모바일은 칸 바탕을 깔지 않는다(원 하나로 충분하고 격자선도 없어 더 깨끗하다).
       칸이 넓어 원이 멀리 떨어져 보이는 데스크톱에서만 옅은 바탕을 남긴다. */
    ${props => props.$active && `
    @media (min-width: 641px) {
        background-color: var(--brand-color-bg);
    }
    `}
    display: flex;
    flex-direction: column;
    padding: 2px;
    text-align: center;
    overflow-y: auto;
    overscroll-behavior: auto;
    border-right: 1px solid var(--light-gray-color);
    border-top: 1px solid var(--light-gray-color);

    /* iOS 월 뷰는 격자선 없이 칸 사이 간격(4pt)으로만 나눈다. 모바일에서 그에 맞춘다. */
    @media (max-width: 640px) {
        border: none;
    }

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
