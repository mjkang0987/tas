import styled from 'styled-components';

import {StyledServiceText} from './ServiceChip';
import React from 'react';
import {inactiveHatch} from '../../features/reservations/inactiveHatch';

interface Props {
    children: React.ReactNode | string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onTouchStart?: (event: React.TouchEvent<HTMLButtonElement>) => void;
    onTouchEnd?: (event: React.TouchEvent<HTMLButtonElement>) => void;
    style?: React.CSSProperties;
    key?: number | undefined;
    $position?: string | undefined;
    $top?: number | undefined;
    $height?: number | undefined;
    $color?: string | undefined;
    $cancelled?: boolean | undefined;
    /** 노쇼만 교차 빗금 — 취소와 가르기 위해. `$cancelled` 와 함께 켠다. */
    $noshow?: boolean | undefined;
    $active?: boolean | undefined;
    /** 카드 높이에 맞춘 표시 단계 — 'full'(두 줄) | 'compact'(한 줄) | 'name'(이름만). */
    $detail?: 'full' | 'compact' | 'name' | undefined;
    /** 겹친 예약을 나눠 놓을 때의 칸(캘린더 `TimelineLane` 과 같은 모양 — 일반 ui 층이라
     *  도메인 타입을 끌어오지 않고 구조만 맞춘다). 없으면 가로 전체를 쓴다. */
    $lane?: { index: number; count: number } | undefined;
    'aria-label'?: string | undefined;
}

// 카드의 좌우 여백. 절대배치에서 left·width·right 가 모두 지정되면 LTR 은 right 를
// 무시하므로(CSS 2.1 §10.3.7), 실효 여백은 left 3px + 같은 크기의 오른쪽 3px = 6px 다.
const CARD_INSET_LEFT = 3;
const CARD_INSET = CARD_INSET_LEFT * 2;
const LANE_GAP = 3;

const laneWidth = (lane: Props['$lane']) => (
    lane && lane.count > 1
        ? `calc((100% - ${CARD_INSET + LANE_GAP * (lane.count - 1)}px) / ${lane.count})`
        : `calc(100% - ${CARD_INSET}px)`
);

const laneLeft = (lane: Props['$lane']) => (
    lane && lane.count > 1 && lane.index > 0
        ? `calc(${CARD_INSET_LEFT}px + (${laneWidth(lane)} + ${LANE_GAP}px) * ${lane.index})`
        : `${CARD_INSET_LEFT}px`
);

const StyledSquareButton = styled.button <Props>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 8px;
    border: 1px solid var(--border-color);
    background-color: ${props => props.$active ? 'var(--gray-color2)' : 'var(--white-color)'};
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    font-size: var(--small-font);

    &:active {
        background-color: var(--gray-color2);
    }
`;

export const ButtonSquare: React.FC<Props> = ({children, ...props}) => {
    return <StyledSquareButton {...props}>{children}</StyledSquareButton>;
};

const StyledCircleButton = styled.button <Props>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 20px;
    height: 20px;
    border: 1px solid var(--border-color);
    background-color: var(--white-color);
    border-radius: 50%;
    box-shadow: var(--shadow-sm);
    font-size: var(--font);
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        &::after {
            content: '';
            position: absolute;
            inset: -12px;
        }
    }
`;

export const ButtonCircle: React.FC<Props> = ({children, ...props}) => {
    return <StyledCircleButton type="button" {...props}>{children}</StyledCircleButton>;
};

