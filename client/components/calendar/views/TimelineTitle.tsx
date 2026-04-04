import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

export const TimelineTitle = () => {
    const time = useCalendarStore((s) => s.time);

    const {
        start,
        end
    } = time;

    const setTimes = () => {
        const arr = new Array((end - start + 1)).fill(start);
        const result = [];

        for (let i = 0; i < arr.length; i++) {
            const num = start + i;

            const isMorning = num < 12
                              ? '오전'
                              : '오후';
            const isHalf = num > 12
                           ? num - 12
                           : num;
            const isSingle = String(isHalf + 1).length < 2
                             ? 0
                             : '';

            result.push(`${isMorning} ${isSingle}${isHalf}:00`);
            result.push(`${isMorning} ${isSingle}${isHalf}:30`);
        }

        return result;
    };

    return (<StyledTimelineTitle>
            <StyledTimes>
                {setTimes().map((t: string, index: number) => <StyledTime key={`time_${t}`}>
                    <StyledNum>{t}</StyledNum>
                </StyledTime>)}
            </StyledTimes>
        </StyledTimelineTitle>
    );
};

const StyledTimelineTitle = styled.div`
  flex-shrink: 0;
  width: var(--timeline-col);
  border-right: 1px solid var(--light-gray-color);
  box-sizing: border-box;
`;

const StyledTimes = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 30px 0 60px;
`;

const StyledTime = styled.li`
  display: flex;
  justify-content: center;
  position: relative;

  &:after {
    content: "";
    position: absolute;
    top: 50%;
    left: calc(100% - 6px);
    width: 100vw;
    height: 1px;
    background-color: var(--light-gray-color);
  }
`;

const StyledNum = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 40px;
  padding: 0 10px;
  font-size: var(--tiny-font);
  color: var(--gray-color);
`;