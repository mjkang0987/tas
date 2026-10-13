import React, {MouseEventHandler} from 'react';

import styled from 'styled-components';

interface Props {
    onClick?: MouseEventHandler;
    children: React.ReactNode | string;
    isToday?: boolean;
    compact?: boolean;
    className?: string;
    'aria-label'?: string;
}

export const Num: React.FC<Props> = ({children, isToday, compact, ...props}) => {
    return <StyledNum $isToday={isToday} $compact={compact} {...props}>{children}</StyledNum>;
};

const StyledNum = styled.button <{ $isToday?: boolean; $compact?: boolean }>`
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

  ${props => props.$isToday && `
    /* 오늘 표시는 키컬러로. iOS 가 Color.accentColor(#6526D9)를 쓰는 자리와 같다
       (CalendarView.swift 의 monthDayCell). --blue-color 는 양쪽이 어긋나 있던 값이다. */
    background-color: var(--brand-color);
    color: var(--white-color);
  `}
  @media (hover: hover) and (pointer: fine) {
        &:hover {
    background-color: var(--light-gray-color);
  }
  }
`;
