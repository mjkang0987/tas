import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {computeTargetDerived} from '../../utils/calendarDerived';

import {
    ViewType
} from '../../utils/constants';

import {Week} from './Week';

interface WeekType {
    type: string
}

export const WeekWrap = ({
    type
}: WeekType) => {
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target])!;
    const view = useCalendarStore((s) => s.view);

    const {
        month,
        weekFirstNumber,
        monthPrevLastNumber,
    } = curr;

    const arrayCurrent = () => {
        if (type === ViewType.Week) {
            return curr.week();
        }
        if (type === ViewType.Three) {
            return curr.three();
        }
        return [];
    };

    const arrayPrev = () => {
        const prevCount = 7 - weekFirstNumber > -1 ? 7 - curr.week().length : 0;
        return new Array(prevCount).fill(monthPrevLastNumber).reduce((acc, curr, i) => [+curr - i, ...acc], []);
    };

    const arrayNext = () => {
        const nextCount = (view.type === ViewType.Week ? 7 : 3) - arrayCurrent().length - (view.type === ViewType.Week ? arrayPrev().length : 0);
        return new Array(nextCount).fill(1).reduce((acc, curr, i) => [...acc, curr + i], []);
    };

    return (<StyledWeeks>
            {view.type === ViewType.Week && <Week weekDates={arrayPrev()} currMonth={month -1} />}
            <Week weekDates={arrayCurrent()} currMonth={month} />
            <Week weekDates={arrayNext()} currMonth={month + 1} />
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