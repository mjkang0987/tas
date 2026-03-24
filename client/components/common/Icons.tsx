import styled from 'styled-components';
import React from 'react';

interface Props {
    iconType: string
}

const StyledIcon = styled.span <{ $iconType: string }>`
    flex-shrink: 0;
    display: inline-flex;
    position: relative;
    ${props => props.$iconType === 'loading' && `
    position: fixed;
    top: 50%;
    left: 50%;
    margin: -25px 0 0 -25px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #00afff;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s cubic-bezier(.09, .49, .85, .42) infinite;
  `}

    ${props => props.$iconType === 'search' && `
   width: 20px;
   justify-content: center;
   align-items: center;
  &::before {
 content: "🔍";
 font-size: 10px;
  }
`}

    ${props => props.$iconType === 'plus' && `
  width: 25px;
  
  &::after,
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 2px;
    background-color: var(--black-color);
    border-radius: 2px;
    pointer-events: none;
  }
  
  &::before {
    transform: translate(-50%, -50%);
  }
  
  &:after {
    transform: translate(-50%, -50%) rotate(90deg);
  }
`};

    ${props => props.$iconType === 'hamburger' && `
  width: 30px;
    height: 30px;

  &::before {
    content: "";
    position: absolute;
    top: 8px;
    left: 50%;
    width: 18px;
    height: 2px;
    margin-left: -9px;
    border-radius: 2px;
    background-color: var(--black-color);
    box-shadow: 0 10px 0 0 var(--black-color);
  }
`}

    ${props => props.$iconType.includes('Arrow') && `
  width: 25px;
  height: 25px;
  
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    margin-left: ${props.$iconType === 'rightArrow' ? -2 : 2}px;
    border: solid var(--black-color);
    border-width: 1px 1px 0 0;
    transform: translate(-50%, -50%) rotate(${props.$iconType === 'rightArrow' ? 45 : -135}deg);      
  }
`}
`;

export const Icon: React.FC<Props> = ({iconType}) => {
    return <StyledIcon $iconType={iconType} />;
};