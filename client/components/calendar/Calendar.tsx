import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {ViewType} from '../../utils/constants';

import {Days} from './Days';
import {Year} from './Year';
import {WeekWrap} from './WeekWrap';
import {MonthWrap} from './MonthWrap';
import {TimelineTitle} from './TimelineTitle';
import {Day} from './Day';

interface DaysType {
    type: string | null;
}

export const Calendar = () => {
    const view = useCalendarStore((s) => s.view);
    const {type} = view;

    return (
        <>
            {(type !== ViewType.Year) && <>
                <StyledDaysWrap type={type}>
                    {type !== ViewType.Month && <TimelineTitle/>}
                    {type !== ViewType.Day && <Days/>}
                    {type === ViewType.Day && <Day/>}
                    {(type === ViewType.Week || type === ViewType.Three) && <WeekWrap type={type}/>}
                </StyledDaysWrap>

                {type === ViewType.Month && <MonthWrap/>}
            </>}

            {(type === ViewType.Year) && <Year/>}
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
