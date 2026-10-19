import {useEffect, useMemo, useRef} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {
    DAYS,
    isTodayValue,
    TIMELINE_WEEK_HEADING,
    ViewType,
} from '../../../utils/constants';

import {Timeline} from './Timeline';

const WEEKDAY_KO = Object.keys(DAYS).map((key) => DAYS[key].ko);

interface WeekDatesType {
    dates: Date[]
}

export const Week = ({
                         dates
                     }: WeekDatesType) => {
    const today = useCalendarStore((s) => s.today);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setView = useCalendarStore((s) => s.setView);

    const currentMonth = curr!.month;

    // 모바일 주 뷰는 칸이 화면보다 넓어 가로로 스크롤한다(Calendar.tsx). 그대로 두면 늘
    // 일요일부터 열려, 주 후반이면 오늘을 보려고 매번 밀어야 한다. 열 때 오늘 칸을 가운데로 놓는다.
    //
    // deps 가 비어 있는 건 의도다 — 뷰를 열 때 한 번만. dates 를 넣으면 같은 주 안에서
    // 다른 날을 고를 때마다 스크롤이 오늘로 되돌아가 방금 고른 날이 화면 밖으로 밀린다.
    const todayRef = useRef<HTMLLIElement | null>(null);
    useEffect(() => {
        // block: 'nearest' — 세로는 건드리지 않는다. 같은 시점에 Timeline 이 현재시각으로
        // 세로 스크롤하는데, 여기서 세로까지 움직이면 서로 밀어낸다.
        todayRef.current?.scrollIntoView({block: 'nearest', inline: 'center'});
    }, []);

    return (<>
            {dates.map((normalizedDate) => {
                const isAdjacentMonth = normalizedDate.getMonth() !== currentMonth;
                const isTodayDate = isTodayValue(
                    today,
                    normalizedDate.getFullYear(),
                    normalizedDate.getMonth(),
                    normalizedDate.getDate()
                );
                const dateNumber = normalizedDate.getDate();
                // iOS 와 같은 "10.14 수" — 요일 줄을 따로 두지 않으므로 요일까지 여기서 적는다.
                const dateLabel = `${normalizedDate.getMonth() + 1}.${dateNumber} ${WEEKDAY_KO[normalizedDate.getDay()]}`;

                return <StyledWeek key={`week_${normalizedDate.getFullYear()}-${normalizedDate.getMonth()}-${dateNumber}`}
                                   ref={isTodayDate ? todayRef : undefined}>
                    <StyledNumWrap>
                        <StyledDayHeading type="button"
                                          onClick={() => {
                                              setCurr(normalizedDate);
                                              setView({type: ViewType.Day});
                                          }}
                                          aria-label={`${normalizedDate.getMonth() + 1}월 ${dateNumber}일 보기`}
                                          $isToday={isTodayDate}
                                          $faded={isAdjacentMonth}>{dateLabel}</StyledDayHeading>
                    </StyledNumWrap>
                    <Timeline fullYear={normalizedDate.getFullYear()}
                              month={normalizedDate.getMonth()}
                              date={dateNumber}
                              isToday={isTodayDate} />
                </StyledWeek>;
            })}
        </>
    );
};

/* iOS 는 날짜를 원으로 칠하지 않고 "10.14 수" 를 키컬러 볼드로 쓴다. 같은 규칙.
   칸 전체 폭을 눌리게 해 글자가 작아도 터치 타깃을 잃지 않는다. */
const StyledDayHeading = styled.button<{ $isToday: boolean; $faded: boolean }>`
    width: 100%;
    /* 시간축 라벨이 이 높이만큼 내려 정시선에 맞춘다(TimelineTitle) — min-height 로 두면 글꼴 따라 커져 어긋난다. */
    height: ${TIMELINE_WEEK_HEADING}px;
    padding: 4px 2px;
    border: none;
    background: none;
    font-size: var(--small-font);
    font-weight: ${props => props.$isToday ? 700 : 500};
    color: ${props => props.$isToday ? 'var(--brand-color)' : props.$faded ? 'var(--gray-color)' : 'var(--black-color)'};
    white-space: nowrap;
`;

const StyledWeek = styled.li`
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    text-align: center;

    &:after {
        content: "";
        position: absolute;
        right: 0;
        top: 0;
        width: 1px;
        height: 100%;
        background-color: var(--calendar-grid-line);
    }

    &:nth-child(7) {
        &:after {
            display: none;
        }
    }
`;

const StyledNumWrap = styled.span`
    display: flex;
    justify-content: center;
    position: sticky;
    /* 요일 줄이 없어졌으므로 맨 위에 붙는다(전에는 그 21px 아래였다). */
    top: 0;
    width: 100%;
    /* 요일 헤더와 같은 바탕 — 두 줄이 한 머리줄로 읽혀야 한다. */
    background: var(--white-color);
    /* 머리줄 밑으로 카드가 지나간다. 선 대신 옅은 그림자로 경계를 줘야
       카드가 "잘린" 게 아니라 "들어간" 것으로 읽힌다. */
    box-shadow: 0 2px 4px rgba(15, 23, 42, .06);
    z-index: 13;
`;
