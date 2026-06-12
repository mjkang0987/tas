import styled from 'styled-components';

import Link from 'next/link';
import {StyledDeleteBtn, actionButtonStyle} from '../settings/settings-styles';
export const StyledSection = styled.section`
    flex: 1;
    box-sizing: border-box;
`;

export const StyledContainer = styled.div`
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 8px;
    box-sizing: border-box;
`;

export const StyledCard = styled.div`
    margin-top: 8px;
    padding: 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--card-radius);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
`;

export const StyledCardTitle = styled.h2`
    margin: 0 0 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

export const StyledRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid var(--black-color-10);

    &:first-of-type {
        border-top: none;
        padding-top: 0;
    }
`;

export const StyledLabel = styled.span`
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

export const StyledValue = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: var(--black-color);
    text-align: right;
    word-break: break-word;
`;

export const StyledButtonRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
`;

export const StyledLogoutBtn = styled.button`
    ${actionButtonStyle};
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--light-gray-color);
    background: var(--black-color);
    color: var(--white-color);
`;

export const StyledGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
`;

export const StyledMetricLink = styled(Link)`
    display: block;
    padding: 14px 10px;
    border-radius: var(--radius-lg);
    background: var(--gray-color2);
    text-align: center;
    text-decoration: none;
    transition: background 0.15s;

    .value {
        display: block;
        font-size: 22px;
        color: var(--black-color);
    }

    .label {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: var(--dark-gray-color2);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover { background: var(--light-gray-color); }
    }
`;

export const StyledHint = styled.p`
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
    line-height: 1.6;
`;

export const StyledResetBtn = styled(StyledDeleteBtn)`
    margin-top: 14px;
`;

export const StyledSyncStatus = styled.div<{$connected: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    background: ${(p) => p.$connected ? 'rgba(36,117,58,0.07)' : 'rgba(168,132,23,0.07)'};
    color: ${(p) => p.$connected ? 'var(--success-color)' : 'var(--caution-color)'};
    border: 1px solid ${(p) => p.$connected ? 'rgba(36,117,58,0.2)' : 'rgba(168,132,23,0.2)'};
`;

export const StyledSyncDot = styled.span`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
`;

export const StyledStepList = styled.ol`
    margin: 12px 0 0;
    padding: 0 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;

    .step {
        font-size: 13px;
        color: var(--dark-gray-color);
        line-height: 1.55;
    }

    .step-em {
        font-weight: 600;
        color: var(--black-color);
    }
`;

export const StyledGoogleButton = styled.button`
    ${actionButtonStyle};
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--light-gray-color);
    background: var(--white-color);
    color: var(--black-color);
`;

export const StyledNicknameView = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const StyledNicknameBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    align-items: flex-end;
`;

export const StyledNicknameEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    justify-content: flex-end;
`;

export const StyledNicknameInput = styled.input`
    width: 140px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--brand-color);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--black-color);
    outline: none;
    box-sizing: border-box;

    &:disabled { opacity: 0.6; }
`;

export const StyledSuggestions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
    width: 100%;
`;

export const StyledSuggestionsLabel = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

export const StyledSuggestionList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
`;

export const StyledSuggestionChip = styled.button`
    padding: 3px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 999px;
    background: var(--gray-color2);
    font-size: 12px;
    color: var(--dark-gray-color);
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--brand-color);
            color: var(--brand-color);
            background: var(--brand-color-bg);
        }
    }
`;