const StyledReserveButton = styled.button <Props>`
    position: ${props => props.$position ? props.$position: ''};
    top: ${props => props.$top}px;
    left: ${props => laneLeft(props.$lane)};
    width: ${props => laneWidth(props.$lane)};
    height: ${props => props.$height}px;
    max-height: ${props => props.$height}px;
    background-color: ${props => `${props.$color}12`};
    border: 1px solid ${props => props.$color};
    border-left-width: 4px;
    /* 취소·노쇼는 월 칸·목록 카드와 같은 빗금 + 회색으로 — 같은 상태를 세 화면이
       다르게 그리면 색만 보고는 무엇인지 알 수 없다. (여기만 흐리게+회색필터였다.) */
    ${props => props.$cancelled && `
        border-color: var(--gray-color);
        border-left-color: var(--gray-color);
        /* 취소와 노쇼는 **색**으로 가른다 — 취소는 무채색, 노쇼는 붉은 기운(매출이 빈 자리라
           눈에 걸려야 한다). 무늬를 교차로 바꾸는 방식도 써 봤으나 나란히 두지 않으면
           구별이 어렵고 촘촘해져 글자를 가렸다. */
        background: ${inactiveHatch(props.$noshow)}, var(--gray-color2);

        /* 시술 칩도 함께 죽인다 — 칩만 색이 남으면 빗금 위에 떠 끝난 예약이 살아 보인다. */
        ${StyledServiceText} { color: var(--dark-gray-color2); }
    `}
    border-radius: var(--radius-sm);
    /* 세로 2px — 세 줄(시작시간·고객명·시술)이 30분 예약 높이(50px)에 들어가야 한다.
       4px 이면 4px 이 모자라 가장 흔한 길이의 카드가 모두 넘쳤다. */
    padding: 2px 6px;
    color: ${props => 'var(--dark-gray-color)'};
    font-size: var(--xsmall-font);
    overflow: hidden;
    cursor: pointer;
    box-sizing: border-box;
    z-index: 1;
    /* 빗금이 상태를 말하므로 흐리게·회색필터를 겹치지 않는다 — 겹치면 빗금까지 바래
       무늬가 안 읽히고, 담당자 색이 남은 다른 카드와 톤이 어긋난다. */
    color: ${props => props.$cancelled ? 'var(--dark-gray-color2)' : 'inherit'};
    transition: max-height 0.2s ease, box-shadow 0.2s ease;
    text-align: left;
    @media (max-width: 640px) {
        padding: 2px 2px;
    }

    .highlight {
        /* 제 줄을 가진다. inline 이면 라인박스 여백으로 줄 사이에 2px 이 더 붙어,
           세 줄 카드가 30분 예약 높이(50px)를 넘긴다. */
        display: block;
        font-weight: 600;
        font-size: var(--small-font);
        text-decoration: ${props => props.$cancelled ? 'line-through' : 'none'};
    }

    /* 시작시간 — 앱 블록과 같이 맨 윗줄에 따로. 숫자가 흔들리지 않게 고정폭. */
    .start-time {
        display: block;
        font-weight: 600;
        font-size: var(--small-font);
        font-variant-numeric: tabular-nums;
    }

    /* 한 줄 카드의 시작시간 — 이름 앞에 붙는다. 취소선이 번지지 않게 따로 둔다. */
    .start-time-inline {
        margin-right: 4px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .normal {
        display: block;
        font-size: var(--small-font);
    }

    .sub {
        display: block;
        font-size: var(--tiny-font);
    }

    /* 확정대기 — 카드는 그대로 두고 그 위를 덮는다. "있지만 아직 정해지지 않았다".
       둘 다 클릭을 통과시킨다 — 눌러서 상세로 들어가 수락·거절해야 한다. */
    .pending-veil {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: rgba(255, 255, 255, 0.72);
        pointer-events: none;
    }

    /* 고객명 줄 — 시작시간 아래, 시술 위. 제 줄을 가진다(앱 블록과 같은 차례). */
    .detail {
        display: block;
        font-size: var(--tiny-font);
    }

    .service-token {
        display: inline-flex;
        align-items: center;
        @media (max-width: 640px) {
            flex-wrap: wrap;
            gap: 4px;
        }
    }

    .drag-handle {
        position: absolute;
        top: 50%;
        right: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        padding: 0;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.86);
        color: var(--dark-gray-color);
        line-height: 1;
        cursor: grab;
        z-index: 2;
        transform: translateY(-50%);
        @media (max-width: 640px) {
            display: none;
        }

        &::before {
            content: '';
            display: block;
            width: 8px;
            height: 8px;
            border-radius: 1px;
            background-image:
                linear-gradient(currentColor, currentColor),
                linear-gradient(currentColor, currentColor),
                linear-gradient(currentColor, currentColor);
            background-position: center 1px, center 4px, center 7px;
            background-size: 8px 1.5px;
            background-repeat: no-repeat;
            opacity: 0.7;
        }
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    @media (max-width: 1024px) {
        .normal,
        .sub {
            display: none;
        }
    }

    /* 한 줄 표시(짧은 예약) — 넘치는 글자는 말줄임. 카드가 세로로 낮아 줄바꿈은 곧 잘림이다. */
    .oneline {
        display: flex;
        align-items: center;
        gap: 3px;
        min-width: 0;
        font-size: var(--tiny-font);
        line-height: 1.2;
    }

    .oneline-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        /* 두 줄 표시(.highlight)와 같은 취소선. 한 줄 카드는 상태 접미사가 잘리거나
           빠질 수 있어, 글자 폭을 쓰지 않는 이 신호가 취소·노쇼의 유일한 표식이 된다.
           색·투명도만으로는 살아 있는 예약과 구분되지 않는다. */
        text-decoration: ${props => props.$cancelled ? 'line-through' : 'none'};
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        z-index: 10;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
    }
    }

    /* 마우스·키보드가 있는 기기에선 올려두면 자연 높이로 펴서 전체 정보를 보여준다.
       터치 기기는 hover가 없으므로 탭 → 예약 상세가 그 역할을 한다(카드엔 최소 정보가 남아 있다). */
    @media (hover: hover) and (pointer: fine) {
        &:hover:not([data-dragging="true"]),
        &:focus-visible:not([data-dragging="true"]) {
            height: auto;
            /* 펴지는 건 아래로만. 줄어들면 길이=시간이 깨지고(30분 카드가 올려두기만 해도 29px로 줄었다)
               가운데 붙은 드래그 손잡이가 커서 밑에서 달아난다. */
            min-height: max(${props => props.$height ?? 34}px, 34px);
            max-height: none;
            overflow: visible;
            z-index: 10;

            .oneline-text {
                overflow: visible;
                text-overflow: clip;
                white-space: normal;
            }
        }
    }
`;

export const ButtonReserve: React.FC<Props> = ({children, ...props}) => {
    return <StyledReserveButton type="button" {...props}>{children}</StyledReserveButton>
}

const StyledAddButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background-color: transparent;
    color: var(--gray-color);
    font-size: var(--large-font);
    line-height: 1;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--light-gray-color);
        color: var(--blue-color);
    }
    }
`;

interface AddProps {
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    'aria-label'?: string;
}

export const ButtonAdd: React.FC<AddProps> = (props) => {
    return <StyledAddButton type="button" {...props}>&#x2b;</StyledAddButton>;
}


