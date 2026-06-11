import styled from 'styled-components';

import {LabelBadge} from '../ui/LabelBadge';

export const StyledContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const StyledCreateRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;

    @media (max-width: 640px) {
        flex-wrap: wrap;

        > * {
            flex: 1;
            min-width: 0;
        }
    }
`;

export const StyledList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const StyledInviteItem = styled.div<{$dimmed?: boolean}>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: ${(p) => p.$dimmed ? 'var(--gray-color2)' : 'var(--brand-color-bg)'};
    border: 1px solid ${(p) => p.$dimmed ? 'var(--border-color)' : 'var(--brand-color-border)'};
    opacity: ${(p) => p.$dimmed ? 0.65 : 1};

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

export const StyledCodeBlock = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

export const StyledCode = styled.span<{$dimmed?: boolean}>`
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 3px;
    color: ${(p) => p.$dimmed ? 'var(--dark-gray-color2)' : 'var(--brand-color)'};
    user-select: all;
`;

export const StyledBadge = styled(LabelBadge).attrs({
    $shape: 'soft',
    $size: 'sm',
})``;

export const StyledInviteActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 640px) {
        width: 100%;
        justify-content: flex-end;
    }
`;

export const StyledExpiry = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
    white-space: nowrap;
`;

export const StyledCopyButton = styled.button`
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    color: var(--dark-gray-color);
    font-size: 11px;
    font-weight: 600;
    transition: background-color 0.15s, border-color 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--gray-color2);
            border-color: var(--dark-gray-color2);
        }
    }
`;

export const StyledDeleteButton = styled.button`
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 11px;
    font-weight: 600;
    transition: opacity 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.8;
        }
    }
`;

export const StyledMemberItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--gray-color2);
    border: 1px solid var(--border-color);

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

export const StyledMemberInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

export const StyledMemberName = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color);
`;

export const StyledSelfTag = styled.span`
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: var(--chip-radius);
    background: var(--black-color-10);
    color: var(--dark-gray-color2);
`;

export const StyledMemberActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 640px) {
        width: 100%;
        justify-content: flex-end;
    }
`;

export const StyledMemberEmail = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

export const StyledRoleSelect = styled.select`
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    color: var(--dark-gray-color);
    font-size: 12px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

export const StyledKickButton = styled.button`
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 11px;
    font-weight: 600;
    transition: opacity 0.15s;

    &:disabled {
        opacity: 0.4;
        cursor: default;
    }

    @media (hover: hover) and (pointer: fine) {
        &:not(:disabled):hover {
            opacity: 0.8;
        }
    }
`;

export const StyledGuestCard = styled.div`
    padding: 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
`;

export const StyledGuestTitle = styled.h3`
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

export const StyledGuestDesc = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--dark-gray-color2);
`;

export const StyledConfirmText = styled.p`
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.6;
`;
