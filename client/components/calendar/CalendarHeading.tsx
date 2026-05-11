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
            const startDate = new Date(baseDate);
            const endDate = new Date(baseDate);

            if (type === ViewType.Week) {
                startDate.setDate(baseDate.getDate() - +day);
                endDate.setDate(startDate.getDate() + 6);
            } else {
                endDate.setDate(baseDate.getDate() + 2);
            }

            if (startDate.getMonth() !== endDate.getMonth() || startDate.getFullYear() !== endDate.getFullYear()) {
                const startLabel = startDate.getFullYear() !== endDate.getFullYear()
                    ? `${startDate.getFullYear()} / ${startDate.getMonth() + 1}`
                    : startDate.getMonth() + 1;
                const endLabel = endDate.getFullYear() !== startDate.getFullYear()
                    ? `${endDate.getFullYear()} / ${endDate.getMonth() + 1}`
                    : endDate.getMonth() + 1;

                return `${startLabel} - ${endLabel}`;
            }

            return `${startDate.getMonth() + 1}`;
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
