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
    z-index: 13;

    /* 바탕은 sticky 로 뜨는 뷰(일·주·3일)에서만 깐다 — 밑으로 스크롤돼 지나가는 예약을
       가려야 해서다. 월 뷰 헤더는 고정도 아니고 가릴 것도 없어 바탕을 두지 않는다. */
    ${props => (props.type !== ViewType.Month) && `
  position: sticky;
  top: 0;
  grid-row: 1 / 2;
  /* 페이지 바탕과 같은 흰색 — 눈에는 배경이 없지만, 밑으로 스크롤돼 지나가는 예약은 가린다.
     투명하게 두면 카드가 비쳐 "윗 보더가 잘린" 것처럼 읽힌다. */
  /* 흰 바탕 — 페이지와 같은 색이라 눈에는 배경이 없지만, 밑으로 스크롤돼 지나가는
     카드는 가린다. 투명하게 두면 카드가 비쳐 "윗 보더가 잘린" 것처럼 읽힌다. */
  background: var(--white-color);

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
  box-sizing: border-box;
`;