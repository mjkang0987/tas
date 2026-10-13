import {useMemo} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {
    isTodayValue,
    ViewType,
} from '../../../utils/constants';

import type {Reservation} from '../../../utils/reservations';

import {useCalendarStore} from '../../../store/calendarStore';

import {setRouter} from '../../../utils/router';

import {getMonthlyRevenue} from '../../../utils/revenue';
import {formatPrice} from '../../../utils/services';

import {Num} from './Num';

export const Year = () => {
    const router = useRouter();
    const today = useCalendarStore((s) => s.today);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const reservationListFilter = useCalendarStore((s) => s.reservationListFilter);

    const {fullYear} = currValue;

    const months = Array.from({length: 12}, (_, index) => index);

    const monthlyReservations = useMemo(() => {
        const grouped: Reservation[][] = Array.from({length: 12}, () => []);

        for (const [key, list] of Object.entries(reservationMap)) {
            const [y, m] = key.split('-').map(Number);
            if (y === fullYear) {
                grouped[m - 1].push(...list.filter((reservation) => (
                    calendarAssigneeId == null || (calendarAssigneeId === 0 ? !reservation.assigneeId : reservation.assigneeId === calendarAssigneeId)
                )));
            }
        }

        return grouped;
    }, [reservationMap, fullYear, calendarAssigneeId]);

    // 매출은 매출 화면과 같은 집계(getMonthlyRevenue)를 쓰되 'booked' 모드 —
    // 취소·노쇼를 뺀 확정 예약 기준이다. 'completed'(시술 완료 처리된 건)로 잡으면
    // 완료 처리를 쓰지 않는 운영에서 늘 0원이 된다. iOS 연 뷰도 같은 기준이다.
    const monthlyRevenue = useMemo(
        () => months.map((m) => getMonthlyRevenue(reservationMap, fullYear, m, calendarAssigneeId ?? null, 'booked').total),
        [months, reservationMap, fullYear, calendarAssigneeId],
    );

    return (<StyledYear>
        {today && months.map((m) =>
            <StyledMonth key={`${fullYear}_${m}`}
                         $active={reservationListFilter?.type === 'month' && reservationListFilter.year === fullYear && reservationListFilter.month === m}>
                <StyledMonthHeader>
                    <Num onClick={() => {
                        const monthDate = new Date(fullYear, m, 1);
                        setCurr(monthDate);
                        setView({type: ViewType.Month});
                        setRouter({
                            type: ViewType.Month,
                            year: monthDate.getFullYear(),
                            month: monthDate.getMonth() + 1,
                            date: 1,
                            router,
                        });
                    }}
                         isToday={isTodayValue(today, +fullYear, m, today.getDate())}
                         isSelected={reservationListFilter?.type === 'month' && reservationListFilter.year === fullYear && reservationListFilter.month === m}>{m + 1}</Num>
                </StyledMonthHeader>
                {monthlyReservations[m].length > 0 && (
                    <StyledMonthSummary type="button"
                                        aria-label={`${m + 1}월 예약 ${monthlyReservations[m].length}건 보기`}
                                        onClick={() => setReservationListFilter({type: 'month', year: fullYear, month: m})}>
                        <StyledMonthCount>{monthlyReservations[m].length}건</StyledMonthCount>
                        <StyledMonthRevenue>{formatPrice(monthlyRevenue[m])}</StyledMonthRevenue>
                    </StyledMonthSummary>
                )}
            </StyledMonth>
        )}
    </StyledYear>);
};

/* 월 칸 요약 — 건수 + 매출. iOS 연 뷰(monthlySummaries)와 같은 구성이다. */
const StyledMonthSummary = styled.button`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 0;
    border: none;
    background: none;
`;

const StyledMonthCount = styled.span`
    color: var(--brand-color);
    font-size: var(--tiny-font);
    font-weight: 600;
`;

const StyledMonthRevenue = styled.span`
    color: var(--dark-gray-color2);
    font-size: var(--tiny-font);
`;

const StyledYear = styled.ul`
    display: grid;
    /* 한 줄에 4개월씩 3줄. */
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, 1fr);
    width: 100%;
    height: 100%;

    /* 모바일은 칸에 카드 몇 장뿐이라 화면을 꽉 채울 이유가 없다. 내용 높이로 줄여
       위로 붙이고, 남는 자리는 아래 예약 목록이 쓴다(월 뷰 MonthWrap 과 같은 처리). */
    @media (max-width: 640px) {
        flex: 0 0 auto;
        height: auto;
        grid-template-rows: repeat(3, minmax(64px, auto));
    }
    gap: 5px;
    padding: 5px;
    box-sizing: border-box;
`;

const StyledMonthHeader = styled.div`
    display: flex;
    align-items: center;
    /* 예약추가 버튼을 걷고 숫자만 남았다 — space-between 이면 왼쪽으로 밀린다(월 뷰와 동일). */
    justify-content: center;
    width: 100%;
    padding: 0 4px;
    box-sizing: border-box;
`;

const StyledMonth = styled.li<{ $active: boolean }>`
    /* 목록이 열린 달. 선택 표시는 숫자 원(Num)이 맡고, 데스크톱만 바탕을 옅게 깐다(월 뷰와 동일). */
    ${props => props.$active && `
    @media (min-width: 641px) {
        background-color: var(--brand-color-bg);
    }
    `}
    overflow-y: auto;
    overscroll-behavior: auto;
    display: flex;
    flex-direction: column;
    align-self: stretch;
    align-items: center;
    position: relative;
    padding: 3px;
    box-sizing: border-box;
    border-radius: 5px;
    background-color: var(--black-color-10);
    text-align: center;
`;
