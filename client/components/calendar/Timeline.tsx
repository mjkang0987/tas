import React, {
    ReactNode,
    useState
} from 'react';

import styled from 'styled-components';

import {
    useRecoilState,
    useRecoilValue
} from 'recoil';

import {
    mousePositionState,
    timeState,
    viewState
} from '../../recoil/atoms';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    ViewType
} from '../../utils/constants';

import {useMousePosition} from '../../hooks/useMousePosition';

export const TimelineComponent = ({
    children,
    fullYear,
    month,
    date,
    isToday
}: { isToday: boolean, fullYear: number, month: number, date: number; children?: ReactNode }) => {

    const view = useRecoilValue(viewState);
    const {type} = view;

    const time = useRecoilValue(timeState);
    const [eventType, setEventType] = useState<null | React.MouseEvent>(null);
    const [position, setPosition] = useRecoilState(mousePositionState);

    const {
        start,
        end
    } = time;

    const today = new Date();
    const hour = today.getHours();
    const minutes = today.getMinutes();
    const seconds = today.getSeconds();

    const timing = ((end - hour) * 60 * 60) - (minutes * 60) - seconds;
    const top = ((hour - start) * 2 * 60) + (minutes * 2);
    const full = (end - start - 1) * 2 * 60;

    useMousePosition({
        event: eventType,
        type,
        setPosition,
        fullYear,
        month,
        date
    });

    return (<StyledTimelineWrap onClick={(e) => setEventType(e)}
                                type={type}
                                timing={timing}
                                top={top}
                                full={full}>
            {children}
        {isToday && <StyledBar/>}
    </StyledTimelineWrap>);
};
const StyledTimelineWrap = styled.div<{
    children: ReactNode;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void,
    type: string,
    timing: number,
    top: number,
    full: number
}>`
  --bar-top: ${props => Number(props.top ? props.top : 0)}px;
  --timeline-height: ${props => props.full ? props.full : 10 * 2 * 60}px;

  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  padding: ${props => props.type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP}px 5px 0;
  box-sizing: border-box;

  > span {
    top: ${props => props.type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP}px;
    animation: down ${props => props.timing ? props.timing : 10 * 2 * 60 * 60}s linear;
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

