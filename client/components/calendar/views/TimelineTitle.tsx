import {useMemo} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {useTimelineScale} from '../../../hooks/useTimelineScale';
import {getTimelineRange} from '../../../utils/timelineRange';

export const TimelineTitle = () => {
    const view = useCalendarStore((s) => s.view);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    // 눈금 간격 = 매장 단위. 블록과 같은 배율을 써야 축과 카드가 맞는다.
    const scale = useTimelineScale();
    // 5·10분 단위에서 모든 칸에 라벨을 달면 축이 숫자로 뒤덮인다 → 라벨은 30분마다, 칸만 단위대로 나눈다.
    const labelEvery = Math.max(1, Math.round(30 / scale.unit));

    // Timeline과 동일한 파생 규칙으로 좌측 시간축 라벨 범위를 맞춘다(축↔블록 정렬 유지).
    const {start, end} = useMemo(
        () => getTimelineRange(view.type, storeSettings.businessHours),
        [view.type, storeSettings.businessHours]
    );

    const setTimes = () => {
        const result: { key: string; full: string; compact: string }[] = [];
        const slotsPerHour = 60 / scale.unit;

        for (let i = 0; i < (end - start + 1); i++) {
            const num = start + i;
            const isMorning = num < 12 ? '오전' : '오후';
            const isHalf = num > 12 ? num - 12 : num;
            const isSingle = String(isHalf + 1).length < 2 ? 0 : '';
            const hour = isHalf === 0 ? 12 : isHalf;

            for (let slot = 0; slot < slotsPerHour; slot++) {
                const minute = slot * scale.unit;
                const labeled = slot % labelEvery === 0;
                result.push({
                    key: `${num}-${minute}`,
                    full: labeled ? `${isMorning} ${isSingle}${isHalf}:${String(minute).padStart(2, '0')}` : '',
                    compact: labeled ? `${hour}:${String(minute).padStart(2, '0')}` : '',
                });
            }
        }

        return result;
    };

    return (<StyledTimelineTitle>
            <StyledTimes>
                {setTimes().map((t) => <StyledTime key={`time_${t.key}`} $height={scale.hourHeight / (60 / scale.unit)}>
                    <StyledNum $height={scale.hourHeight / (60 / scale.unit)}>
                        <span className="full">{t.full}</span>
                        <span className="compact">{t.compact}</span>
                    </StyledNum>
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

const StyledTime = styled.li<{$height: number}>`
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

const StyledNum = styled.span<{$height: number}>`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: ${props => props.$height}px;
    padding: 0 10px;
    font-size: var(--tiny-font);
    color: var(--gray-color);

    .compact {
        display: none;
    }

    @media (max-width: 640px) {
        padding: 0 4px;
        .full {
            display: none;
        }

        .compact {
            display: block;
        }
    }
`;
