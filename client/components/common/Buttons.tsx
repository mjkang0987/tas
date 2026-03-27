import styled from 'styled-components';
import React from 'react';

interface Props {
    children: React.ReactNode | string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
    height: 30px;
    padding: 0 8px;
    border: 1px solid #ccc;
    background-color: var(--white-color);
    border-radius: 5px;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);
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
    border: 1px solid #ccc;
    background-color: var(--white-color);
    border-radius: 20px;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);
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
    background-color: ${props => props.$cancelled ? '#9ca3af' : props.$color};
    border: none;
    border-radius: 4px;
    padding: 2px 6px;
    color: #fff;
    font-size: 12px;
    overflow: hidden;
    cursor: pointer;
    box-sizing: border-box;
    z-index: 1;
    opacity: ${props => props.$cancelled ? 0.5 : 1};
    transition: max-height 0.2s ease, box-shadow 0.2s ease;

    .highlight {
        display: block;
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
        opacity: 0.9;
    }

    .detail {
        display: block;
        margin-top: 2px;
        font-size: var(--tiny-font);
        opacity: 0.9;
    }

    @media (max-width: 1024px) {
        .normal,
        .sub {
            display: none;
        }
    }

    &:hover {
        max-height: ${props => props.$height}px;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
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
    cursor: pointer;

    &:hover {
        background-color: var(--light-gray-color);
        color: var(--blue-color);
    }
`;

interface AddProps {
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    'aria-label'?: string;
}

export const ButtonAdd: React.FC<AddProps> = (props) => {
    return <StyledAddButton type="button" {...props}>&#x2b;</StyledAddButton>;
}