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
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';

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
                    <h3>변경 이력</h3>
                    <button type="button" onClick={onClose} aria-label="닫기">닫기</button>
                </StyledHeader>
                <StyledBody>
                    <StyledBodyInner>
                        <StyledHistoryDetailList>
                            {[...history].reverse().map((entry, index) => {
                                const diffs = getHistoryDiffs(entry, designerNameMap);
                                const isCancelEntry = entry.after.status === 'cancelled' && entry.before.status !== 'cancelled';
                                const isNoshowEntry = entry.after.status === 'noshow' && entry.before.status !== 'noshow';
                                const entryType = isCancelEntry ? 'cancelled' : isNoshowEntry ? 'noshow' : 'edit';

                                return (
                                    <StyledHistoryDetailItem key={index} $type={entryType}>
                                        <StyledHistoryDetailHeader>
                                            <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                                            <StyledHistoryTypeBadge $type={entryType}>
                                                {isCancelEntry ? '예약취소' : isNoshowEntry ? '노쇼' : '변경'}
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
    cancelled: {bg: 'var(--danger-bg)', border: 'var(--danger-border)'},
    noshow: {bg: 'var(--warning-bg)', border: 'var(--warning-border)'},
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

const HISTORY_BADGE_COLORS: Record<string, string> = {
    cancelled: 'var(--danger-color)',
    noshow: 'var(--warning-color)',
};

const StyledHistoryTypeBadge = styled.span<{ $type: string }>`
    display: inline-block;
    padding: 2px var(--gap-sm);
    border-radius: var(--radius-sm);
    font-size: var(--tiny-font);
    font-weight: 600;
    background-color: ${(props) => HISTORY_BADGE_COLORS[props.$type] || 'var(--blue-color)'};
    color: #fff;
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
