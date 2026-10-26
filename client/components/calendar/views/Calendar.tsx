import styled from 'styled-components';

import {useMemo} from 'react';

import {useCalendarStore} from '../../../store/calendarStore';
import {useMediaQuery} from '../../../hooks/useMediaQuery';
import {getRangeDates} from '../../../utils/weekDates';
import {toDateKey} from '../../../utils/reservations';
import {maxLanesOfDay} from '../../../features/reservations/weekLanes';

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
    const target = useCalendarStore((s) => s.target);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
    const isNarrow = useMediaQuery('(max-width: 640px)');

    // 겹친 예약을 접지 않고 좌우로 나눠 보여주려면 그날 칸이 그만큼 넓어야 한다.
    // 날짜마다 필요한 칸 수를 재서 칼럼 폭 배열을 만든다(iOS WeekTimelineView 와 같은 규칙).
    const weekColumns = useMemo(() => {
        if (type !== ViewType.Week) return null;

        return getRangeDates(target.full, type).map((date) => {
            const list = (reservationMap[toDateKey(date.getFullYear(), date.getMonth(), date.getDate())] ?? [])
                .filter((reservation) => (
                    calendarAssigneeId == null
                    || (calendarAssigneeId === 0 ? !reservation.assigneeId : reservation.assigneeId === calendarAssigneeId)
                ));
            const lanes = maxLanesOfDay(list);
            // 모바일은 읽히는 폭(--week-col)을 못박고 넘치면 가로로 스크롤한다.
            // 데스크톱은 화면에 다 들어가므로 비율(fr)로 나눠 겹친 날만 넓어지게 한다.
            // minmax(0, ...) 인 이유: 맨 fr 은 바닥이 min-content 라 한 날이 크게 넓어지면
            // 나머지가 더 못 줄고 격자가 통째로 넘친다 — 데스크톱은 overflow-x 가 없어 잘린다.
            return isNarrow ? `calc(var(--week-col) * ${lanes})` : `minmax(0, ${lanes}fr)`;
        }).join(' ');
    }, [isNarrow, type, target, reservationMap, calendarAssigneeId]);

    return (
        <>
            {(type !== ViewType.Year) && <>
                {/* key 로 뷰 종류마다 새 노드를 만든다. 주 뷰에서 가로로 스크롤한 위치가 그대로 남으면
                    일·3일 뷰는 overflow-x: hidden 이라 되돌릴 수단 없이 시간축이 화면 밖으로 밀린다. */}
                <StyledDaysWrap key={type ?? 'none'} type={type} $weekColumns={weekColumns}>
                    {type !== ViewType.Month && <TimelineTitle/>}
                    {/* 요일 줄은 월 뷰만 쓴다. 주·3일은 날짜 머리줄이 "10.14 수" 로 요일까지 안아
                        두 줄(21+30px)을 한 줄로 줄인다(iOS DayColumnsTimelineView 와 같은 모양). */}
                    {type === ViewType.Month && <Days/>}
                    {type === ViewType.Day && <Day/>}
                    {(type === ViewType.Week || type === ViewType.Three) && <WeekWrap type={type}/>}
                </StyledDaysWrap>

                {type === ViewType.Month && <MonthWrap/>}
            </>}

            {(type === ViewType.Year) && <Year/>}
        </>
    );
};

const StyledDaysWrap = styled.div <DaysType & {$weekColumns: string | null}>`
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
  /* 주 뷰는 날짜마다 폭이 다르다 — 겹친 수만큼 넓어진다(weekColumns). */
  grid-template-columns: ${props => props.$weekColumns ?? `repeat(${props.type === ViewType.Three ? 3 : 7}, 1fr)`};
  }

  ${props => props.type === ViewType.Week && `
  /* 모바일 주 뷰는 7등분하면 한 칸이 47px 라 이름이 말줄임된다.
     칸을 화면에 맞추는 대신 읽히는 폭(--week-col)을 먼저 주고 가로로 스크롤한다.
     드래그는 모바일에서 이미 꺼져 있어(Buttons.tsx 의 .drag-handle) 제스처가 겹치지 않는다. */
  @media (max-width: 640px) {
    overflow-x: auto;
    /* 1fr 은 컨테이너를 넘지 못해 스크롤이 생기지 않는다. 폭이 이미 확정돼 있으므로
       max-content(브라우저가 재측정)가 아니라 계산식으로 못박는다. */
    grid-template-columns: var(--timeline-col) max-content;

    /* 시간축을 왼쪽에 붙들어 둔다. 흘러가면 몇 시 예약인지 읽을 수 없다.
       세로로만 스크롤할 때 쓰던 반투명(+backdrop-filter)을 여기선 쓰지 않는다 —
       가로로도 흐르면 지나가는 칼럼이 시각 뒤로 비쳐 겹쳐 읽히고, 그보다
       sticky + backdrop-filter + 스크롤 컨테이너 조합이 월 -> 주 전환 직후
       빈 합성 레이어로 남아 시간축이 통째로 안 그려지는 일이 있었다. */
    > div {
      position: sticky;
      left: 0;
      z-index: 14; /* 요일 헤더 13 위 */
      background: var(--surface-color);
    }

    /* 1행 왼쪽 모서리. 시간축은 2행만 차지해 여기가 비고, 가로로 스크롤된
       요일·날짜가 그 틈으로 비친다. 스프레드시트의 고정 모서리와 같은 자리다. */
    &::before {
      content: '';
      grid-row: 1 / 2;
      grid-column: 1 / 2;
      position: sticky;
      left: 0;
      z-index: 15; /* 날짜 헤더 13·시간축 14 위 */
      background: var(--surface-color);
    }

    /* 날짜마다 폭이 다르다 — 겹친 수만큼 넓어진다. 두 줄(요일 헤더·칼럼)이 같은 배열을 써야 어긋나지 않는다. */
    > ul {
      grid-template-columns: ${props.$weekColumns ?? `repeat(7, var(--week-col))`};
    }
  }
  `}
}
`;
