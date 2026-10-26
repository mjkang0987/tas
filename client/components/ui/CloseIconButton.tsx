import React from 'react';

import styled from 'styled-components';

interface CloseIconButtonProps {
    onClick: () => void;
    className?: string;
}

export const CloseIconButton = ({onClick, className}: CloseIconButtonProps) => (
    <StyledCloseIconButton type="button" onClick={onClick} aria-label="닫기" className={className}>
        <StyledCloseIcon viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7L17 17M17 7L7 17" />
        </StyledCloseIcon>
    </StyledCloseIconButton>
);

const StyledCloseIconButton = styled.button`
    /* 헤더(flex)에서 옆 제목·설명이 길면 버튼이 가로로 눌려 17px까지 줄었다 — 크기를 지킨다. */
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--surface-color);
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        width: 34px;
        height: 34px;
        border-radius: var(--radius-md);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--black-color-10);
    }
    }
`;

const StyledCloseIcon = styled.svg`
    width: 14px;
    height: 14px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
`;
