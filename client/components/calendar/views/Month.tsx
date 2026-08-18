import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {
    isTodayValue,
} from '../../../utils/constants';

import {toDateKey} from '../../../utils/reservations';

import {getStoreClosedKind, STORE_CLOSED_LABEL} from '../../../features/store-settings/model';
import type {StoreClosedKind} from '../../../features/store-settings/model';

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
                                $closedKind={closedKind}
                                title={closedKind ? STORE_CLOSED_LABEL[closedKind] : undefined}>
                <StyledDateHeader>
                    <Num onClick={() => setReservationListFilter({type: 'date', dateKey})}
                         aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 ${dateReservations.length}건 보기`}
                         isToday={isTodayDate}
                         compact={isAdjacentMonth}
                         className={isAdjacentMonth ? 'faded' : undefined}>{dateLabel}</Num>
                    <ButtonAdd onClick={() => setCreateReservationInitial({date: toDateKey(fullYear, currMonth, val), startTime: '10:00'})}
                               aria-label={`${normalizedDate.getMonth() + 1}월 ${normalizedDate.getDate()}일 예약 추가`}/>
                </StyledDateHeader>
                {/* 휴무는 상단 색 띠 + 틴트로만 보인다(글자 없음). 화면에 안 보이는 만큼
                    스크린리더용 문구를 남긴다 — 색만으로는 아무것도 전달되지 않는다. */}
                {closedKind && <span className="a11y">{STORE_CLOSED_LABEL[closedKind]}</span>}
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

    /* 휴무 표시 = 상단 3px 색 띠 + 옅은 틴트. 글자를 쓰지 않으므로 좁은 모바일 셀에서도
       자리를 다투지 않는다(배지는 390px 주별 열에서 넘쳤다). 종류는 색으로 구분. */
    ${props => props.$closedKind && `
    position: relative;
    background-color: ${props.$closedKind === 'date' ? 'var(--danger-bg)' : 'var(--neutral-bg)'};

    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background-color: ${props.$closedKind === 'date' ? 'var(--danger-color)' : 'var(--dark-gray-color2)'};
      pointer-events: none;
    }
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
