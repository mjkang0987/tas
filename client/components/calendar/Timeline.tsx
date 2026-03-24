import React from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    ViewType
} from '../../utils/constants';

import {calcTimelinePosition} from '../../utils/calcTimelinePosition';

import {toDateKey} from '../../utils/reservations';

export const Timeline = ({
    fullYear,
    month,
    date,
    isToday
}: { isToday: boolean, fullYear: number, month: number, date: number }) => {

    const view = useCalendarStore((s) => s.view);
    const {type} = view;
    const time = useCalendarStore((s) => s.time);
    const setPosition = useCalendarStore((s) => s.setMousePosition);
    const reservationMap = useCalendarStore((s) => s.reservationMap);

    const {start, end} = time;

    const dateKey = toDateKey(fullYear, month, date);
    const reservations = reservationMap[dateKey] || [];
    const paddingTop = type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;

    const today = new Date();
    const hour = today.getHours();
    const minutes = today.getMinutes();
    const seconds = today.getSeconds();

    const timing = ((end - hour) * 3600) - (minutes * 60) - seconds;
    const top = ((hour - start) * 80) + (minutes * 4 / 3);
    const full = (end - start) * 80;

    const setMousePositionHandler = (e: React.MouseEvent<HTMLDivElement>) => {
        calcTimelinePosition({
            event: e,
            type,
            setPosition,
            fullYear,
            month,
            date,
            start,
            end
        });
    };

    return (<StyledTimelineWrap onClick={setMousePositionHandler}
                                type={type}
                                $timing={timing}
                                $top={top}
                                $full={full}>
        {isToday && <StyledBar/>}
        {reservations.map((r) => {
            const [sH, sM] = r.startTime.split(':').map(Number);
            const [eH, eM] = r.endTime.split(':').map(Number);
            const blockTop = (sH - start) * 80 + sM * 4 / 3 + paddingTop;
            const blockHeight = (eH - sH) * 80 + (eM - sM) * 4 / 3;

            return (<StyledReservationBlock key={r.id}
                                            $top={blockTop}
                                            $height={blockHeight}>
                <strong>{r.service}</strong>
                <span>{r.name}</span>
            </StyledReservationBlock>);
        })}
    </StyledTimelineWrap>);
};
const StyledTimelineWrap = styled.div<{
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void,
    type: string,
    $timing: number,
    $top: number,
    $full: number
}>`
  --bar-top: ${props => props.$top ? props.$top : 0}px;
  --timeline-height: ${props => props.$full ? props.$full : 10 * 80}px;

  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  padding: ${props => props.type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP}px 5px 0;
  box-sizing: border-box;

  > span {
    top: ${props => props.type === ViewType.Day ? 50 : 20}px;
    animation: down ${props => props.$timing ? props.$timing : 10 * 3600}s linear;
  }
`;

const StyledBar = styled.span`
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--orange-color);
  pointer-events: none;

  &:before {
    content: "";
    position: absolute;
    top: -4px;
    left: 0;
    width: 10px;
    height: 10px;
    background-color: var(--orange-color);
    border-radius: 100%;
  }
`;

const StyledReservationBlock = styled.div<{ $top: number; $height: number }>`
  position: absolute;
  top: ${props => props.$top}px;
  left: 5px;
  right: 5px;
  height: ${props => props.$height}px;
  background-color: rgba(66, 133, 244, 0.85);
  border-radius: 4px;
  padding: 2px 6px;
  color: #fff;
  font-size: 12px;
  overflow: hidden;
  pointer-events: none;
  box-sizing: border-box;

  strong {
    display: block;
    font-weight: 600;
  }

  span {
    font-size: 11px;
    opacity: 0.9;
  }
`;

