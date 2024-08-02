import React, {ReactNode} from 'react';
import styled from 'styled-components';
import React from 'react';

interface Props {
    iconType: string;
    ariaHidden?: boolean;
    children?: ReactNode;
}

const StyledIcon = styled.span <Props>`
  flex-shrink: 0;
  display: inline-flex;
  position: relative;
  pointer-events: none;
  ${props => props.iconType === 'loading' && `
    position: fixed;
    top: 50%;
    left: 50%;
    margin: -25px 0 0 -25px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #00afff;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s cubic-bezier(.09, .49, .85, .42) infinite;
  `}

  ${props => props.iconType === 'search' && `
  width: 35px;
   
  &::before,
  &::after {
    content: "";
    position: absolute;
  }
    
  &::before {
    top: 8px;
    right: 12px;
    width: 12px;
    height: 12px;
    border: solid 1px var(--black-color);
    border-radius: 100%;
  }
    
  &::after {
    top: 21px;
    right: 10px;
    width: 6px;
    height: 1px;
    background-color: var(--black-color);
    transform: rotate(45deg);
  }
`}

  ${props => props.iconType === 'plus' && `
  width: 35px;
  
  &::after,
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 13px;
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

  ${props => props.iconType === 'hamburger' && `
  width: 40px;
    height: 40px;

  &::before {
    content: "";
    position: absolute;
    top: 14px;
    left: 50%;
    width: 18px;
    height: 2px;
    margin-left: -9px;
    border-radius: 2px;
    background-color: var(--black-color);
    box-shadow: 0 10px 0 0 var(--black-color);
  }
`}

  ${props => props.iconType.includes('Arrow') && `
  width: 25px;
  height: 25px;
  
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    margin-left: ${props.iconType === 'rightArrow' ? -2 : 2}px;
    border: solid var(--black-color);
    border-width: 1px 1px 0 0;
    transform: translate(-50%, -50%) rotate(${props.iconType === 'rightArrow' ? 45 : -135}deg);      
  }
`}

  ${props => props.iconType === 'close' && `
  width: 25px;
  height: 25px;
  transform: rotate(45deg);
  
  &::after,
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 2px;
    background-color: var(--black-color);
    pointer-events: none;
  }
  
  &::before {
    transform: translate(-50%, -50%);
  }
  
  &:after {
    transform: translate(-50%, -50%) rotate(90deg);
  }
`}

  ${props => props.iconType === 'modify' && `
  width: 25px;
  height: 25px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25' fill='none' viewBox='0 0 48 48'%3E%3Cpath fill='%23fff' fill-opacity='.01' d='M0 0h48v48H0z'/%3E%3Cpath fill='%23FFFFFF' stroke='%23000' stroke-linejoin='round' stroke-width='4' d='M5.325 43.5h8.485l31.113-31.113-8.486-8.485L5.325 35.015V43.5Z'/%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='4' d='m27.952 12.387 8.485 8.486'/%3E%3C/svg%3E");
  background-size: 18px auto;
  background-repeat: no-repeat;
  background-position: 50% 50%;
`}

  ${props => props.iconType === 'delete' && `
  width: 25px;
  height: 25px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='25' viewBox='0 -0.5 21 21'%3E%3Cpath fill='%23000' fill-rule='evenodd' d='M7.35 16h2.1V8h-2.1v8Zm4.2 0h2.1V8h-2.1v8Zm-6.3 2h10.5V6H5.25v12Zm2.1-14h6.3V2h-6.3v2Zm8.4 0V0H5.25v4H0v2h3.15v14h14.7V6H21V4h-5.25Z'/%3E%3C/svg%3E");;
  background-size: 18px auto;
  background-repeat: no-repeat;
  background-position: 50% 50%;
`}
`;

export const Icon: React.FC<Props> = ({iconType}) => {
    return <StyledIcon ariaHidden={true}
                       iconType={iconType}><span className="a11y">{iconType} icon</span></StyledIcon>;
};