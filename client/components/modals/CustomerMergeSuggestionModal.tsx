import React, {useCallback, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {buildAssigneeColorMap, buildAssigneeNameMap} from '../../features/assignees/model';
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
    StyledHeaderTitleGroupText,
    StyledOverlay,
    useDialogAccessibility,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';
import {ReservationInfoCard} from '../ui/ReservationInfoCard';
import {NaverBookingInfo} from '../ui/NaverBookingInfo';

interface Props {
    suggestion: MergeSuggestion;
    reservationMap: Record<string, Reservation[]>;
    merging: boolean;
    onMerge: (targetId: number) => void;
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

    const {masked, candidates} = suggestion;
    // 후보가 1명뿐이면 고를 것이 없다. 선택 컨트롤 자체를 띄우지 않는다.
    const hasChoice = candidates.length > 1;

    const [selectedTargetId, setSelectedTargetId] = useState(suggestion.targetId);

    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);

    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap],
    );

    const assigneeColorMap = useMemo(() => buildAssigneeColorMap(assignees), [assignees]);
    const assigneeNameMap = useMemo(() => buildAssigneeNameMap(assignees, true), [assignees]);

    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    if (!modalRoot) return null;

    const canMerge = candidates.some((c) => c.id === selectedTargetId);

    const handleMerge = () => {
        if (!canMerge) return;
        onMerge(selectedTargetId);
    };

    const handleReservationClick = (reservation: Reservation) => {
        if (onReservationClick) {
            onReservationClick(reservation);
        } else {
            openReservationDetail(reservation);
        }
    };

    const renderCustomerDetail = (customer: Customer) => {
        const resCount = countReservations(customer.id, reservationMap);
        const lastRes = getLastReservation(customer.id, reservationMap);
        const hasTags = customer.memoTags && customer.memoTags.length > 0;
        const assigneeName = lastRes?.assigneeId
            ? (assigneeNameMap[lastRes.assigneeId] ?? '미지정')
            : '미지정';
        const assigneeColor = lastRes?.assigneeId
            ? (assigneeColorMap[lastRes.assigneeId] ?? '#8E8E93')
            : '#8E8E93';

        return (
            <StyledExtraInfo>
                <StyledDetailRow>
                    <StyledDetailItem>
                        <StyledDetailLabel>예약</StyledDetailLabel>
                        <StyledDetailValue>{resCount}건</StyledDetailValue>
                    </StyledDetailItem>
                    <StyledDetailItem>
                        <StyledDetailLabel>적립금</StyledDetailLabel>
                        <StyledDetailValue>{(customer.points ?? 0).toLocaleString()}원</StyledDetailValue>
                    </StyledDetailItem>
                    {customer.firstVisitDate && (
                        <StyledDetailItem>
                            <StyledDetailLabel>첫방문</StyledDetailLabel>
                            <StyledDetailValue>{formatDate(customer.firstVisitDate)}</StyledDetailValue>
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
                {lastRes && (
                    <div>
                        <ReservationInfoCard
                            reservation={lastRes}
                            serviceColorMap={serviceColorMap}
                            assigneeColor={assigneeColor}
                            assigneeName={assigneeName}
                            showDate
                            showPrice
                            showStatus
                            timeMode="start"
                            compactDate
                            onClick={handleReservationClick}
                        />
                        {lastRes.naverBookingId && (
                            <StyledNaverInfo reservation={lastRes} />
                        )}
                    </div>
                )}
            </StyledExtraInfo>
        );
    };

    return createPortal(
        <StyledMergeOverlay role="dialog" aria-modal="true" aria-label="고객 병합 제안">
            <StyledMergeModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <StyledMergeTitle>{hasChoice ? '어느 고객인가요?' : '같은 고객인가요?'}</StyledMergeTitle>
                        <StyledHeaderTitleGroupText>
                            {hasChoice
                                ? `${masked.name} 님을 합칠 고객을 선택하세요.`
                                : `${masked.name} 님과 ${candidates[0].name} 님이 같은 분이면 합칩니다.`}
                        </StyledHeaderTitleGroupText>
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onDismiss} />
                </StyledHeader>
                <StyledScrollArea>
                    <StyledSectionTitle>사라질 고객</StyledSectionTitle>
                    <StyledCustomerItem>
                        <StyledIdentityRow>
                            <StyledCustomerName>{masked.name}</StyledCustomerName>
                            <StyledTel>{masked.tel ? formatTel(masked.tel) : '연락처 없음'}</StyledTel>
                        </StyledIdentityRow>
                        {renderCustomerDetail(masked)}
                    </StyledCustomerItem>

                    <StyledMergeArrow aria-hidden="true">↓</StyledMergeArrow>

                    <StyledSectionTitle id="merge-target-label">
                        {hasChoice ? '남을 고객 선택' : '남을 고객'}
                    </StyledSectionTitle>
                    <StyledCustomerList role={hasChoice ? 'radiogroup' : undefined}
                                        aria-labelledby={hasChoice ? 'merge-target-label' : undefined}>
                        {candidates.map((customer) => {
                            const isTarget = customer.id === selectedTargetId;
                            return (
                                <StyledCustomerItem key={customer.id} $isTarget={hasChoice && isTarget}>
                                    <StyledIdentityRow>
                                        {hasChoice ? (
                                            <StyledChoiceLabel>
                                                <StyledRadio
                                                    type="radio"
                                                    name="mergeTarget"
                                                    checked={isTarget}
                                                    onChange={() => setSelectedTargetId(customer.id)}
                                                />
                                                <StyledCustomerName>{customer.name}</StyledCustomerName>
                                            </StyledChoiceLabel>
                                        ) : (
                                            <StyledCustomerName>{customer.name}</StyledCustomerName>
                                        )}
                                        <StyledTel>{customer.tel ? formatTel(customer.tel) : '연락처 없음'}</StyledTel>
                                    </StyledIdentityRow>
                                    {renderCustomerDetail(customer)}
                                </StyledCustomerItem>
                            );
                        })}
                    </StyledCustomerList>
                    <StyledGuide>
                        {hasChoice
                            ? '이름이 같은 고객이 여러 명입니다. 연락처·예약 내역을 보고 고르세요. 고르지 않은 고객은 그대로 남습니다.'
                            : '남을 고객의 이름·연락처가 유지되고, 사라질 고객의 예약·적립금이 옮겨집니다.'}
                    </StyledGuide>
                </StyledScrollArea>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onSkip} disabled={merging}>
                        건너뛰기
                    </StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={handleMerge} disabled={merging || !canMerge}>
                        {merging ? '병합 중...' : '병합'}
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

const StyledMergeTitle = styled.strong`
    font-size: var(--big-font);
`;

const StyledScrollArea = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-height: 60vh;
    padding: 12px;
`;

const StyledSectionTitle = styled.p`
    margin: 0 0 6px;
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color2);
`;

const StyledMergeArrow = styled.div`
    margin: 8px 0;
    text-align: center;
    font-size: var(--font);
    color: var(--dark-gray-color2);
