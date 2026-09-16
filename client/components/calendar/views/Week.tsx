import {useEffect, useMemo, useRef} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {computeTargetDerived} from '../../../utils/calendarDerived';

import {
    isTodayValue,
    ViewType,
} from '../../../utils/constants';

import {Timeline} from './Timeline';
import {Num} from './Num';

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
                const dateLabel = isAdjacentMonth ? `${normalizedDate.getMonth() + 1}/${dateNumber}` : String(dateNumber);

                return <StyledWeek key={`week_${normalizedDate.getFullYear()}-${normalizedDate.getMonth()}-${dateNumber}`}
                                   ref={isTodayDate ? todayRef : undefined}>
                    <StyledNumWrap>
                        <Num onClick={() => {
                            setCurr(normalizedDate);
                            setView({type: ViewType.Day});
                        }}
                             isToday={isTodayDate}
                             compact={isAdjacentMonth}>{dateLabel}</Num>
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
        background-color: var(--light-gray-color);
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
    top: 21px;
    width: 100%;
    background: rgba(255, 255, 255, .1);
    backdrop-filter: var(--sticky-backdrop);
    z-index: 13;
`;
