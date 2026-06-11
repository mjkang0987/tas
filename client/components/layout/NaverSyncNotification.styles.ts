import styled from 'styled-components';

import {LabelBadge} from '../ui/LabelBadge';
import type {SyncNotification} from '../../hooks/useNaverBookingSync';
import {
    StyledOverlay,
    StyledDetail,
    StyledBodyInner,
    OVERLAY_Z_INDEX,
} from '../calendar/overlays/ModalStyles';

export const StyledContainer = styled.div`
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
`;

export const StyledBellButton = styled.button`
    position: relative;
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

export const StyledBadge = styled.span`
    position: absolute;
    top: 2px;
    right: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    box-sizing: border-box;
    border-radius: 999px;
    color: var(--white-color);
    background: var(--danger-color);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
`;

export const StyledPanel = styled.div`
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 4px;
    width: 320px;
    max-height: 400px;
    background: var(--white-color);
    border: 1px solid var(--modal-border);
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
    display: flex;
    flex-direction: column;
    z-index: 200;
`;

export const StyledPanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--light-gray-color);
    flex-shrink: 0;
`;

export const StyledPanelTitle = styled.span`
    font-size: var(--font);
    font-weight: 700;
    color: var(--black-color);
`;

export const StyledMarkReadButton = styled.button`
    background: none;
    border: none;
    color: var(--blue-color);
    font-size: var(--small-font);
    padding: 0;
`;

export const StyledPanelBody = styled.div`
    overflow-y: auto;
    flex: 1;
    min-height: 0;
`;

export const StyledSection = styled.div``;

export const StyledSectionLabel = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 700;
    color: var(--dark-gray-color2);
    letter-spacing: 0.02em;
    background: var(--white-color);
    border-bottom: 1px solid var(--gray-color2);
`;

export const StyledUnreadDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--blue-color);
    flex-shrink: 0;
`;

export const StyledFlag = styled.span`
    grid-row: 1 / 3;
    grid-column: 2 / 3;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--dark-gray-color);
    font-size: var(--tiny-font);
    white-space: nowrap;
`;

export const StyledEmpty = styled.div`
    padding: 32px 12px;
    text-align: center;
    font-size: var(--font);
    color: var(--dark-gray-color2);
`;

export const StyledItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background-color: var(--notification-unread-bg);
    margin-bottom: 4px;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--notification-unread-bg-hover);
        }
    }
`;

export const StyledItemText = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    font-size: var(--small-font);
    color: var(--black-color);

    .date {
        font-weight: 700;
    }

    .time {
        color: var(--dark-gray-color2);
    }

    .name {
        font-weight: 600;
    }

    .suffix {
        color: var(--dark-gray-color);
    }
`;

export const StyledConflictItemText = styled.div`
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 6px;
    font-size: var(--small-font);
    color: var(--black-color);

    .message {
        flex: 1;
        min-width: 0;
        line-height: 1.45;
        word-break: keep-all;
    }

    .date {
        font-weight: 800;
        color: var(--notification-text);
    }

    .time {
        color: var(--dark-gray-color2);
    }

    .name {
        font-weight: 700;
        color: var(--notification-text);
    }

    .suffix {
        color: var(--dark-gray-color);
    }
`;

export const StyledNaverTag = styled(LabelBadge).attrs({
    $tone: 'brand',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

export const StyledCancelTag = styled(LabelBadge).attrs({
    $tone: 'neutral',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

export const StyledConflictTag = styled(LabelBadge).attrs({
    $tone: 'danger',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

export const StyledStatusTag = styled(LabelBadge).attrs<{ $status?: SyncNotification['conflictStatus'] }>((props) => ({
    $tone: props.$status === 'deferred' ? 'warning' : props.$status === 'confirmed' ? 'success' : 'danger',
    $shape: 'soft',
    $size: 'sm',
}))<{ $status?: SyncNotification['conflictStatus'] }>`
    font-size: 10px;
`;

export const StyledDesignerMeta = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--dark-gray-color2);

`;

export const StyledPanelFooter = styled.div`
    display: flex;
    justify-content: center;
    padding: 8px 12px;
    border-top: 1px solid var(--light-gray-color);
    flex-shrink: 0;
`;

export const StyledShowAllButton = styled.button`
    background: none;
    border: none;
    color: var(--blue-color);
    font-size: var(--small-font);
    font-weight: 600;
    padding: 0;
`;

export const StyledModalOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.detail};
`;

export const StyledModalDetail = styled(StyledDetail)`
    max-width: min(440px, 90vw);
`;

export const StyledModalBodyInner = styled(StyledBodyInner)`
    padding: 0 0 30px 0;
`;

export const StyledModalItem = styled.div<{ $unread: boolean; $isConflict?: boolean }>`
    display: grid;
    grid-template-columns: ${({$isConflict}) => $isConflict ? '1fr' : '1fr 30px'};
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
    padding: 4px 8px;
    background-color: ${({$unread}) => $unread ? 'var(--notification-unread-bg)' : 'transparent'};
    border-bottom: 1px solid var(--gray-color2);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: ${({$unread}) => $unread ? 'var(--notification-unread-bg-hover)' : 'var(--gray-color2)'};
        }
    }

    &:last-child {
        border-bottom: none;
    }
`;
