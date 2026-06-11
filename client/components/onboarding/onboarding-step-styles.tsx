import styled from 'styled-components';

/* ── Navigation ── */

export const StyledNavRow = styled.div<{$centered?: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: auto;
    padding-top: 8px;
    justify-content: ${({$centered}) => $centered ? 'center' : 'flex-end'};
`;

export const StyledBackBtn = styled.button`
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--white-color);
    font-size: 13px;
    font-weight: 500;
    color: var(--dark-gray-color);
    cursor: pointer;
    margin-right: auto;
    box-shadow: var(--shadow-sm);
`;

export const StyledSkipBtn = styled.button<{$leftAlign?: boolean}>`
    min-height: 32px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color2);
    cursor: pointer;
    ${({$leftAlign}) => $leftAlign && 'margin-right: auto;'}

    @media (hover: hover) and (pointer: fine) {
        &:hover { color: var(--dark-gray-color); }
    }
`;

export const StyledNextBtn = styled.button`
    min-height: 32px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: var(--brand-color);
    font-size: 13px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: opacity 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover { opacity: 0.88; }
    }
`;

/* ── Text helpers ── */

export const StyledSectionNote = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
    line-height: 1.5;
`;

export const StyledHighlight = styled.span`
    color: var(--blue-color);
    font-weight: 600;
`;

/* ── Add-form shared ── */

export const StyledAddForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px dashed var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--gray-color2);
`;

export const StyledAddFormRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;

    select {
        flex: 1;
        min-width: 120px;
        height: 34px;
        padding: 0 8px;
        border: 1px solid var(--light-gray-color);
        border-radius: var(--radius-sm);
        font-size: 13px;
        background: var(--white-color);
        outline: none;

        &:focus { border-color: var(--blue-color); }
    }
`;

export const StyledAddInput = styled.input`
    flex: 1;
    min-width: 80px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    font-size: 13px;
    background: var(--white-color);
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: var(--blue-color); }
`;

export const StyledAddFormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
`;

export const StyledCancelBtnSm = styled.button`
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-sm);
    background: var(--white-color);
    font-size: 12px;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

export const StyledConfirmBtnSm = styled.button`
    height: 30px;
    padding: 0 12px;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--brand-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
`;

export const StyledAddServiceBtn = styled.button`
    width: 100%;
    height: 36px;
    border: 1px dashed var(--light-gray-color);
    border-radius: var(--radius-md);
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--blue-color);
            color: var(--blue-color);
        }
    }
`;
