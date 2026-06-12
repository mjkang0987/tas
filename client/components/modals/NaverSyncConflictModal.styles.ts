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
    gap: 8px;
    padding: 12px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: var(--radius-md);
    background: rgba(248, 250, 252, 0.5);

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
    border-radius: var(--radius-sm);
    transition: background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: rgba(59, 130, 246, 0.06);
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

