import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {computeTargetDerived} from '../../utils/calendarDerived';

import {
    isTodayValue,
    ViewType
} from '../../utils/constants';

import {toDateKey} from '../../utils/reservations';

import {Num} from './Num';

interface MonthType {
    monthDates: number[];
    currMonth: number;
    type: string;
}

export const Month = ({
    monthDates,
    currMonth,
    type
}: MonthType) => {
    const today = useCalendarStore((s) => s.today);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);
    const reservationMap = useCalendarStore((s) => s.reservationMap);

    const fullYear = curr!.fullYear;

    return (<>
        {monthDates.map((val, index) => {
            const count = (reservationMap[toDateKey(fullYear, currMonth, val)] || []).length;

            return (<StyledDate key={`month_${val + index}`} type={type}>
                <Num onClick={() => {
                    setCurr(new Date(fullYear, currMonth, val));
                    setView({type: ViewType.Day});
                }}
                     isToday={isTodayValue(today, fullYear, currMonth, +val)}>{val}</Num>
                {count > 0 && <StyledBadge>{count}</StyledBadge>}
            </StyledDate>);
        })}
    </>);
};

const StyledDate = styled.li<{ type: string }>`
  padding: 5px;
  text-align: center;
  border-right: 1px solid var(--light-gray-color);
  border-top: 1px solid var(--light-gray-color);

  &:nth-child(7n) {
    border-right: none;
  }

  &:nth-child(-n+7) {
    border-top: none;
  }

  ${props => (props.type === 'prev' || props.type === 'next') && `button {
    color: var(--gray-color);
  }
  `}
`;

const StyledBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background-color: rgba(66, 133, 244, 0.85);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
`;
