import styled from 'styled-components';

import {OVERLAY_Z_INDEX, StyledOverlay, StyledDetail, scrollHintStyle, scrollContentStyle} from './ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {ColorTag} from '../../ui/ColorTag';

/* ── Overlay / panel ── */

export const StyledCustomerOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.childDetail};
`;

export const StyledCustomerDetail = styled(StyledDetail)`
    width: 360px;
`;

export const StyledCustomerContent = styled.div`
    ${scrollContentStyle};
    display: flex;
    flex-direction: column;
`;

/* ── Header ── */

export const StyledHeaderActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

export const StyledHeaderActionButton = styled.button<{ $primary?: boolean; $danger?: boolean }>`
    height: 30px;
    padding: 0 10px;
    border: ${props => (props.$danger || props.$primary) ? 'none' : '1px solid var(--border-color)'};
    border-radius: 8px;
    background: ${props => props.$danger ? 'var(--danger-color)' : props.$primary ? 'var(--brand-color)' : 'var(--white-color)'};
    color: ${props => (props.$danger || props.$primary) ? 'var(--white-color)' : 'var(--dark-gray-color)'};
    font-size: 12px;
    font-weight: 600;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const StyledHeaderCloseButton = styled(CloseIconButton)`
    flex-shrink: 0;
`;

/* ── Info section ── */

export const StyledInfo = styled.div`
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);

    dl {
        display: grid;
        grid-template-columns: 60px 1fr;
        gap: 4px 12px;
        margin: 0;
    }

    dt {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 500;
    }

    dd {
        margin: 0;
        font-size: 13px;
    }
`;

export const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

export const StyledNoshowCount = styled.span<{ $hasNoshow: boolean }>`
    color: ${(p) => p.$hasNoshow ? 'var(--warning-color)' : 'inherit'};
    font-weight: ${(p) => p.$hasNoshow ? 700 : 'inherit'};
`;

export const StyledEditFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    label {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    span {
        font-size: 12px;
        font-weight: 600;
        color: var(--dark-gray-color);
    }

    input {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        font-size: 13px;
    }
`;

export const StyledPointInfo = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-color);
`;

/* ── Memo section ── */

export const StyledAddressMemoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);

    h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
    }
`;

export const StyledAddressMemoList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const StyledTagEditor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const StyledTagInputRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;

    input {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        font-size: 12px;
    }

    button {
        height: 34px;
        padding: 0 12px;
        border: none;
        border-radius: 8px;
        background: var(--brand-color);
        color: var(--white-color);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
    }
`;

export const StyledColorRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const StyledAddressMemoItem = styled(ColorTag)`
    min-height: 24px;
    padding: 3px 7px;
    font-size: 12px;
    gap: 6px;
`;

export const StyledTagRemoveButton = styled.button`
    border: none;
    background: transparent;
    color: inherit;
    font-size: 11px;
    font-weight: 700;
`;

export const StyledEditError = styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--danger-color);
`;

export const StyledEmptyText = styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

/* ── Point history section ── */

export const StyledPointHistorySection = styled.div`
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);

    h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
    }
`;

export const StyledPointHistoryHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

export const StyledPointHistoryMoreButton = styled.button`
    border: none;
    background: none;
    font-size: 12px;
    color: var(--brand-color);
    font-weight: 600;
    padding: 0;
`;

export const StyledPointHistoryList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const StyledPointHistoryItem = styled.li<{$clickable?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    cursor: ${(p) => p.$clickable ? 'pointer' : 'default'};

    ${(p) => p.$clickable && `
        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background: var(--gray-color2);
            }
        }
    `}
`;

export const StyledPointHistoryTop = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;

    strong {
        font-size: 12px;
        font-weight: 600;
    }

    span {
        font-size: 12px;
        font-weight: 700;
        color: var(--brand-color);
    }
`;

export const StyledPointHistoryMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

/* ── Point history modal ── */

export const StyledPointHistoryOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

export const StyledPointHistoryModal = styled(StyledDetail)`
    width: min(360px, 90vw);
    max-height: 70vh;
`;

export const StyledPointHistoryModalContent = styled.div`
    ${scrollContentStyle};
    padding: 8px;
`;

/* ── Reservation section ── */

export const StyledReservationSection = styled.div`
    flex: 1;
    ${scrollHintStyle};
`;

export const StyledReservationScroll = styled.div`
    ${scrollContentStyle};
    padding: 8px 8px 30px;

    h4 {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 600;
    }
`;

export const StyledMoreButton = styled.button`
    display: block;
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid var(--dark-gray-color2);
    border-radius: 4px;
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

/* ── Unmerge modal ── */

export const StyledUnmergeOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

export const StyledUnmergeModal = styled(StyledDetail)`
    width: min(360px, 90vw);
`;

export const StyledUnmergeContent = styled.div`
    padding: 12px;
`;

export const StyledUnmergeMessage = styled.p`
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dark-gray-color);
    word-break: keep-all;

    strong {
        color: #0f172a;
    }
`;

export const StyledUnmergeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const StyledUnmergeItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--gray-color2);
    font-size: 12px;

    strong {
        font-weight: 700;
        color: #0f172a;
    }

    span {
        color: var(--dark-gray-color2);
    }

    .date {
        margin-left: auto;
        font-size: 11px;
    }
`;

export const StyledUnmergeFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 10px 14px 14px;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
`;
