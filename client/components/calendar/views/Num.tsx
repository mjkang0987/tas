import React, {MouseEventHandler} from 'react';

import styled from 'styled-components';

interface Props {
    onClick?: MouseEventHandler;
    children: React.ReactNode | string;
    isToday?: boolean;
    /** 목록이 열린(= 선택된) 날짜. iOS monthDayCell 의 isSelected 와 같은 자리다. */
    isSelected?: boolean;
    compact?: boolean;
    className?: string;
    'aria-label'?: string;
}

export const Num: React.FC<Props> = ({children, isToday, isSelected, compact, ...props}) => {
    return <StyledNum $isToday={isToday} $isSelected={isSelected} $compact={compact} {...props}>{children}</StyledNum>;
};

const StyledNum = styled.button <{ $isToday?: boolean; $isSelected?: boolean; $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 30px;
  width: ${props => props.$compact ? 'auto' : '30px'};
  height: 30px;
  padding: ${props => props.$compact ? '0 8px' : '0'};
  border-radius: 100%;
  background: transparent;
  border: none;
  font-size: var(--small-font);
  color: var(--black-color);

  @media (hover: hover) and (pointer: fine) {
        &:hover {
    background-color: var(--light-gray-color);
  }
  }

  /* iOS monthDayCell 과 같은 규칙 — 오늘은 옅게, 선택은 꽉 차게.
     웹은 둘이 반대로 돼 있었다(오늘이 꽉 찬 원, 선택은 칸 테두리). */
  ${props => props.$isToday && !props.$isSelected && `
    background-color: var(--brand-color-border);
  `}
  ${props => props.$isSelected && `
    background-color: var(--brand-color);
    color: var(--white-color);
    font-weight: 700;
  `}
`;
