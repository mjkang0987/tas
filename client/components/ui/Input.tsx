import React from 'react';

import styled from 'styled-components';

import {Icon} from './Icons';
import {ButtonText} from './ButtonText';
import {formControlStyle} from './FormControls';

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
    align-items: center;
    box-sizing: border-box;
    ${formControlStyle};
    padding-right: 4px;

    &::placeholder {
        color: var(--gray-color);
    }

    .input-field {
        height: 100%;
        flex: 1;
        border: none;
        background-color: transparent;
        padding: 0 0 0 8px;
        border-radius: var(--radius-md);
        box-sizing: border-box;
        font-size: 12px;
        outline: none;
        box-shadow: none;

        &[type="search"]::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            margin-right: 4px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23999'/%3E%3Cpath d='M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat center / contain;
            cursor: pointer;
        }

        @media (hover: hover) and (pointer: fine) {
            &[type="search"]::-webkit-search-cancel-button:hover {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23666'/%3E%3Cpath d='M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
            }
        }
    }

    ${props => props.$inputIcon === 'search' && `
    .search-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 24px;
      height: 24px;
      border: none;
      background-color: transparent;
      border-radius: var(--radius-md);
    }
  `};
`;

export const InputWrap:React.FC <Props> = ({children, inputIcon, htmlFor}) => {
    return <StyledInput htmlFor={htmlFor} $inputIcon={inputIcon}>
        {children}
        {(inputIcon && inputIcon === 'search') && <button type="button" className="search-btn">
            <Icon iconType="search"/>
            <ButtonText a11y={true}>검색</ButtonText>
        </button> }
    </StyledInput>;
};
