import styled, {css} from 'styled-components';

export const actionButtonStyle = css`
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    transition: opacity 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease,
                border-color 0.15s ease, background-color 0.15s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

export const mobileStretchButtonStyle = css`
    @media (max-width: 640px) {
        flex: 1;
    }
`;

export const StyledEditBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    font-size: 11px;
    color: var(--dark-gray-color);
`;

export const StyledSaveBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--brand-color);
    background-color: var(--brand-color);
    color: var(--white-color);
`;

export const StyledCancelBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    color: var(--dark-gray-color);
`;

export const StyledDeleteBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--danger-border);
    background: var(--danger-bg);
    font-size: 11px;
    color: var(--danger-color);
`;

export const StyledSelect = styled.select`
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 12px;
    color: var(--dark-gray-color);
    cursor: pointer;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:focus {
        border-color: var(--brand-color);
        box-shadow: 0 0 0 3px rgba(101, 38, 217, 0.12);
    }

    &:disabled {
        background: var(--gray-color2);
        color: var(--dark-gray-color2);
    }
`;

export const StyledSettingsCard = styled.div`
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
    padding: 16px;
    margin-bottom: 16px;
`;

export const StyledSettingsCardTitle = styled.h3`
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

export const StyledSettingsHint = styled.p`
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

export const EMPTY_TEXT = '등록된 데이터가 없습니다';

export const StyledEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

export const StyledEmptyCard = styled.p`
    padding: 16px 10px;
    font-size: var(--small-font);
    color: var(--gray-color);
    text-align: center;
    background-color: var(--black-color-10);
    border-radius: 4px;
    margin: 0;
`;

export const StyledServiceFooter = styled.div`
    padding: 12px 16px;
    border-top: 1px solid var(--light-gray-color);
`;
