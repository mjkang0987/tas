import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {
    isTodayValue,
    ViewType,
} from '../../../utils/constants';

import {Timeline} from './Timeline';
import {Num} from './Num';

interface WeekDatesType {
    dates: Date[]
}

export const Week = ({
                         dates
                     }: WeekDatesType) => {
    const today = useCalendarStore((s) => s.today);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);

    const currentMonth = curr!.month;

    return (<>
            {dates.map((normalizedDate) => {
                const isAdjacentMonth = normalizedDate.getMonth() !== currentMonth;
                const isTodayDate = isTodayValue(
                    today,
                    normalizedDate.getFullYear(),
                    normalizedDate.getMonth(),
                    normalizedDate.getDate()
                );
                const dateNumber = normalizedDate.getDate();
                const dateLabel = isAdjacentMonth ? `${normalizedDate.getMonth() + 1}/${dateNumber}` : String(dateNumber);

                return <StyledWeek key={`week_${normalizedDate.getFullYear()}-${normalizedDate.getMonth()}-${dateNumber}`}>
                    <StyledNumWrap>
                        <Num onClick={() => {
                            setCurr(normalizedDate);
                            setView({type: ViewType.Day});
                        }}
                             isToday={isTodayDate}
                             compact={isAdjacentMonth}>{dateLabel}</Num>
                    </StyledNumWrap>
                    <Timeline fullYear={normalizedDate.getFullYear()}
                              month={normalizedDate.getMonth()}
                              date={dateNumber}
                              isToday={isTodayDate} />
                </StyledWeek>;
            })}
        </>
    );
};

const StyledWeek = styled.li`
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    text-align: center;

    &:after {
        content: "";
        position: absolute;
        right: 0;
        top: 0;
        width: 1px;
        height: 100%;
        background-color: var(--light-gray-color);
    }

    &:nth-child(7) {
        &:after {
            display: none;
        }
    }
`;

const StyledNumWrap = styled.span`
    display: flex;
    justify-content: center;
    position: sticky;
    top: 21px;
    width: 100%;
    background: rgba(255, 255, 255, .1);
    backdrop-filter: blur(.8px) saturate(180%);
    z-index: 13;

    &:after {
        content: "";
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        height: 50px;
        background: linear-gradient(0deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .8) 100%);
        pointer-events: none;
    }
`;
