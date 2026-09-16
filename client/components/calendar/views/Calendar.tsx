import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {ViewType} from '../../../utils/constants';

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
  grid-template-columns: var(--timeline-col) 1fr;
  grid-template-rows: auto 1fr;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: auto;

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

  ${props => props.type === ViewType.Week && `
  /* 모바일 주 뷰는 7등분하면 한 칸이 47px 라 이름이 말줄임된다.
     칸을 화면에 맞추는 대신 읽히는 폭(--week-col)을 먼저 주고 가로로 스크롤한다.
     드래그는 모바일에서 이미 꺼져 있어(Buttons.tsx 의 .drag-handle) 제스처가 겹치지 않는다. */
  @media (max-width: 640px) {
    overflow-x: auto;
    /* 1fr 은 컨테이너를 넘지 못해 스크롤이 생기지 않는다. 내용 폭을 그대로 쓴다. */
    grid-template-columns: var(--timeline-col) max-content;

    /* 시간축은 가로로 흘려보내지 않는다 — 흘러가면 몇 시 예약인지 읽을 수 없다.
       요일 헤더(z-index 13)보다 위에 둬야 스크롤 중에 덮이지 않는다.

       불투명 흰색으로 덮지 않는다 — 캘린더 바탕이 시간축에서만 끊겨 보인다.
       대신 sticky 헤더들(Days·Week 의 날짜 번호)이 쓰는 것과 같은 처리를 쓴다.
       완전 투명으로 두면 지나가는 날짜 숫자가 시각 뒤로 비쳐 겹쳐 읽힌다. */
    > div {
      position: sticky;
      left: 0;
      z-index: 14;
      background: rgba(255, 255, 255, .1);
      backdrop-filter: var(--sticky-backdrop);
    }

    > ul {
      grid-template-columns: repeat(7, var(--week-col));
    }
  }
  `}
}
`;
