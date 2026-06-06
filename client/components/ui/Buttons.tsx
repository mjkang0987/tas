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
}

const StyledSquareButton = styled.button <Props>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 8px;
    border: 1px solid var(--border-color);
    background-color: var(--white-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    font-size: var(--small-font);
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
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
`;

export const ButtonCircle: React.FC<Props> = ({children, ...props}) => {
    return <StyledCircleButton type="button" {...props}>{children}</StyledCircleButton>;
};

const StyledReserveButton = styled.button <Props>`
    position: ${props => props.$position ? props.$position: ''};
    top: ${props => props.$top}px;
    left: 5px;
    right: 5px;
    width: calc(100% - 10px);
    height: ${props => props.$height}px;
    max-height: ${props => props.$height}px;
    background-color: ${props => `${props.$color}12`};
    border: 1px solid ${props => props.$color};
    border-left-width: 4px;
    border-radius: var(--radius-sm);
    padding: 2px 6px;
    color: ${props => 'var(--dark-gray-color)'};
    font-size: 12px;
    overflow: hidden;
    cursor: pointer;
    box-sizing: border-box;
    z-index: 1;
    opacity: ${props => props.$cancelled ? 0.5 : 1};
    filter: ${props => props.$cancelled ? 'grayscale(.5)' : 'none'};
    transition: max-height 0.2s ease, box-shadow 0.2s ease;
    text-align: left;
    @media (max-width: 640px) {
        padding: 10px 2px;
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

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        z-index: 10;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
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
    font-size: 16px;
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


