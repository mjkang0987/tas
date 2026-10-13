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

    // Timeline과 동일한 파생 규칙으로 좌측 시간축 라벨 범위를 맞춘다(축↔블록 정렬 유지).
    const {start, end} = useMemo(
        () => getTimelineRange(view.type, storeSettings.businessHours),
        [view.type, storeSettings.businessHours]
    );

    // iOS gutter 와 같은 눈금 — 정시만, 24시간제 두 자리. 오전/오후·분은 떨어뜨린다.
    // (영업시간 범위만 그리므로 13·14 로 충분히 읽힌다.) 칸은 그대로 매장 단위로 나눈다.
    const setTimes = () => {
        const result: { key: string; label: string; half: boolean }[] = [];
        const slotsPerHour = 60 / scale.unit;

        for (let i = 0; i < (end - start + 1); i++) {
            const num = start + i;

            for (let slot = 0; slot < slotsPerHour; slot++) {
                const minute = slot * scale.unit;
                result.push({
                    key: `${num}-${minute}`,
                    label: slot === 0 ? String(num).padStart(2, '0') : '',
                    half: minute === 30,
                });
            }
        }

        return result;
    };

    return (<StyledTimelineTitle>
            <StyledTimes>
                {setTimes().map((t) => <StyledTime key={`time_${t.key}`}
                                                   $half={t.half}
                                                   // 눈금만 있는 칸은 읽을 것이 없다. 빈 항목으로 읽히지 않게 숨긴다.
                                                   aria-hidden={t.label ? undefined : true}>
                    {/* 보이는 글자는 두 자리뿐이라 "10" 으로 읽힌다 — 몇 시인지 소리로도 알 수 있어야 한다. */}
                    <StyledNum $height={scale.hourHeight / (60 / scale.unit)}
                               aria-label={t.label ? `${t.label}시` : undefined}>{t.label}</StyledNum>
                </StyledTime>)}
            </StyledTimes>
        </StyledTimelineTitle>
    );
};

const StyledTimelineTitle = styled.div`
    flex-shrink: 0;
    width: var(--timeline-col);
    border-right: 1px solid var(--calendar-grid-line);
    box-sizing: border-box;
`;

const StyledTimes = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 30px 0 60px;
`;

const StyledTime = styled.li<{$half: boolean}>`
    display: flex;
    justify-content: center;
    position: relative;

    /* 정시 가로선은 타임라인(StyledTimelineWrap)이 그린다 — 여기서 그리면
       시간축의 z-index 가 카드 위로 올라가 카드 윗변을 덮는다.
       30분은 숫자 대신 축 안에서 끝나는 짧은 눈금으로만 표시한다(가로로 번지지 않으므로 안전). */
    ${props => props.$half && `
        &:after {
            content: "";
            position: absolute;
            right: 0;
            top: 50%;
            width: 6px;
            height: 1px;
            background-color: var(--dark-gray-color2);
            opacity: .35;
        }
    `}
`;

const StyledNum = styled.span<{$height: number}>`
    display: flex;
    /* iOS gutter 와 같이 선 쪽으로 붙인다(trailing). */
    justify-content: flex-end;
    align-items: center;
    width: 100%;
    height: ${props => props.$height}px;
    padding: 0 6px 0 0;
    font-size: var(--tiny-font);
    /* 숫자 폭을 고정해 눈금이 세로로 흔들리지 않게 — iOS monospacedDigit. */
    font-variant-numeric: tabular-nums;
    /* --gray-color(#dbdbdb)는 거의 흰 배경 위에서 대비가 1.33:1 이라 10px 글자가 보이지 않았다.
       WCAG AA(작은 글자 4.5:1)를 넘기려면 여기까지 내려야 한다 — 이 값은 7.5:1. */
    color: var(--dark-gray-color);
`;
