import React, {useCallback, useState} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import type {Reservation, ReservationMap} from '../../utils/reservations';
import type {ConflictInfo} from '../../hooks/useNaverBookingSync';
import {useCalendarStore} from '../../store/calendarStore';
import {buildServiceColorMap} from '../../utils/services';
import {getDesignerColor} from '../../utils/designers';

import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledModalContent,
    StyledOverlay,
    StyledStatusBadge,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';
import {DesignerLabel} from '../ui/DesignerLabel';
import {LabelBadge} from '../ui/LabelBadge';
import {ServiceChipList} from '../ui/ServiceChip';

interface NaverSyncConflictModalProps {
    conflict: ConflictInfo;
    isConfirmed?: boolean;
    onAdvance: () => void;
    onDefer: () => void;
    onDismiss: () => void;
    onSelectReservation: (reservation: Reservation) => void;
}

function findCurrentReservation(reservationMap: ReservationMap, original: Reservation): Reservation | undefined {
    for (const reservations of Object.values(reservationMap)) {
        const matched = reservations.find((r) => r.id === original.id);
        if (matched) {
            return matched;
        }
    }

    return undefined;
}

function findAllOverlapping(reservationMap: ReservationMap, ...seeds: Reservation[]): Reservation[] {
    const dateKey = seeds[0]?.date;
    if (!dateKey) return seeds;

    const dateReservations = reservationMap[dateKey] ?? [];
    const designerId = seeds[0]?.designerId;

    // 같은 날짜, 같은 디자이너에서 seeds 중 하나라도 시간이 겹치는 예약을 모두 수집
    const ids = new Set(seeds.map((s) => s.id));
    const result = [...seeds];

    for (const r of dateReservations) {
        if (ids.has(r.id)) continue;
        if (r.status === 'cancelled' || r.status === 'noshow') continue;
        if (designerId != null && r.designerId !== designerId) continue;

        // seeds 또는 기존 result 중 하나와 겹치는지 확인
        const overlaps = result.some((s) =>
            s.startTime < r.endTime && s.endTime > r.startTime
        );
        if (overlaps) {
            ids.add(r.id);
            result.push(r);
        }
    }

    return result;
}

