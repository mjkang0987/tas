import React from 'react';

import styled from 'styled-components';

import type {ReservationHistoryEntry} from '../../../utils/reservations';
import type {ReservationDiffItem} from './reservationDetailTypes';
import {
    OVERLAY_Z_INDEX,
    StyledBody,
    StyledBodyInner,
    StyledDetail,
    StyledDiffGrid,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {LabelBadge} from '../../ui/LabelBadge';

interface ReservationHistoryLayerProps {
    history: ReservationHistoryEntry[];
    designerNameMap: Record<number, string>;
    getHistoryDiffs: (entry: ReservationHistoryEntry, designerNameMap: Record<number, string>) => ReservationDiffItem[];
    formatTimestamp: (iso: string) => string;
    isOpen: boolean;
    onClose: () => void;
}

export function ReservationHistoryLayer({
    history,
    designerNameMap,
    getHistoryDiffs,
    formatTimestamp,
    isOpen,
    onClose,
}: ReservationHistoryLayerProps) {
    const {layerId, layerDataId} = useLayerInstanceId('reservation-history');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    if (!isOpen) return null;

    return (
        <StyledHistoryOverlay
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="예약 변경 이력"
            id={layerId}
            data-layer-id={layerDataId}
        >
            <StyledHistoryPanel ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} $width={400}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <h3>변경 이력</h3>
                        <p>예약 상태와 시간, 서비스 변경 흐름을 시간순으로 보여줍니다.</p>
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledBody>
                    <StyledBodyInner>
                        <StyledHistoryDetailList>
                            {[...history].reverse().map((entry, index) => {
                                const diffs = getHistoryDiffs(entry, designerNameMap);
                                const isCancelEntry = entry.after.status === 'cancelled' && entry.before.status !== 'cancelled';
                                const isNoshowEntry = entry.after.status === 'noshow' && entry.before.status !== 'noshow';
                                const isCompleteEntry = entry.after.status === 'completed' && entry.before.status !== 'completed';
                                const isRestoreEntry = entry.after.status === 'active' && (entry.before.status === 'cancelled' || entry.before.status === 'noshow');
                                const entryType = isCancelEntry ? 'cancelled' : isNoshowEntry ? 'noshow' : isCompleteEntry ? 'completed' : isRestoreEntry ? 'restored' : 'edit';

                                return (
                                    <StyledHistoryDetailItem key={index} $type={entryType}>
                                        <StyledHistoryDetailHeader>
                                            <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                                            <StyledHistoryTypeBadge $type={entryType}>
                                                {isCancelEntry ? '예약취소' : isNoshowEntry ? '노쇼' : isCompleteEntry ? '예약완료' : isRestoreEntry ? '예약전환' : '변경'}
                                            </StyledHistoryTypeBadge>
                                        </StyledHistoryDetailHeader>
                                        <StyledHistoryDetailDiffs>
                                            {diffs.map((diff) => (
                                                <StyledHistoryDiffGrid key={diff.label}>
                                                    <dt>{diff.label}</dt>
                                                    <dd>
                                                        <del>{diff.before}</del>
                                                        <ins>{diff.after}</ins>
                                                    </dd>
                                                </StyledHistoryDiffGrid>
                                            ))}
                                        </StyledHistoryDetailDiffs>
                                    </StyledHistoryDetailItem>
                                );
                            })}
                        </StyledHistoryDetailList>
                    </StyledBodyInner>
                </StyledBody>
            </StyledHistoryPanel>
        </StyledHistoryOverlay>
    );
}

const StyledHistoryOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.childDetail};
    background-color: rgba(0, 0, 0, 0.24);
`;

const StyledHistoryPanel = styled(StyledDetail)``;

const StyledHistoryDetailList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const HISTORY_ITEM_STYLES: Record<string, { bg: string; border: string }> = {
    cancelled: {bg: 'rgba(241, 245, 249, 0.92)', border: 'rgba(203, 213, 225, 0.95)'},
    noshow: {bg: 'var(--danger-bg)', border: 'var(--danger-border)'},
    completed: {bg: '#E6F4EA', border: '#CDEAD6'},
    restored: {bg: '#EFF6FF', border: '#BFDBFE'},
};

const StyledHistoryDetailItem = styled.div<{ $type: string }>`
    padding: var(--gap-lg);
    background-color: ${(props) => HISTORY_ITEM_STYLES[props.$type]?.bg || 'var(--black-color-10)'};
    border: 1px solid ${(props) => HISTORY_ITEM_STYLES[props.$type]?.border || 'transparent'};
    border-radius: var(--radius-md);
`;

const StyledHistoryDetailHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    > time {
        font-size: var(--xsmall-font);
        color: var(--dark-gray-color);
    }
`;

const StyledHistoryTypeBadge = styled(LabelBadge).attrs<{ $type: string }>((props) => ({
    $tone: props.$type === 'cancelled' ? 'neutral' : props.$type === 'noshow' ? 'danger' : props.$type === 'completed' ? 'success' : props.$type === 'restored' ? 'brand' : 'info',
    $shape: 'soft',
    $size: 'sm',
}))<{ $type: string }>`
    font-size: var(--tiny-font);
    font-weight: 600;
`;

const StyledHistoryDetailDiffs = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--gap-xs);
`;

const StyledHistoryDiffGrid = styled(StyledDiffGrid)`
    display: flex;
    flex-wrap: wrap;

    dt {
        flex: 0 0 40px;
        font-size: var(--xsmall-font);
    }

    del, ins {
        font-size: var(--xsmall-font);
    }

    dd {
        gap: var(--gap-sm);
    }
`;
