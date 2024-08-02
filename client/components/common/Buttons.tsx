import styled from 'styled-components';

import React from 'react';

interface Props {
    children: React.ReactNode | string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    padding?: Array<number | string>;
    fontSize?: string;
    height?: string;
    backgroundColor?: string;
    transform?: string;
    draggable?: boolean;
    onDrag?: (event: React.MouseEvent) => void;
    onDragOver?: (event: React.MouseEvent) => void;
    onDragStart?: (event: React.MouseEvent) => void;
    onDragEnd?: (event: React.MouseEvent) => void;
    type?: string;
}

const StyledSquareButton = styled.button <Props>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: ${props => props.height
                     ? props.height
                     : '35px'};
  @media (max-width: 767px) {
    padding: ${props => props.padding
                        ? props.padding.join(' ')
                        : '0 8px'};
  }
  @media (min-width: 768px) {
    padding: ${props => props.padding
                        ? props.padding.join(' ')
                        : '0 15px'};
  }
  border: 1px solid #ccc;
  background-color: ${props => props.backgroundColor
                               ? props.backgroundColor
                               : 'var(--white-color)'};
  border-radius: 5px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);
  font-size: ${props => props.fontSize
                        ? props.fontSize
                        : 'var(--small-font)'};
  ${props => props.transform && `
    transform: ${props.transform}
  `}
`;

export const ButtonSquare: React.FC<Props> = ({children, ...props}) => {
    return <StyledSquareButton {...props}>{children}</StyledSquareButton>;
};

const StyledCircleButton = styled.button <Props>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 25px;
  height: 25px;
  border: 1px solid #ccc;
  background-color: var(--white-color);
  border-radius: 20px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);
`;

export const ButtonCircle: React.FC<Props> = ({children, ...props}) => {
    return <StyledCircleButton type="button" {...props}>{children}</StyledCircleButton>;
};

const StyledIconButton = styled.button <Props>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 25px;
  height: 25px;
  border: none;
  background-color: var(--transparent-color);
  border-radius: 20px;
`;

export const ButtonIcon: React.FC<Props> = ({children, ...props}) => {
    return <StyledIconButton type="button" {...props}>{children}</StyledIconButton>;
};