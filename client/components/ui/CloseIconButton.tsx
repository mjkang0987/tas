import React from 'react';

import styled from 'styled-components';

interface CloseIconButtonProps {
    onClick: () => void;
    className?: string;
}

export const CloseIconButton = ({onClick, className}: CloseIconButtonProps) => (
    <StyledCloseIconButton type="button" onClick={onClick} aria-label="닫기" className={className}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7L17 17M17 7L7 17" />
        </svg>
    </StyledCloseIconButton>
);

const StyledCloseIconButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-lg);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--black-color-10);
    }
    }

    svg {
        width: 14px;
        height: 14px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;

    }
`;
