import {useMemo} from 'react';

import styled from 'styled-components';

import {
    ViewType,
    DAYS
} from '../../../utils/constants';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

interface DaysType {
    type: string | null;
}

const getDaysInRange = (day: number, type: string) => {
    const keys = Object.keys(DAYS);
    const start = type === ViewType.Three ? +day : 0;
    const end = type === ViewType.Three ? +day + 3 : 7;

    const result = keys.slice(start, end);

    if (result.length < 3) {
        return new Array(3 - result.length).fill(null).reduce((acc, _, i) => {
            return [...acc, keys[i]];
        }, [...result]);
    }

    return result;
};

export const Days = () => {
    const targetState = useCalendarStore((s) => s.target);
    const target = useMemo(() => computeTargetDerived(targetState), [targetState])!;
    const {day} = target;
    const view = useCalendarStore((s) => s.view);
    const {type} = view;


    return (<StyledDays type={type}>
            {getDaysInRange(day, type).map((day: string) =>
                <StyledDay key={DAYS[day].id}>
                    {DAYS[day].ko}
                </StyledDay>)}
        </StyledDays>
    );
};

const StyledDays = styled.ul <DaysType>`
    display: grid;
    justify-content: center;
    width: 100%;
    background: rgba(255, 255, 255, .1); /* 살짝만 흰색 */
    backdrop-filter: var(--sticky-backdrop);
    z-index: 13;

    /* 모바일 주 뷰는 가로로도 스크롤된다. 반투명이면 밑으로 지나간 예약 카드가
       그대로 비쳐 "카드 윗 보더가 잘렸다"처럼 읽힌다. 거기선 불투명하게 덮는다. */
    @media (max-width: 640px) {
        background: var(--bg-subtle-96);
        backdrop-filter: none;
    }
    
    ${props => (props.type !== ViewType.Month) && `
  position: sticky;
  top: 0;
  grid-row: 1 / 2;
      
  li {
    border: none;
  }
  `
    }
`;

const StyledDay = styled.li`
  flex: 1;
  text-align: center;
  padding: 4px 0 2px;
  font-size: var(--small-font);
  color: var(--black-color);
  border-right: 1px solid var(--light-gray-color);
  box-sizing: border-box;

  &:nth-child(7) {
    border-right: none;
  }
`;