
import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {Month} from './Month';

export const MonthWrap = () => {
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target])!;

    const {
        month,
        monthFirstDay,
        monthPrevLastNumber,
        monthLastNumber,
        monthLastDay
    } = curr;

    const arrayPrev = () => {
        return +monthFirstDay < 7 && new Array(monthFirstDay).fill(0).reduce((acc, curr, i) => [+monthPrevLastNumber - i, ...acc], []);
    };

    const arrayCurrent = () => {
        return new Array(monthLastNumber).fill(0).reduce((acc, _, i) => [...acc, i + 1], []);
    };

    const arrayNext = () => {
        return +monthLastDay < 6 && new Array(6 - +monthLastDay).fill(0).reduce((acc, _, i) => [...acc, i + 1], []);
    };

    return (<StyledMonthWrap>
            {arrayPrev() && <Month monthDates={arrayPrev()} currMonth={month - 1} type="prev"/>}
            <Month monthDates={arrayCurrent()} currMonth={month} type="current"/>
            {arrayNext() && <Month monthDates={arrayNext()} currMonth={month + 1} type="next"/>}
        </StyledMonthWrap>
    );
};

const StyledMonthWrap = styled.ul`
  /* 아래에 예약 목록이 붙어도 달력이 자리를 내주며 눌리지 않게.
     flex: 1 은 basis 0 이라 형제가 생기면 0 까지 쪼그라든다 — basis 를 auto 로 두고
     min-height 로 바닥을 깐다. 혼자 있을 때는 높이가 같아 보이는 모습이 그대로다. */
  flex: 1 0 auto;
  min-height: 100%;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  height: 100%;
  overflow: hidden;
`;

