import React from 'react';

import styled from 'styled-components';

import {Icon} from './Icons';
import {ButtonText} from './ButtonText';

interface Props {
    htmlFor?: string
    inputIcon?: string
    children: React.ReactNode
}

interface StyledProps {
    $inputIcon?: string
    children: React.ReactNode
}

const StyledInput = styled.label<StyledProps>`
    display: flex;
    position: relative;
    box-sizing: border-box;
    border: 1px solid #ccc;
    background-color: var(--white-color);
    border-radius: 5px;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);

    &::placeholder {
        color: var(--gray-color);
    }

    input {
        height: 25px;
        flex: 1;
        border: none;
        background-color: var(--white-color);
        padding: 0 0 0 8px;
        border-radius: 5px;
        box-sizing: border-box;
        font-size: var(--small-font);
        outline: none;

        &[type="search"]::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            margin-right: 4px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23999'/%3E%3Cpath d='M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat center / contain;
            cursor: pointer;
        }

        &[type="search"]::-webkit-search-cancel-button:hover {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23666'/%3E%3Cpath d='M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
        }
    }

    ${props => props.$inputIcon === 'search' && `
    button {
      display: flex;
      position: relative;
      width: 20px;
      border: none;
      background-color: var(--white-color);
     border-radius: 5px;
    }
  `};
`;

export const InputWrap:React.FC <Props> = ({children, inputIcon, htmlFor}) => {
    return <StyledInput htmlFor={htmlFor} $inputIcon={inputIcon}>
        {children}
        {(inputIcon && inputIcon === 'search') && <button type="button">
            <Icon iconType="search"/>
            <ButtonText a11y={true}>검색</ButtonText>
        </button> }
    </StyledInput>;
};
