import React, {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {computeTargetDerived} from '../../utils/calendarDerived';

import {
    ViewType
} from '../../utils/constants';

export const CalendarHeading = () => {
    const view = useCalendarStore((s) => s.view);
    const {type} = view;
    const currValue = useCalendarStore((s) => s.target);
    const {full, fullYear, month, date, day} = currValue;
    const curr = useMemo(() => computeTargetDerived(currValue), [currValue]);

    const setMonth = () => {
        if (type === ViewType.Day || type === ViewType.Month) {
            return +month + 1;
        }

        if (curr) {
            const baseDate = new Date(+fullYear, +month, +date);
            const endDate = new Date(baseDate);

            if (type === ViewType.Week) {
                endDate.setDate(baseDate.getDate() - +day + 6);
            } else {
                endDate.setDate(baseDate.getDate() + 2);
            }

            if (endDate.getMonth() !== +month || endDate.getFullYear() !== +fullYear) {
                const calcYear = endDate.getFullYear() !== +fullYear
                    ? `${endDate.getFullYear()} / ${endDate.getMonth() + 1}`
                    : endDate.getMonth() + 1;

                return `${+month + 1} - ${calcYear}`;
            }
        }

        if (curr && +date + (type === ViewType.Week ? 6 : 2) > curr.monthLastNumber) {
            const calcYear = month === 11 ? `${+fullYear + 1} / 1` : +month + 2;
            return `${+month + 1} - ${calcYear}`;
        }

        return `${+month + 1}`;
    }

    return (<StyledHeading>
            {full && <StyledDateWrap>
                <StyledDateElement>{+fullYear}</StyledDateElement>
                {type !== ViewType.Year && <StyledDateElement>
                    {setMonth()}
                </StyledDateElement>}
                {type === ViewType.Day && <StyledDateElement>{+date}</StyledDateElement>}
            </StyledDateWrap>}
        </StyledHeading>
    );
};

const StyledHeading = styled.h1`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledDateWrap = styled.span`
  display: inline-flex;
  align-items: center;
`;

const StyledDateElement = styled.span`
  display: inline-flex;
  font-size: var(--big-font);

  + span {
    &:before {
      content: "/";
      display: inline-flex;
      position: relative;
      margin: 0 4px;
    }
  }
`;
