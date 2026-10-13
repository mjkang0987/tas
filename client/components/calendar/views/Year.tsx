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

import {useMediaQuery} from '../../../hooks/useMediaQuery';

import {Num} from './Num';
import {ReservationList} from './ReservationList';

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
    // 월 뷰와 같은 규칙 — 칸에 담을 수 있으면 카드, 넘치면 숫자. 연 뷰 칸은 더 높아 상한이 크다.
    const isNarrow = useMediaQuery('(max-width: 640px)');
    const maxCards = isNarrow ? MOBILE_MAX_CARDS : DESKTOP_MAX_CARDS;

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
                    monthlyReservations[m].length > maxCards
                        ? (
                            <StyledCountButton type="button"
                                               aria-label={`${m + 1}월 예약 ${monthlyReservations[m].length}건 보기`}
                                               onClick={() => setReservationListFilter({type: 'month', year: fullYear, month: m})}>
                                {monthlyReservations[m].length}
                            </StyledCountButton>
                        )
                        : (
                            <ReservationList reservations={monthlyReservations[m]}
                                             variant="month"
                                             onViewAll={() => setReservationListFilter({type: 'month', year: fullYear, month: m})}
                                             hideViewAll/>
                        )
                )}
            </StyledMonth>
        )}
    </StyledYear>);
};

/** 칸에 카드를 그대로 둘 수 있는 최대 건수. 넘으면 숫자로 접는다(월 뷰와 같은 규칙). */
const MOBILE_MAX_CARDS = 3;
const DESKTOP_MAX_CARDS = 3;

/* 월 뷰 StyledCountButton 과 같은 모양 — accent 평문 숫자. */
const StyledCountButton = styled.button`
    align-self: center;
    padding: 0;
    border: none;
    background: none;
    color: var(--brand-color);
    font-size: var(--tiny-font);
    font-weight: 600;
`;

const StyledYear = styled.ul`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    width: 100%;
    height: 100%;
    gap: 5px;
    padding: 5px;
    box-sizing: border-box;
`;

const StyledMonthHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
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
