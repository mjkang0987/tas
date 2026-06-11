import styled from 'styled-components';

import {formControlStyle} from '../ui/FormControls';

export const StyledConflictBanner = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 14px;
    height: 34px;
    flex-shrink: 0;
    box-sizing: border-box;
    border: none;
    border-bottom: 1px solid var(--danger-border);
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 12px;
    cursor: pointer;
    text-align: left;

    .count { font-weight: 700; }

    .cta {
        font-weight: 600;
        white-space: nowrap;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover { filter: brightness(0.97); }
    }
`;

export const StyledHeader = styled.header`
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
    padding: 0 12px 0 0;
    min-height: 48px;
    box-sizing: border-box;
    background-color: var(--white-color);
    border-bottom: solid 1px var(--light-gray-color);
    flex-shrink: 0;
    @media (max-width: 640px) {
        gap: 0;
        padding: 0 0 0 8px;
    }
`;

export const StyledCalendarRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;

    @media (max-width: 640px) {
        width: 100%;
        padding: 0 2px;
    }
`;

export const StyledToolRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;

    @media (max-width: 640px) {
        width: 100%;
        padding: 4px 2px;
        border-top: 1px solid var(--light-gray-color);
    }
`;

export const StyledAsideToggle = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;

    .menu-label { display: none; }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }

    @media (max-width: 640px) {
        position: fixed;
        bottom: 20px;
        left: ${(props) => props.$open ? 'calc(8px + var(--aside-width) + 8px)' : '16px'};
        z-index: 210;
        flex-direction: column;
        gap: 3px;
        width: auto;
        min-width: 44px;
        height: auto;
        padding: 8px 10px;
        border-radius: 20px;
        background-color: var(--aside-bg);
        color: var(--aside-text);
        box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        opacity: 1;
        transition: left 0.25s ease, background-color 0.1s;

        .menu-label { display: block; }

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background-color: var(--aside-hover);
            }
        }
    }
`;

export const StyledAsideToggleLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
`;

export const StyledPageTitle = styled.h1`
    flex: 1;
    margin: 0;
    font-size: var(--big-font);
    font-weight: 700;
    text-align: center;
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        text-align: left;
    }
`;

export const StyledDesignerFilter = styled.select`
    min-width: 128px;
    margin-right: auto;
    padding: 0 6px 0 8px;
    ${formControlStyle};
    appearance: base-select;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;

    @media (max-width: 640px) {
        min-width: 96px;
        margin-left: 0;
        padding: 0 4px 0 6px;
    }

    selectedcontent {
        display: inline-flex;
        align-items: center;
        min-width: 0;
    }

    &::picker-icon {
        margin-left: auto;
        color: var(--dark-gray-color2);
        transition: transform 0.15s ease;
    }

    &:open::picker-icon {
        transform: rotate(180deg);
    }

    &::picker(select) {
        appearance: base-select;
        min-width: anchor-size(width);
        margin-top: 6px;
        padding: 6px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        background: var(--white-color);
        box-shadow: var(--shadow-md);
    }

    option {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background-color 0.12s ease;

        &::checkmark {
            display: none;
        }

        &[data-bg-color]::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            flex-shrink: 0;
            border-radius: 50%;
            background-color: attr(data-bg-color type(<color>), transparent);
        }
    }

    option:hover,
    option:focus {
        background: var(--gray-color2);
    }

    option:checked {
        background: var(--brand-color-bg);
        font-weight: 600;
    }

    optgroup {
        padding-top: 6px;
        font-size: 10px;
        font-weight: 700;
        color: var(--dark-gray-color2);
    }
`;

export const StyledSyncWrap = styled.div`
    position: relative;
    flex-shrink: 0;
`;

export const StyledSyncToast = styled.span`
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 4px;
    padding: 4px 10px;
    border-radius: var(--radius-md);
    background-color: var(--black-color);
    color: var(--white-color);
    font-size: var(--tiny-font);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
`;

export const StyledSyncButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;

    &:disabled {
        cursor: default;
        opacity: 0.5;
    }

    @media (hover: hover) and (pointer: fine) {
        &:not(:disabled):hover {
            background-color: var(--gray-color2);
        }
    }
`;

export const StyledSyncIcon = styled.svg<{ $syncing: boolean }>`
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    ${(props) => props.$syncing && 'animation: spin 1s linear infinite;'}
`;

export const StyledCustomerSearchButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }
`;

export const StyledSearchIcon = styled.svg`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

export const StyledTokenExpiredToast = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    background: var(--toast-bg);
    color: var(--white-color);
    font-size: 13px;
    box-shadow: var(--modal-shadow);
    z-index: 10000;
    white-space: nowrap;
`;

export const StyledTokenReconnect = styled.button`
    padding: 0;
    border: none;
    background: none;
    color: var(--link-color-light);
    font-size: 13px;
    font-weight: 600;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

export const StyledTokenClose = styled.button`
    padding: 0;
    border: none;
    background: none;
    color: var(--muted-text);
    font-size: 14px;
    line-height: 1;
`;
