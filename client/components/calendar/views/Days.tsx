import {useMemo} from 'react';

import styled from 'styled-components';

import {
    ViewType,
    DAYS
} from '../../../utils/constants';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {STORE_CLOSED_LABEL} from '../../../features/store-settings/model';
import {storeClosedCss} from './storeClosedCss';

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
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    // closedWeekdays 는 월요일=0 이고 이 머리줄은 일요일부터다. 칸 순서를 그 기준으로 옮긴다.
    const closedWeekdays = storeSettings.closedWeekdays ?? [];


    return (<StyledDays type={type}>
            {getDaysInRange(day, type).map((day: string, index: number) => {
                const isClosed = closedWeekdays.includes((index + 6) % 7);

                return <StyledDay key={DAYS[day].id} $closed={isClosed}>
                    {DAYS[day].ko}
                    {/* 색만으로는 스크린리더에 아무것도 전달되지 않는다(storeClosedCss 주석). */}
                    {isClosed && <span className="a11y">{STORE_CLOSED_LABEL.weekday}</span>}
                </StyledDay>;
            })}
        </StyledDays>
    );
};

const StyledDays = styled.ul <DaysType>`
    display: grid;
    justify-content: center;
    width: 100%;
    z-index: 13;

    /* 월 뷰 모바일은 날짜 격자(MonthWrap)가 좌우 12px 안으로 들어가고 칸 사이를 3px 띄운다.
       머리줄이 그걸 따라가지 않으면 칸 폭이 47.6 vs 53.6px 로 달라져, 가운데(수)만 맞고
       양끝으로 갈수록 요일과 날짜가 어긋난다(일요일에서 9px). 같은 격자를 쓴다. */
    ${props => (props.type === ViewType.Month) && `
  @media (max-width: 640px) {
    gap: 3px;
    padding: 0 12px;
    box-sizing: border-box;
  }
  `}

    /* 바탕은 sticky 로 뜨는 뷰(일·주·3일)에서만 깐다 — 밑으로 스크롤돼 지나가는 예약을
       가려야 해서다. 월 뷰 헤더는 고정도 아니고 가릴 것도 없어 바탕을 두지 않는다. */
    ${props => (props.type !== ViewType.Month) && `
  position: sticky;
  top: 0;
  grid-row: 1 / 2;
  /* 흰 바탕 — 페이지와 같은 색이라 눈에는 배경이 없지만, 밑으로 스크롤돼 지나가는
     카드는 가린다. 투명하게 두면 카드가 비쳐 "윗 보더가 잘린" 것처럼 읽힌다. */
  background: var(--white-color);
  `
    }
`;

const StyledDay = styled.li<{ $closed: boolean }>`
  ${props => props.$closed && storeClosedCss('weekday')}
  flex: 1;
  text-align: center;
  padding: 4px 0 2px;
  font-size: var(--small-font);
  color: var(--black-color);
  box-sizing: border-box;
`;