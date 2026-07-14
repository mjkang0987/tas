import React, {useCallback, useState} from 'react';
import {createPortal} from 'react-dom';

import type {Reservation, ReservationMap} from '../../utils/reservations';
import type {ConflictInfo} from '../../hooks/useNaverBookingSync';
import {useCalendarStore} from '../../store/calendarStore';
import {buildServiceColorMap} from '../../utils/services';
import {getAssigneeColor} from '../../utils/assignees';
import {useStoreLabels} from '../../hooks/useStoreLabels';

import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledHeaderTitleGroupText,
    StyledModalContent,
    StyledOverlay,
    StyledStatusBadge,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';
import {ReservationInfoCard} from '../ui/ReservationInfoCard';
import {NaverBookingInfo} from '../ui/NaverBookingInfo';
import {
    StyledConflictTitle,
    StyledConfirmOverlay,
    StyledConfirmModal,
    StyledScrollArea,
    StyledResolvedNotice,
    StyledGuideNotice,
    StyledConflictCard,
    StyledClickableInfo,
    StyledConflictReservation,
    StyledConflictBadges,
    StyledCancelledWrapper,
    StyledUnresolvedOverlay,
    StyledUnresolvedDialog,
    StyledUnresolvedMessage,
    StyledUnresolvedActions,
    StyledReasonTitle,
    StyledReasonTitleHint,
    StyledReasonList,
    StyledReasonOption,
    StyledReasonRadio,
    StyledReasonMemo,
    StyledReasonSummary,
} from './NaverSyncConflictModal.styles';

interface NaverSyncConflictModalProps {
    conflict: ConflictInfo;
    isConfirmed?: boolean;
    reason?: {reason: string; memo?: string} | null;
    onAdvance: (reason?: string, memo?: string) => void;
    onDefer: () => void;
    onDismiss: () => void;
    onSelectReservation: (reservation: Reservation) => void;
}

