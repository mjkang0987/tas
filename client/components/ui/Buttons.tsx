import styled from 'styled-components';
import React from 'react';

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
    $requested?: boolean | undefined;
    $active?: boolean | undefined;
    /** 카드 높이에 맞춘 표시 단계 — 'full'(두 줄) | 'compact'(한 줄) | 'name'(이름만). */
    $detail?: 'full' | 'compact' | 'name' | undefined;
    'aria-label'?: string | undefined;
}

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
    left: 3px;
    right: 5px;
    width: calc(100% - 6px);
    height: ${props => props.$height}px;
    max-height: ${props => props.$height}px;
    background-color: ${props => props.$requested ? 'rgba(168, 132, 23, 0.10)' : `${props.$color}12`};
    border: 1px solid ${props => props.$color};
    border-left-width: 4px;
    border-style: ${props => props.$requested ? 'dashed' : 'solid'};
    border-left-color: ${props => props.$requested ? 'var(--caution-color)' : props.$color};
    border-radius: var(--radius-sm);
    padding: 4px 6px;
    color: ${props => 'var(--dark-gray-color)'};
    font-size: var(--xsmall-font);
    overflow: hidden;
    cursor: pointer;
    box-sizing: border-box;
    z-index: 1;
    opacity: ${props => props.$cancelled ? 0.5 : 1};
    filter: ${props => props.$cancelled ? 'grayscale(.5)' : 'none'};
    transition: max-height 0.2s ease, box-shadow 0.2s ease;
    text-align: left;
    @media (max-width: 640px) {
        padding: 4px 2px;
    }

    .highlight {
        display: inline;
        font-weight: 600;
        font-size: var(--small-font);
        text-decoration: ${props => props.$cancelled ? 'line-through' : 'none'};
    }

    .normal {
        display: block;
        font-size: var(--small-font);
    }

    .sub {
        display: block;
        font-size: var(--tiny-font);
    }

    .detail {
        display: inline;
        margin-left: 4px;
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


