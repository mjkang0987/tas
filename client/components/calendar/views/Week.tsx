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
    // 일요일부터 열려, 주 후반이면 오늘을 보려고 매번 손으로 밀어야 한다. 오늘 칸을 가운데로 놓는다.
    //
    // scrollIntoView 를 쓰지 않는다 — 세로도 함께 움직여, 같은 시점에 현재시각으로
    // 스크롤하는 Timeline 의 효과와 싸운다. scrollLeft 만 건드린다.
    const todayRef = useRef<HTMLLIElement | null>(null);
    useEffect(() => {
        const todayColumn = todayRef.current;
        if (!todayColumn) return;

        let container: HTMLElement | null = todayColumn.parentElement;
        while (container && getComputedStyle(container).overflowX !== 'auto') {
            container = container.parentElement;
        }
        // 데스크톱은 7칸이 화면에 다 들어가 스크롤이 없다 — 건드릴 것도 없다.
        if (!container || container.scrollWidth <= container.clientWidth) return;

        const containerLeft = container.getBoundingClientRect().left;
        const columnRect = todayColumn.getBoundingClientRect();
        container.scrollLeft += (columnRect.left - containerLeft)
            - (container.clientWidth - columnRect.width) / 2;
    }, [dates]);

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