const CONFLICT_REASON_PRESETS = [
    '스마트플레이스에서 취소/변경 처리',
    '실제 별개 예약 (중복 아님)',
    '중복 입력 — 무시',
    '기타',
];

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
    const assigneeId = seeds[0]?.assigneeId;

    // 같은 날짜, 같은 담당자에서 seeds 중 하나라도 시간이 겹치는 예약을 모두 수집
    const ids = new Set(seeds.map((s) => s.id));
    const result = [...seeds];

    for (const r of dateReservations) {
        if (ids.has(r.id)) continue;
        if (r.status === 'cancelled' || r.status === 'noshow') continue;
        if (assigneeId != null && r.assigneeId !== assigneeId) continue;

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
                                           reason,
                                           onAdvance,
                                           onDefer,
                                           onDismiss,
                                           onSelectReservation,
                                       }: NaverSyncConflictModalProps) => {
    const labels = useStoreLabels();
    const {layerId, layerDataId} = useLayerInstanceId('naver-sync-conflict');
    const noop = useCallback(() => {
    }, []);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(noop);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const serviceColorMap = buildServiceColorMap(serviceCatalog, categoryBaseColorMap);

    const [reasonOpen, setReasonOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [reasonMemo, setReasonMemo] = useState('');

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    const getCustomerName = (r: Reservation) => customerMap[r.customerId]?.name ?? '고객';
    const getAssigneeName = (r: Reservation) => assignees.find((d) => d.id === r.assigneeId)?.name ?? '미지정';
    const getAssigneeDotColor = (r: Reservation) => getAssigneeColor(assignees.find((d) => d.id === r.assigneeId));

    const renderReservation = (reservation: Reservation, isDangerTime: boolean, isDangerAssignee: boolean) => {
        return (
            <StyledConflictReservation>
                {(isDangerTime || isDangerAssignee) && (
                    <StyledConflictBadges>
                        {isDangerTime && (
                            <StyledStatusBadge $variant="danger">
                                시간 중복 {reservation.startTime}~{reservation.endTime}
                            </StyledStatusBadge>
                        )}
                        {isDangerAssignee && (
                            <StyledStatusBadge $variant="danger">
                                {labels.assignee} 중복 {getAssigneeName(reservation)}
                            </StyledStatusBadge>
                        )}
                    </StyledConflictBadges>
                )}
                <ReservationInfoCard
                    reservation={reservation}
                    serviceColorMap={serviceColorMap}
                    assigneeColor={getAssigneeDotColor(reservation)}
                    assigneeName={getAssigneeName(reservation)}
                    customerName={getCustomerName(reservation)}
                    showDate
                    showPrice
                    showStatus
                    timeMode="range"
                />
                {reservation.naverBookingId && <NaverBookingInfo reservation={reservation} />}
            </StyledConflictReservation>
        );
    };

    const currentNew = findCurrentReservation(reservationMap, conflict.newReservation) ?? conflict.newReservation;
    const currentExisting = findCurrentReservation(reservationMap, conflict.existingReservation) ?? conflict.existingReservation;

    // 같은 날짜/담당자에서 시간이 겹치는 모든 예약을 수집
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
    const sameAssignee =
        stillOverlapping
        && activeOverlapping.every((r) => r.assigneeId != null && r.assigneeId === activeOverlapping[0].assigneeId);

    const isCancelledNew = currentNew.status === 'cancelled' || currentNew.status === 'noshow';
    const isCancelledExisting = currentExisting.status === 'cancelled' || currentExisting.status === 'noshow';

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
            if (original.assigneeId !== current.assigneeId) {
                const oldName = assignees.find((d) => d.id === original.assigneeId)?.name ?? '미지정';
                const newName = assignees.find((d) => d.id === current.assigneeId)?.name ?? '미지정';
                lines.push(`${oldName} → ${newName} ${labels.assignee}가 변경되었습니다.`);
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

    // 레이어가 뜬 이유 한 줄 요약 (원래 충돌 pair 기준)
    const overlapStart = conflict.newReservation.startTime > conflict.existingReservation.startTime
        ? conflict.newReservation.startTime
        : conflict.existingReservation.startTime;
    const overlapEnd = conflict.newReservation.endTime < conflict.existingReservation.endTime
        ? conflict.newReservation.endTime
        : conflict.existingReservation.endTime;
    const conflictSummary = `${getAssigneeName(conflict.newReservation)} ${labels.assignee}, ${conflict.newReservation.date} ${overlapStart}~${overlapEnd}에 ${getCustomerName(conflict.newReservation)}·${getCustomerName(conflict.existingReservation)}님 예약이 겹쳤습니다`;

    const handleAdvanceClick = () => {
        setReasonOpen(true);
    };

    const handleReasonConfirm = () => {
        setReasonOpen(false);
        onAdvance(selectedReason || undefined, reasonMemo || undefined);
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
                        <StyledConflictTitle>{isConfirmed ? '예약 시간 중복 처리 완료' : '예약 시간 중복 안내'}</StyledConflictTitle>
                        <StyledHeaderTitleGroupText>{isConfirmed ? '처리 완료된 예약 중복 내역입니다.' : '네이버 예약 동기화 중 시간이 겹치는 예약이 발견되었습니다.'}</StyledHeaderTitleGroupText>
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onDismiss} />
                </StyledHeader>
                <StyledScrollArea>
                    <StyledModalContent>
                        <StyledReasonSummary>{conflictSummary}</StyledReasonSummary>
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
                        {reason && (
                            <StyledResolvedNotice>
                                <strong className="notice-title">처리 사유</strong>
                                <ul className="notice-list">
                                    <li className="notice-item">{reason.reason}</li>
                                    {reason.memo && <li className="notice-item">메모: {reason.memo}</li>}
                                </ul>
                            </StyledResolvedNotice>
                        )}
                        <StyledGuideNotice>
                            네이버예약의 실제 변경/취소는 스마트플레이스 통해서 가능합니다.
                        </StyledGuideNotice>
                        <StyledConflictCard>
                            <StyledCancelledWrapper $cancelled={isCancelledNew}>
                                <StyledClickableInfo onClick={() => onSelectReservation(currentNew)}>
                                    {renderReservation(currentNew, stillOverlapping, sameAssignee)}
                                </StyledClickableInfo>
                            </StyledCancelledWrapper>

                            <StyledCancelledWrapper $cancelled={isCancelledExisting}>
                                <StyledClickableInfo onClick={() => onSelectReservation(currentExisting)}>
                                    {renderReservation(currentExisting, stillOverlapping, sameAssignee)}
                                </StyledClickableInfo>
                            </StyledCancelledWrapper>

                            {extraOverlapping.map((extra) => {
                                const isCancelledExtra = extra.status === 'cancelled' || extra.status === 'noshow';
                                return (
                                    <StyledCancelledWrapper key={extra.id} $cancelled={isCancelledExtra}>
                                        <StyledClickableInfo onClick={() => onSelectReservation(extra)}>
                                            {renderReservation(extra, stillOverlapping, sameAssignee)}
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
                {reasonOpen && (
                    <StyledUnresolvedOverlay>
                        <StyledUnresolvedDialog>
                            {isUnresolved && (
                                <StyledUnresolvedMessage>예약 중복이 수정되지 않았습니다.</StyledUnresolvedMessage>
                            )}
                            <StyledReasonTitle>처리 사유 <StyledReasonTitleHint>(선택)</StyledReasonTitleHint></StyledReasonTitle>
                            <StyledReasonList>
                                {CONFLICT_REASON_PRESETS.map((preset) => (
                                    <StyledReasonOption key={preset}>
                                        <StyledReasonRadio type="radio"
                                               name="conflict-reason"
                                               checked={selectedReason === preset}
                                               onChange={() => setSelectedReason(preset)} />
                                        <span>{preset}</span>
                                    </StyledReasonOption>
                                ))}
                            </StyledReasonList>
                            <StyledReasonMemo placeholder="메모 (선택)"
                                              value={reasonMemo}
                                              onChange={(e) => setReasonMemo(e.target.value)} />
                            <StyledUnresolvedActions>
                                <StyledActionButton type="button"
                                                    onClick={() => setReasonOpen(false)}>취소</StyledActionButton>
                                <StyledActionButton type="button"
                                                    $primary
                                                    onClick={handleReasonConfirm}>확인</StyledActionButton>
                            </StyledUnresolvedActions>
                        </StyledUnresolvedDialog>
                    </StyledUnresolvedOverlay>
                )}
            </StyledConfirmModal>
        </StyledConfirmOverlay>,
        modalRoot
    );
};
