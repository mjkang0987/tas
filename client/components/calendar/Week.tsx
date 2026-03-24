import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {computeTargetDerived} from '../../utils/calendarDerived';

import {
    isTodayValue,
    ViewType,
} from '../../utils/constants';

import {Timeline} from './Timeline';
import {Num} from './Num';

interface WeekDatesType {
    currMonth: number
    weekDates: number[]
}

export const Week = ({
    currMonth,
    weekDates
}: WeekDatesType) => {
    const today = useCalendarStore((s) => s.today);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);

    const fullYear = curr!.fullYear;

    return (<>
            {weekDates.map((w: number) => <StyledWeek key={`week_${w}`}>
                <StyledNumWrap>
                    <Num onClick={() => {
                        setCurr(new Date(fullYear, currMonth, w));
                        setView({type: ViewType.Day});
                    }}
                         isToday={isTodayValue(today, fullYear, currMonth, +w)}>{w}</Num>
                </StyledNumWrap>
                <Timeline fullYear={fullYear}
                                   month={currMonth}
                                   date={+w}
                                   isToday={isTodayValue(today, fullYear, currMonth, +w)}/>
            </StyledWeek>)}
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

  button {
    font-size: var(--default-font);
  }
`;

const StyledNumWrap = styled.span`
  display: flex;
  justify-content: center;
  position: sticky;
  top: 30px;
  width: 100%;
  background-color: var(--white-color-80);
  z-index: 1;

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