import {css} from 'styled-components';

export const formControlStyle = css`
    height: 32px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    font-size: 12px;
    color: var(--dark-gray-color);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }

    &:disabled {
        background: var(--gray-color2);
        color: var(--dark-gray-color2);
    }
`;