`;

const StyledCustomerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledCustomerItem = styled.div<{$isTarget?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 10px 12px;
    border: 1px solid ${(p) => p.$isTarget ? 'rgba(45, 127, 249, 0.35)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-md);
    background: ${(p) => p.$isTarget ? 'rgba(45, 127, 249, 0.04)' : 'var(--gray-color2)'};
    transition: border-color 0.14s, background 0.14s;
`;

const StyledIdentityRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

/* 선택 영역은 라디오와 그 이름까지로 한정한다. 카드 전체를 누르면 기준이
   바뀌던 동작이 오조작을 불렀다. */
const StyledChoiceLabel = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 8px 6px;
    margin: -8px 0 -8px -6px;
    border-radius: var(--radius-md);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: rgba(45, 127, 249, 0.08);
        }
    }
`;

const StyledRadio = styled.input`
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    accent-color: var(--blue-color);
`;

const StyledCustomerName = styled.span`
    font-size: var(--font);
    font-weight: 700;
    color: #0f172a;
`;

const StyledTel = styled.span`
    margin-left: auto;
    flex-shrink: 0;
    font-size: var(--small-font);
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
    font-size: var(--xsmall-font);
`;

const StyledDetailLabel = styled.dt`
    color: var(--dark-gray-color2);
`;

const StyledDetailValue = styled.dd`
    margin: 0;
    color: #0f172a;
    font-weight: 600;
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
    font-size: var(--tiny-font);
    font-weight: 600;
    background: ${(p) => p.$color}1a;
    color: ${(p) => p.$color};
`;

const StyledNaverInfo = styled(NaverBookingInfo)`
    margin-top: 6px;
`;

const StyledGuide = styled.p`
    margin: 12px 0 0;
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(45, 127, 249, 0.06);
    color: #1e40af;
    font-size: var(--small-font);
    line-height: 1.45;
    word-break: keep-all;
`;
