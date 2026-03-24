import React from 'react';

import styled from 'styled-components';

import {Icon} from './Icons';
import {ButtonText} from './ButtonText';

interface Props {
    inputIcon?: string
    children: React.ReactNode
}

interface StyledProps {
    $inputIcon?: string
    children: React.ReactNode
}

const StyledInput = styled.div<StyledProps>`
  display: flex;
  overflow: hidden;
  position: relative;
  height: 25px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  background-color: var(--white-color);
  border-radius: 5px;
  margin-top: 20px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);

  &::placeholder {
    color: var(--gray-color);
  }

  ${props => props.$inputIcon === 'search' && `
    input {
      border: none;
      background-color: var(--white-color);
      padding: 0 0 0 8px;
      box-sizing: border-box;
      font-size: var(--small-font);
    }

    button {
      display: flex;
      position: relative;
      width: 20px;
      border: none;
      background-color: var(--white-color);
    }
  `};
`;

export const InputWrap:React.FC <Props> = ({children, inputIcon}) => {
    return <StyledInput $inputIcon={inputIcon}>
        {children}
        {(inputIcon && inputIcon === 'search') && <button type="button">
            <Icon iconType="search"/>
            <ButtonText a11y={true}>검색</ButtonText>
        </button> }
    </StyledInput>;
};
