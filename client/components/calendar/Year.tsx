import {useMemo} from 'react';

import styled from 'styled-components';

import {
    isTodayValue,
    ViewType
} from '../../utils/constants';

import {useCalendarStore} from '../../store/calendarStore';

import {Num} from './Num';

export const Year = () => {
    const today = useCalendarStore((s) => s.today);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);
    const reservationMap = useCalendarStore((s) => s.reservationMap);

    const {fullYear} = currValue;

    const months = Array.from({length: 12}, (_, index) => index);

    const monthlyCounts = useMemo(() => {
        const counts = new Array(12).fill(0);

        for (const [key, list] of Object.entries(reservationMap)) {
            const [y, m] = key.split('-').map(Number);
            if (y === fullYear) {
                counts[m - 1] += list.length;
            }
        }

        return counts;
    }, [reservationMap, fullYear]);

    return (<StyledYear>
            {today && months.map((m) =>
                <StyledMonth key={`${fullYear}_${m}`}>
                    <Num onClick={() => {
                        setCurr(new Date(fullYear, m, 1));
                        setView({type: ViewType.Month});
                    }} isToday={isTodayValue(today, +fullYear, m, today.getDate())}>{m + 1}</Num>
                    {monthlyCounts[m] > 0 && <StyledBadge>{monthlyCounts[m]}</StyledBadge>}
                </StyledMonth>
            )}
        </StyledYear>);
};

const StyledYear = styled.ul `
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
`;

const StyledMonth = styled.li`
  position: relative;
  width: ${100 / 3}%;
  height: ${100 / 4}%;
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
