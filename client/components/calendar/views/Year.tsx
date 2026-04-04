import {useMemo} from 'react';

import styled from 'styled-components';

import {
    isTodayValue,
    ViewType,
} from '../../../utils/constants';

import type {Reservation} from '../../../utils/reservations';

import {useCalendarStore} from '../../../store/calendarStore';

import {toDateKey} from '../../../utils/reservations';

import {Num} from './Num';
import {ButtonAdd} from '../../ui/Buttons';
import {ReservationList} from './ReservationList';

export const Year = () => {
    const today = useCalendarStore((s) => s.today);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setReservationListFilter = useCalendarStore((s) => s.setReservationListFilter);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);

    const {fullYear} = currValue;

    const months = Array.from({length: 12}, (_, index) => index);

    const monthlyReservations = useMemo(() => {
        const grouped: Reservation[][] = Array.from({length: 12}, () => []);

        for (const [key, list] of Object.entries(reservationMap)) {
            const [y, m] = key.split('-').map(Number);
            if (y === fullYear) {
                grouped[m - 1].push(...list);
            }
        }

        return grouped;
    }, [reservationMap, fullYear]);

    return (<StyledYear>
        {today && months.map((m) =>
            <StyledMonth key={`${fullYear}_${m}`}>
                <StyledMonthHeader>
                    <Num onClick={() => {
                        setCurr(new Date(fullYear, m, 1));
                        setView({type: ViewType.Month});
                    }}
                         isToday={isTodayValue(today, +fullYear, m, today.getDate())}>{m + 1}</Num>
                    <ButtonAdd onClick={() => setCreateReservationInitial({date: toDateKey(fullYear, m, 1), startTime: '10:00'})}
                               aria-label={`${m + 1}월 예약 추가`}/>
                </StyledMonthHeader>
                {monthlyReservations[m].length > 0 && (
                    <ReservationList reservations={monthlyReservations[m]}
                                     variant="month"
                                     onViewAll={() => setReservationListFilter({type: 'month', year: fullYear, month: m})}/>
                )}
            </StyledMonth>
        )}
    </StyledYear>);
};

const StyledYear = styled.ul`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    width: 100%;
    height: 100%;
    gap: 5px;
    padding: 5px;
    box-sizing: border-box;

    @media (max-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(6, 1fr);
    }
`;

const StyledMonthHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 4px;
    box-sizing: border-box;
`;

const StyledMonth = styled.li`
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

