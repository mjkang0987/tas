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
    border: 1px solid var(--blue-color);
    background-color: var(--blue-color);
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

export const StyledEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

export const StyledServiceFooter = styled.div`
    padding: 12px 16px;
    border-top: 1px solid var(--light-gray-color);
`;
