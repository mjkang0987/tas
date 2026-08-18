import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {
    isTodayValue,
} from '../../../utils/constants';

import {toDateKey} from '../../../utils/reservations';

import {getStoreClosedKind, STORE_CLOSED_LABEL_PARTS} from '../../../features/store-settings/model';
import type {StoreClosedKind} from '../../../features/store-settings/model';

import {Num} from './Num';
import {ButtonAdd} from '../../ui/Buttons';
import {LabelBadge} from '../../ui/LabelBadge';
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
    const storeSettings = useCalendarStore((s) => s.storeSettings);
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
            // 휴무 표시(설정 > 매장관리) — 임시 휴업일 / 정기 휴무(요일).
            const closedKind = getStoreClosedKind(storeSettings, dateKey);

            return (<StyledDate key={`month_${val + index}`}
                                type={type}
                                $closedKind={closedKind}>
                <StyledDateHeader>
                    <Num onClick={() => setReservationListFilter({type: 'date', dateKey})}
                         aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 ${dateReservations.length}건 보기`}
                         isToday={isTodayDate}
                         compact={isAdjacentMonth}
                         className={isAdjacentMonth ? 'faded' : undefined}>{dateLabel}</Num>
                    <ButtonAdd onClick={() => setCreateReservationInitial({date: toDateKey(fullYear, currMonth, val), startTime: '10:00'})}
                               aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 추가`}/>
                </StyledDateHeader>
                {/* 배지는 날짜 헤더 아래 한 줄로 — 헤더에 끼우면 모바일(셀 폭 ~56px)에서 셀 밖으로 나간다. */}
                {closedKind && (
                    <StyledClosedBadge $tone={closedKind === 'date' ? 'danger' : 'neutral'}>
                        {STORE_CLOSED_LABEL_PARTS[closedKind].map((part) => <span key={part}>{part}</span>)}
                    </StyledClosedBadge>
                )}
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

// 모바일 셀은 폭이 ~56px(390px 화면) 뿐이라 '정기휴무'가 한 줄로는 빠듯하다.
// 좁은 화면에서는 라벨 조각을 세로로 쌓아 '정기 / 휴무' 두 줄로 만든다
// (CSS 줄바꿈에 맡기면 한 글자씩 쪼개진다 — 라벨을 조각으로 나눠 둔 이유).
const StyledClosedBadge = styled(LabelBadge)`
    margin: 4px auto 2px;
    padding: 2px 4px;
    max-width: 100%;
    line-height: 1.15;
    font-size: var(--tiny-font);

    @media (max-width: 640px) {
        flex-direction: column;
    }
`;

const StyledDateHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StyledDate = styled.li<{ type: string; $closedKind?: StoreClosedKind }>`
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

    ${props => props.$closedKind && `
    background-color: ${props.$closedKind === 'date' ? 'var(--danger-bg)' : 'var(--neutral-bg)'};
  `}

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
    font-size: var(--tiny-font);
    font-weight: 600;
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--light-gray-color);
    }
    }
`;
