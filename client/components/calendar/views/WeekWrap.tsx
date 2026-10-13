import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {getRangeDates} from '../../../utils/weekDates';

import {Week} from './Week';

interface WeekType {
    type: string
}

export const WeekWrap = ({
    type
}: WeekType) => {
    const target = useCalendarStore((s) => s.target);
    const dates = useMemo(() => getRangeDates(target.full, type), [target, type]);

    return (<StyledWeeks>
            <Week dates={dates} />
        </StyledWeeks>
    );
};

const StyledWeeks = styled.ul`
  flex: 1;
  position: relative;
  display: grid;
  grid-row: 2 / 3;
  align-items: stretch;
`;
