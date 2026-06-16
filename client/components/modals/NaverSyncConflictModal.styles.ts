import styled from 'styled-components';

import {OVERLAY_Z_INDEX, StyledDetail, StyledOverlay} from '../calendar/overlays/ModalStyles';
import {LabelBadge} from '../ui/LabelBadge';
import {ServiceChipList} from '../ui/ServiceChip';
export const StyledConfirmOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.supporting};
`;

export const StyledCustomerValue = styled.span`
    font-weight: 600;
    color: #0f172a;
`;

export const StyledServiceChipList = styled(ServiceChipList)``;

export const StyledDesignerText = styled.span`
    display: inline-flex;
    align-items: center;
`;

export const StyledConfirmModal = styled(StyledDetail)`
    width: min(420px, 90vw);
    max-width: min(420px, 90vw);
`;

export const StyledScrollArea = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-height: 60vh;
`;

export const StyledResolvedNotice = styled.div`
    margin: 0 0 8px;
    padding: 8px;
    border-radius: 8px;
    background: rgba(220, 38, 38, 0.06);
    border: 1px solid rgba(220, 38, 38, 0.2);
    color: #991b1b;
    font-size: 12px;
    line-height: 1.5;
    word-break: keep-all;

    .notice-title {
        display: block;
        font-weight: 700;

        + .notice-list {
            margin-top: 6px;
        }
    }

    .notice-list {
        margin: 0;
        padding-left: 16px;
    }

    .notice-item {
        margin-bottom: 2px;
    }

    .notice-item:last-child {
        margin-top: 6px;
        font-weight: 600;
        color: #7f1d1d;
    }
`;

export const StyledGuideNotice = styled.p`
    margin: 0 0 12px;
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(3, 199, 90, 0.08);
    color: #0f5132;
    font-size: 12px;
    line-height: 1.45;
    word-break: keep-all;
`;

export const StyledConflictCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    & + & {
        margin-top: 12px;
    }
`;

export const StyledConflictLabel = styled(LabelBadge).attrs<{ $existing?: boolean }>((props) => ({
    $tone: props.$existing ? 'warning' : 'brand',
    $shape: 'soft',
    $size: 'sm',
}))<{ $existing?: boolean }>`
    width: fit-content;
`;

export const StyledClickableInfo = styled.div`
    cursor: pointer;
    padding: 10px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    transition: background-color 0.14s ease, border-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: rgba(45, 127, 249, 0.25);
            background-color: rgba(59, 130, 246, 0.04);
        }
    }
`;

export const StyledReservationDl = styled.dl`
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 4px 8px;
    padding: 4px 8px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: var(--radius-md);
    margin: 0;

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

export const StyledFieldLabel = styled.dt`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--dark-gray-color);
    font-weight: 500;
`;

export const StyledInlineConflictBadge = styled(LabelBadge).attrs({
    $tone: 'danger',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

export const StyledDangerTime = styled.span`
    color: var(--danger-color);
    font-weight: 600;
`;

export const StyledDangerTimeRow = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

export const StyledChangedTag = styled.span`
    color: var(--danger-color);
    font-weight: 700;
    font-size: 11px;
`;

export const StyledCancelledWrapper = styled.div<{ $cancelled: boolean }>`
    position: relative;

    ${(props) => props.$cancelled && `
        &::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: var(--radius-sm);
            background:
                repeating-linear-gradient(
                    -45deg,
                    transparent,
                    transparent 6px,
                    rgba(150, 150, 150, 0.18) 6px,
                    rgba(150, 150, 150, 0.18) 7px
                );
            background-color: rgba(255, 255, 255, 0.55);
            pointer-events: none;
            z-index: 1;
        }
    `}
`;

export const StyledUnresolvedOverlay = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
    border-radius: var(--modal-radius);
    z-index: 10;
`;

export const StyledUnresolvedDialog = styled.div`
    background: var(--white-color);
    border-radius: var(--radius-md);
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    max-width: 280px;
    width: 100%;
`;

export const StyledUnresolvedMessage = styled.p`
    margin: 0 0 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--black-color);
    text-align: center;
    line-height: 1.6;
`;

export const StyledUnresolvedActions = styled.div`
    display: flex;
    gap: 8px;
    justify-content: center;
`;


export const StyledConflictReservation = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const StyledConflictBadges = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

export const StyledReasonTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--dark-gray-color);
    margin-bottom: 8px;

    span {
        font-weight: 500;
        color: var(--dark-gray-color2);
    }
`;

export const StyledReasonList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
`;

export const StyledReasonOption = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--dark-gray-color);
    cursor: pointer;

    input {
        flex-shrink: 0;
    }
`;

export const StyledReasonMemo = styled.textarea`
    width: 100%;
    min-height: 56px;
    padding: 8px 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
    outline: none;

    &:focus {
        border-color: var(--brand-color);
    }
`;

export const StyledReasonSummary = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: 0 0 12px;
    padding: 8px 10px;
    border: 1px solid var(--info-border);
    border-radius: var(--radius-md);
    background: var(--info-bg);
    color: var(--dark-gray-color);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.45;

    &::before {
        content: 'ⓘ';
        color: var(--info-color);
        font-weight: 700;
        flex-shrink: 0;
    }
`;
