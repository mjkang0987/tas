import React, {useCallback, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {buildDesignerColorMap, buildDesignerNameMap} from '../../features/designers/model';
import {buildServiceColorMap} from '../../features/services/model';
import type {MergeSuggestion} from '../../hooks/useCustomerMergeSuggestion';
import {countReservations} from '../../hooks/useCustomerMergeSuggestion';
import {useCalendarStore} from '../../store/calendarStore';
import type {Customer} from '../../utils/customers';
import {formatTel} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';

import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledOverlay,
    useDialogAccessibility,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';
import {LabelBadge} from '../ui/LabelBadge';
import {ReservationInfoCard} from '../ui/ReservationInfoCard';

interface Props {
    suggestion: MergeSuggestion;
    reservationMap: Record<string, Reservation[]>;
    merging: boolean;
    onMerge: (targetId: number, sourceIds?: number[]) => void;
    onSkip: () => void;
    onDismiss: () => void;
    onReservationClick?: (reservation: Reservation) => void;
}

function getLastReservation(customerId: number, reservationMap: Record<string, Reservation[]>): Reservation | null {
    let last: Reservation | null = null;
    for (const reservations of Object.values(reservationMap)) {
        for (const r of reservations) {
            if (r.customerId !== customerId) continue;
            if (!last || r.date > last.date || (r.date === last.date && r.startTime > last.startTime)) {
                last = r;
            }
        }
    }
    return last;
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return dateStr.replace(/-/g, '.');
}

export const CustomerMergeSuggestionModal = ({
    suggestion,
    reservationMap,
    merging,
    onMerge,
    onSkip,
    onDismiss,
    onReservationClick,
}: Props) => {
    const noop = useCallback(() => {}, []);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(noop);

    const allIds = useMemo(() => suggestion.customers.map((c) => c.id), [suggestion]);
    const isMulti = allIds.length > 2;

    const [selectedTargetId, setSelectedTargetId] = useState(suggestion.targetId);
    const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set(allIds));

    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);

    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap],
    );

    const designerColorMap = useMemo(() => buildDesignerColorMap(designers), [designers]);
    const designerNameMap = useMemo(() => buildDesignerNameMap(designers, true), [designers]);

    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    if (!modalRoot) return null;

    const toggleCheck = (id: number) => {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                // 기준 고객이 해제되면 남은 첫 번째 고객으로 기준 이동
                if (id === selectedTargetId) {
                    const remaining = allIds.filter((cid) => next.has(cid));
                    if (remaining.length > 0) setSelectedTargetId(remaining[0]);
                }
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectTarget = (id: number) => {
        setSelectedTargetId(id);
        // 기준 선택 시 자동 체크
        setCheckedIds((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    const checkedCount = checkedIds.size;
    const canMerge = checkedCount >= 2 && checkedIds.has(selectedTargetId);

    const handleMerge = () => {
        if (!canMerge) return;
        if (isMulti) {
            const sourceIds = [...checkedIds].filter((id) => id !== selectedTargetId);
            onMerge(selectedTargetId, sourceIds);
        } else {
            onMerge(selectedTargetId);
        }
    };

    const handleReservationClick = (reservation: Reservation) => {
        if (onReservationClick) {
            onReservationClick(reservation);
        } else {
            openReservationDetail(reservation);
        }
    };

    return createPortal(
        <StyledMergeOverlay role="dialog" aria-modal="true" aria-label="고객 병합 제안">
            <StyledMergeModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <h3>같은 고객인가요?</h3>
                        <p>
                            이름 패턴이 유사한 고객이 {allIds.length}명 발견되었습니다.
                            {isMulti && ' 병합할 고객을 선택하세요.'}
                        </p>
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onDismiss} />
                </StyledHeader>
                <StyledScrollArea>
                    <StyledCustomerList>
                        {suggestion.customers.map((customer) => {
                            const isTarget = customer.id === selectedTargetId;
                            const isChecked = checkedIds.has(customer.id);
                            const resCount = countReservations(customer.id, reservationMap);
                            const lastRes = getLastReservation(customer.id, reservationMap);
                            const hasTags = customer.memoTags && customer.memoTags.length > 0;
                            const hasNotes = customer.allergyNote || customer.claimNote || customer.preferenceNote;
                            const designerName = lastRes?.designerId
                                ? (designerNameMap[lastRes.designerId] ?? '미지정')
                                : '미지정';
                            const designerColor = lastRes?.designerId
                                ? (designerColorMap[lastRes.designerId] ?? '#8E8E93')
                                : '#8E8E93';
                            return (
                                <StyledCustomerItem
                                    key={customer.id}
                                    $isTarget={isTarget && isChecked}
                                    $dimmed={isMulti && !isChecked}
                                    onClick={() => selectTarget(customer.id)}
                                >
                                    <StyledIdentityRow>
                                        {isMulti && (
                                            <StyledCheckbox
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleCheck(customer.id);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                        <StyledRadio
                                            type="radio"
                                            name="mergeTarget"
                                            checked={isTarget}
                                            onChange={() => selectTarget(customer.id)}
                                        />
                                        <StyledCustomerName>{customer.name}</StyledCustomerName>
                                        {isChecked && (isTarget
                                            ? <StyledBadge $tone="info" $shape="soft" $size="sm">기준</StyledBadge>
                                            : <StyledBadge $tone="neutral" $shape="soft" $size="sm">삭제</StyledBadge>
                                        )}
                                        <StyledTel>{customer.tel ? formatTel(customer.tel) : '연락처 없음'}</StyledTel>
                                    </StyledIdentityRow>

                                    <StyledExtraInfo>
                                        <StyledDetailRow>
                                            <StyledDetailItem>
                                                <dt>예약</dt>
                                                <dd>{resCount}건</dd>
                                            </StyledDetailItem>
                                            <StyledDetailItem>
                                                <dt>적립금</dt>
                                                <dd>{(customer.points ?? 0).toLocaleString()}원</dd>
                                            </StyledDetailItem>
                                            {customer.firstVisitDate && (
                                                <StyledDetailItem>
                                                    <dt>첫방문</dt>
                                                    <dd>{formatDate(customer.firstVisitDate)}</dd>
                                                </StyledDetailItem>
                                            )}
                                        </StyledDetailRow>
                                        {hasTags && (
                                            <StyledTagList>
                                                {customer.memoTags!.map((tag, i) => (
                                                    <StyledTag key={i} $color={tag.color}>{tag.text}</StyledTag>
                                                ))}
                                            </StyledTagList>
                                        )}
                                        {hasNotes && (
                                            <StyledNotes>
                                                {customer.allergyNote && <span>알레르기: {customer.allergyNote}</span>}
                                                {customer.preferenceNote && <span>선호: {customer.preferenceNote}</span>}
                                                {customer.claimNote && <span>클레임: {customer.claimNote}</span>}
                                            </StyledNotes>
                                        )}
                                        {lastRes && (
                                            <StyledCardSection onClick={(e) => e.stopPropagation()}>
                                                <ReservationInfoCard
                                                    reservation={lastRes}
                                                    serviceColorMap={serviceColorMap}
                                                    designerColor={designerColor}
                                                    designerName={designerName}
                                                    showDate
                                                    showPrice
                                                    showStatus
                                                    timeMode="start"
                                                    compactDate
                                                    onClick={handleReservationClick}
                                                />
                                            </StyledCardSection>
                                        )}
                                    </StyledExtraInfo>
                                </StyledCustomerItem>
                            );
                        })}
                    </StyledCustomerList>
                    <StyledGuide>
                        기준 고객의 이름·연락처가 유지되고, 나머지 고객의 예약·적립금이 병합됩니다.
                    </StyledGuide>
                </StyledScrollArea>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onSkip} disabled={merging}>
                        건너뛰기
                    </StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={handleMerge} disabled={merging || !canMerge}>
                        {merging ? '병합 중...' : isMulti ? `병합 (${checkedCount}명)` : '병합'}
                    </StyledActionButton>
                </StyledFooter>
            </StyledMergeModal>
        </StyledMergeOverlay>,
        modalRoot,
    );
};

const StyledMergeOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.supporting};
`;

const StyledMergeModal = styled(StyledDetail)`
    width: min(400px, 90vw);
    max-width: min(400px, 90vw);
`;

const StyledScrollArea = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-height: 60vh;
    padding: 12px;
`;

const StyledCustomerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledCustomerItem = styled.div<{$isTarget: boolean; $dimmed?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 10px 12px;
    border: 1px solid ${(p) => p.$isTarget ? 'rgba(45, 127, 249, 0.35)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-md);
    background: ${(p) => p.$isTarget ? 'rgba(45, 127, 249, 0.04)' : 'var(--gray-color2)'};
    opacity: ${(p) => p.$dimmed ? 0.45 : 1};
    cursor: pointer;
    transition: border-color 0.14s, background 0.14s, opacity 0.14s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: rgba(45, 127, 249, 0.25);
        }
    }
`;

const StyledIdentityRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledCheckbox = styled.input`
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    accent-color: var(--blue-color);
`;

const StyledRadio = styled.input`
    flex-shrink: 0;
    width: 16px;
    accent-color: var(--blue-color);
`;

const StyledCustomerName = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const StyledBadge = styled(LabelBadge)`
    font-size: 10px;
    flex-shrink: 0;
`;

const StyledTel = styled.span`
    margin-left: auto;
    flex-shrink: 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledExtraInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
`;

const StyledDetailRow = styled.dl`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
`;

const StyledDetailItem = styled.div`
    display: flex;
    gap: 4px;
    font-size: 11px;

    dt {
        color: var(--dark-gray-color2);
    }

    dd {
        margin: 0;
        color: #0f172a;
        font-weight: 600;
    }
`;

const StyledTagList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`;

const StyledTag = styled.span<{$color: string}>`
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    background: ${(p) => p.$color}1a;
    color: ${(p) => p.$color};
`;

const StyledNotes = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    color: var(--dark-gray-color);
    line-height: 1.4;

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const StyledCardSection = styled.div`
    cursor: default;
`;

const StyledGuide = styled.p`
    margin: 12px 0 0;
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(45, 127, 249, 0.06);
    color: #1e40af;
    font-size: 12px;
    line-height: 1.45;
    word-break: keep-all;
`;