export const NaverSyncConflictModal = ({
                                           conflict,
                                           isConfirmed = false,
                                           onAdvance,
                                           onDefer,
                                           onDismiss,
                                           onSelectReservation,
                                       }: NaverSyncConflictModalProps) => {
    const {layerId, layerDataId} = useLayerInstanceId('naver-sync-conflict');
    const noop = useCallback(() => {
    }, []);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(noop);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const designers = useCalendarStore((s) => s.designers);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const serviceColorMap = buildServiceColorMap(serviceCatalog, categoryBaseColorMap);

    const [showUnresolvedConfirm, setShowUnresolvedConfirm] = useState(false);

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    const getCustomerName = (r: Reservation) => customerMap[r.customerId]?.name ?? '고객';
    const getDesignerName = (r: Reservation) => designers.find((d) => d.id === r.designerId)?.name ?? '미지정';
    const getDesignerDotColor = (r: Reservation) => getDesignerColor(designers.find((d) => d.id === r.designerId));
    const formatTime = (r: Reservation) => `${r.startTime} ~ ${r.endTime}`;

    const getChangedFields = (original: Reservation, current: Reservation): Set<string> => {
        const changed = new Set<string>();
        if (original.date !== current.date) changed.add('date');
        if (original.startTime !== current.startTime || original.endTime !== current.endTime) changed.add('time');
        if (original.service !== current.service) changed.add('service');
        if (original.designerId !== current.designerId) changed.add('designer');
        return changed;
    };

    const renderChangedTag = (field: string, changedFields: Set<string>) => {
        if (!changedFields.has(field)) return null;
        return <StyledChangedTag>(변경)</StyledChangedTag>;
    };

    const getChannelLabel = (r: Reservation) => {
        if (r.channel === '네이버예약') return '네이버예약';
        if (r.channel === '현장방문') return '현장방문';
        return '전화예약';
    };

    const renderReservation = (reservation: Reservation, isDangerTime: boolean, isDangerDesigner: boolean, changedFields: Set<string>) => {
        return (
            <StyledReservationDl>
                <dt>예약경로</dt>
                <dd>
                    <StyledConflictLabel $existing={reservation.channel !== '네이버예약'}>{getChannelLabel(reservation)}</StyledConflictLabel>
                </dd>

                <dt>고객명</dt>
                <dd>
                    <StyledCustomerValue>{getCustomerName(reservation)}</StyledCustomerValue>
                </dd>

                <dt>날짜 {renderChangedTag('date', changedFields)}</dt>
                <dd>{reservation.date}</dd>

                <StyledFieldLabel>
                    <span>시간</span>
                    {renderChangedTag('time', changedFields)}
                </StyledFieldLabel>
                <dd>
                    {isDangerTime ? (
                        <StyledDangerTimeRow>
                            <StyledDangerTime>{formatTime(reservation)}</StyledDangerTime>
                            <StyledStatusBadge $variant="danger">중복</StyledStatusBadge>
                        </StyledDangerTimeRow>
                    ) : (
                        formatTime(reservation)
                    )}
                </dd>

                <dt>서비스 {renderChangedTag('service', changedFields)}</dt>
                <dd>
                    <StyledServiceChipList service={reservation.service}
                                           serviceColorMap={serviceColorMap}
                                           keyPrefix={reservation.id} />
                </dd>

                <StyledFieldLabel>
                    <span>디자이너</span>
                    {renderChangedTag('designer', changedFields)}
                </StyledFieldLabel>
                <dd>
                    {isDangerDesigner ? (
                        <StyledDangerTimeRow>
                            <StyledDesignerText>
                                <DesignerLabel color={getDesignerDotColor(reservation)}
                                               name={getDesignerName(reservation)} />
                            </StyledDesignerText>
                            <StyledStatusBadge $variant="danger">중복</StyledStatusBadge>
                        </StyledDangerTimeRow>
                    ) : (
                        <DesignerLabel color={getDesignerDotColor(reservation)}
                                       name={getDesignerName(reservation)} />
                    )}
                </dd>
            </StyledReservationDl>
        );
    };

    const currentNew = findCurrentReservation(reservationMap, conflict.newReservation) ?? conflict.newReservation;
    const currentExisting = findCurrentReservation(reservationMap, conflict.existingReservation) ?? conflict.existingReservation;

    // 같은 날짜/디자이너에서 시간이 겹치는 모든 예약을 수집
    const allOverlapping = findAllOverlapping(reservationMap, currentNew, currentExisting);

    // 취소/노쇼 감지
    const cancelledReservations: Array<{ reservation: Reservation; statusLabel: string }> = [];
    for (const current of allOverlapping) {
        if (current.status === 'cancelled') {
            cancelledReservations.push({reservation: current, statusLabel: '취소'});
        } else if (current.status === 'noshow') {
            cancelledReservations.push({reservation: current, statusLabel: '노쇼'});
        }
    }
    const isConflictDismissed = cancelledReservations.length > 0;

    const activeOverlapping = allOverlapping.filter((r) => r.status !== 'cancelled' && r.status !== 'noshow');
    const stillOverlapping = !isConflictDismissed && activeOverlapping.length >= 2;
    const sameDesigner =
        stillOverlapping
        && activeOverlapping.every((r) => r.designerId != null && r.designerId === activeOverlapping[0].designerId);

    const isCancelledNew = currentNew.status === 'cancelled' || currentNew.status === 'noshow';
    const isCancelledExisting = currentExisting.status === 'cancelled' || currentExisting.status === 'noshow';
    const changedFieldsNew = getChangedFields(conflict.newReservation, currentNew);
    const changedFieldsExisting = getChangedFields(conflict.existingReservation, currentExisting);

    // 변경사항 감지: 원본 vs 현재
    const resolvedChanges: Array<{ reservation: Reservation; lines: string[] }> = [];
    if (!stillOverlapping && !isConflictDismissed) {
        for (const [original, current] of [
            [conflict.newReservation, currentNew],
            [conflict.existingReservation, currentExisting],
        ] as const) {
            const lines: string[] = [];
            if (original.startTime !== current.startTime || original.endTime !== current.endTime) {
                lines.push(`${original.startTime}~${original.endTime} → ${current.startTime}~${current.endTime} 예약시간이 변경되었습니다.`);
            }
            if (original.designerId !== current.designerId) {
                const oldName = designers.find((d) => d.id === original.designerId)?.name ?? '미지정';
                const newName = designers.find((d) => d.id === current.designerId)?.name ?? '미지정';
                lines.push(`${oldName} → ${newName} 디자이너가 변경되었습니다.`);
            }
            if (original.date !== current.date) {
                lines.push(`${original.date} → ${current.date} 예약날짜가 변경되었습니다.`);
            }
            if (lines.length > 0) {
                resolvedChanges.push({reservation: current, lines});
            }
        }
    }

    const isUnresolved = stillOverlapping && !isConflictDismissed;

    // 원래 pair에 포함되지 않은 추가 겹침 예약
    const extraOverlapping = allOverlapping.filter((r) => r.id !== currentNew.id && r.id !== currentExisting.id);

    const handleAdvanceClick = () => {
        if (isUnresolved) {
            setShowUnresolvedConfirm(true);
            return;
        }
        onAdvance();
    };

    return createPortal(
        <StyledConfirmOverlay role="dialog"
                              aria-modal="true"
                              aria-label="예약 시간 중복 안내"
                              id={layerId}
                              data-layer-id={layerDataId}>
            <StyledConfirmModal ref={dialogRef}
                                tabIndex={-1}
                                onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <h3>{isConfirmed ? '예약 시간 중복 처리 완료' : '예약 시간 중복 안내'}</h3>
                        <p>{isConfirmed ? '처리 완료된 예약 중복 내역입니다.' : '네이버 예약 동기화 중 시간이 겹치는 예약이 발견되었습니다.'}</p>
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onDismiss} />
                </StyledHeader>
                <StyledScrollArea>
                    <StyledModalContent>
                        {isConflictDismissed && (
                            <StyledResolvedNotice>
                                {cancelledReservations.map(({reservation, statusLabel}) => (
                                    <div key={reservation.id}>
                                        <strong className="notice-title">{getCustomerName(reservation)}님 예약이 {statusLabel} 되었습니다.</strong>
                                        {!isConfirmed && (
                                            <ul className="notice-list">
                                                <li className="notice-item">확인을 누르시면 해당 예약 중복이 더이상 노출되지 않습니다.</li>
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </StyledResolvedNotice>
                        )}
                        {!stillOverlapping && !isConflictDismissed && resolvedChanges.length > 0 && (
                            <StyledResolvedNotice>
                                {resolvedChanges.map(({reservation, lines}) => (
                                    <div key={reservation.id}>
                                        <strong className="notice-title">{getCustomerName(reservation)}님의 예약 변경으로 예약 시간 중복이 해결되었습니다.</strong>
                                        <ul className="notice-list">
                                            {lines.map((line) => <li className="notice-item" key={line}>{line}</li>)}
                                            {!isConfirmed && (
                                                <li className="notice-item">확인을 누르시면 해당 예약 중복이 더이상 노출되지 않습니다.</li>
                                            )}
                                        </ul>
                                    </div>
                                ))}
                            </StyledResolvedNotice>
                        )}
                        <StyledGuideNotice>
                            네이버예약의 실제 변경/취소는 스마트플레이스 통해서 가능합니다.
                        </StyledGuideNotice>
                        <StyledConflictCard>
                            <StyledCancelledWrapper $cancelled={isCancelledNew}>
                                <StyledClickableInfo onClick={() => onSelectReservation(currentNew)}>
                                    {renderReservation(currentNew, stillOverlapping, sameDesigner, changedFieldsNew)}
                                </StyledClickableInfo>
                            </StyledCancelledWrapper>

                            <StyledCancelledWrapper $cancelled={isCancelledExisting}>
                                <StyledClickableInfo onClick={() => onSelectReservation(currentExisting)}>
                                    {renderReservation(currentExisting, stillOverlapping, sameDesigner, changedFieldsExisting)}
                                </StyledClickableInfo>
                            </StyledCancelledWrapper>

                            {extraOverlapping.map((extra) => {
                                const isCancelledExtra = extra.status === 'cancelled' || extra.status === 'noshow';
                                return (
                                    <StyledCancelledWrapper key={extra.id} $cancelled={isCancelledExtra}>
                                        <StyledClickableInfo onClick={() => onSelectReservation(extra)}>
                                            {renderReservation(extra, stillOverlapping, sameDesigner, new Set())}
                                        </StyledClickableInfo>
                                    </StyledCancelledWrapper>
                                );
                            })}
                        </StyledConflictCard>
                    </StyledModalContent>
                </StyledScrollArea>
                <StyledFooter>
                    {!isConfirmed && <>
                        <StyledActionButton type="button"
                                            onClick={onDefer}>보류</StyledActionButton>
                        <StyledActionButton type="button"
                                            $primary
                                            onClick={handleAdvanceClick}>확인</StyledActionButton>
                    </>}
                </StyledFooter>
                {showUnresolvedConfirm && (
                    <StyledUnresolvedOverlay>
                        <StyledUnresolvedDialog>
                            <StyledUnresolvedMessage>
                                예약 중복이 수정되지 않았습니다.<br />
                                확인처리 하시겠습니까?
                            </StyledUnresolvedMessage>
                            <StyledUnresolvedActions>
                                <StyledActionButton type="button"
                                                    onClick={() => setShowUnresolvedConfirm(false)}>취소</StyledActionButton>
                                <StyledActionButton type="button"
                                                    $primary
                                                    onClick={() => { setShowUnresolvedConfirm(false); onAdvance(); }}>확인</StyledActionButton>
                            </StyledUnresolvedActions>
                        </StyledUnresolvedDialog>
                    </StyledUnresolvedOverlay>
                )}
            </StyledConfirmModal>
        </StyledConfirmOverlay>,
        modalRoot
    );
};

const StyledConfirmOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.supporting};
`;

const StyledCustomerValue = styled.span`
    font-weight: 600;
    color: #0f172a;
`;

const StyledServiceChipList = styled(ServiceChipList)``;

const StyledDesignerText = styled.span`
    display: inline-flex;
    align-items: center;
`;

const StyledConfirmModal = styled(StyledDetail)`
    width: min(420px, 90vw);
    max-width: min(420px, 90vw);
`;

const StyledScrollArea = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-height: 60vh;
`;

const StyledResolvedNotice = styled.div`
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

const StyledGuideNotice = styled.p`
    margin: 0 0 12px;
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(3, 199, 90, 0.08);
    color: #0f5132;
    font-size: 12px;
    line-height: 1.45;
    word-break: keep-all;
`;

const StyledConflictCard = styled.div`
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

const StyledConflictLabel = styled(LabelBadge).attrs<{ $existing?: boolean }>((props) => ({
    $tone: props.$existing ? 'warning' : 'brand',
    $shape: 'soft',
    $size: 'sm',
}))<{ $existing?: boolean }>`
    width: fit-content;
`;

const StyledClickableInfo = styled.div`
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: rgba(59, 130, 246, 0.06);
        }
    }
`;

const StyledReservationDl = styled.dl`
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

const StyledFieldLabel = styled.dt`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--dark-gray-color);
    font-weight: 500;
`;

const StyledInlineConflictBadge = styled(LabelBadge).attrs({
    $tone: 'danger',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

const StyledDangerTime = styled.span`
    color: var(--danger-color);
    font-weight: 600;
`;

const StyledDangerTimeRow = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const StyledChangedTag = styled.span`
    color: var(--danger-color);
    font-weight: 700;
    font-size: 11px;
`;

const StyledCancelledWrapper = styled.div<{ $cancelled: boolean }>`
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

const StyledUnresolvedOverlay = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
    border-radius: var(--modal-radius);
    z-index: 10;
`;

const StyledUnresolvedDialog = styled.div`
    background: var(--white-color);
    border-radius: var(--radius-md);
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    max-width: 280px;
    width: 100%;
`;

const StyledUnresolvedMessage = styled.p`
    margin: 0 0 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--black-color);
    text-align: center;
    line-height: 1.6;
`;

const StyledUnresolvedActions = styled.div`
    display: flex;
    gap: 8px;
    justify-content: center;
`;
