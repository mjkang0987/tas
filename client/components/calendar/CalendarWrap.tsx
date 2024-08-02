import React, {ReactNode} from 'react';
import styled from 'styled-components';

import {
    useRecoilValue
} from 'recoil';
import {
    targetState,
    viewState
} from '../../recoil/atoms';

import {useCurrentReservations} from '../../hooks/useCurrentReservations';

import {ViewType} from '../../utils/constants';

import {DaysComponent} from './Days';
import {YearComponents} from './Year';
import {WeekWrapComponent} from './WeekWrap';
import {MonthWrapComponent} from './MonthWrap';
import {TimelineTitleComponent} from './TimelineTitle';
import {DayComponent} from './Day';

interface DaysType {
    type: string | null;
    children: ReactNode;
}

export const CalendarComponent = () => {
    const view = useRecoilValue(viewState);
    const {type} = view;

    const currValue = useRecoilValue(targetState);

    const {
        fullYear,
        month
    } = currValue;

    useCurrentReservations({
        fullYear,
        month: month + 1,
        dependencies: [fullYear, month]
    });

    return (
        <>
            {(type !== ViewType.Year) && <>
                <StyledDaysWrap type={type}>
                    {type !== ViewType.Month && <TimelineTitleComponent/>}
                    {type !== ViewType.Day && <DaysComponent/>}
                    {type === ViewType.Day && <DayComponent/>}
                    {(type === ViewType.Week || type === ViewType.Three) && <WeekWrapComponent type={type}/>}
                </StyledDaysWrap>

                {type === ViewType.Month && <MonthWrapComponent/>}
            </>}

            {(type === ViewType.Year) && <YearComponents/>}
        </>
    );
};

const StyledDaysWrap = styled.div <DaysType>`
  display: grid;
  width: 100%;
  
  ${props => props.type !== ViewType.Month && `
  grid-template-columns: 80px 1fr;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  
  > div {
    grid-row: 2 / 3;
  }
  
  > ul {
    grid-column: 2 / 3;
  }
  `}

  > ul {
  grid-template-columns: repeat(${props => props.type === ViewType.Three ? 3 : 7}, 1fr);
  }
}
`;
