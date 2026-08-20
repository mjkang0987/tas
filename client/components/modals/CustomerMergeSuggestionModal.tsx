import React, {useCallback, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {buildAssigneeColorMap, buildAssigneeNameMap} from '../../features/assignees/model';
import {buildServiceColorMap} from '../../features/services/model';
import {mergeSources, summarizeCustomerReservations} from '../../features/customers/merge-suggestion';
import type {MergeSelection} from '../../features/customers/merge-suggestion';
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
import {LabelBadge} from '../ui/LabelBadge';
import {ReservationInfoCard} from '../ui/ReservationInfoCard';
import {NaverBookingInfo} from '../ui/NaverBookingInfo';

interface Props {
    selection: MergeSelection;
    reservationMap: Record<string, Reservation[]>;
    merging: boolean;
    onMerge: (targetId: number) => void;
    /** 자동 제안은 '건너뛰기'(다시 안 뜸), 수동 병합은 '취소'(그냥 닫기) */
    onSkip: () => void;
    onDismiss: () => void;
    onReservationClick?: (reservation: Reservation) => void;
}

/** 경로별 문구. 상단/하단 카드가 뜻하는 바가 달라 그대로 쓸 수 없다 */
const COPY = {
    suggestion: {
        skipLabel: '건너뛰기',
        guideMulti: '이름이 같은 고객이 여러 명입니다. 연락처·예약 내역을 보고 고르세요. 고르지 않은 고객은 그대로 남습니다.',
        guideSingle: '병합 기준 고객의 이름·연락처가 유지되고, 위 고객의 예약·적립금이 옮겨집니다.',
    },
    manual: {
        skipLabel: '취소',
        guideMulti: '기준 고객의 이름·연락처가 유지되고, 삭제 표시된 고객의 예약·적립금이 모두 옮겨집니다.',
        guideSingle: '기준 고객의 이름·연락처가 유지되고, 나머지 고객의 예약·적립금이 옮겨집니다.',
    },
} as const;

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    return dateStr.replace(/-/g, '.');
}

export const CustomerMergeSuggestionModal = ({
    selection,
    reservationMap,
    merging,
    onMerge,
    onSkip,
    onDismiss,
    onReservationClick,
}: Props) => {
    const noop = useCallback(() => {}, []);
    const dialogRef = useDialogAccessibility<HTMLDivElement>(noop);

    const {mode, targetChoices} = selection;
    // 후보가 1명뿐이면 고를 것이 없다. 선택 컨트롤 자체를 띄우지 않는다.
    const hasChoice = targetChoices.length > 1;
    const copy = COPY[mode];

    const [selectedTargetId, setSelectedTargetId] = useState(selection.targetId);
    // 흡수되어 사라질 고객. 수동 병합은 기준을 바꾸면 여기도 바뀐다.
    const sources = mergeSources(selection, selectedTargetId);

    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);

    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap],
    );

    const assigneeColorMap = useMemo(() => buildAssigneeColorMap(assignees), [assignees]);
    // 카드마다 전체 예약을 두 번(건수·최근 예약) 훑던 것을 한 번으로 줄인다.
    const reservationSummary = useMemo(
        () => summarizeCustomerReservations(
            [...(selection.maskedSource ? [selection.maskedSource.id] : []), ...targetChoices.map((c) => c.id)],
            reservationMap,
        ),
        [selection.maskedSource, targetChoices, reservationMap],
    );
    const assigneeNameMap = useMemo(() => buildAssigneeNameMap(assignees, true), [assignees]);

    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    if (!modalRoot) return null;

    // 자동 제안은 "이 마스킹 고객이 누구냐"를 묻는다. 수동 병합은 고객을 이미 사람이
    // 골라 왔으므로, 남길 기준이 누구인지만 물으면 된다.
    const sourceNames = sources.map((c) => c.name).join(', ');
    const title = mode === 'manual'
        ? '고객 병합'
        : (hasChoice ? '어느 고객인가요?' : '같은 고객인가요?');
    const description = mode === 'manual'
        ? `선택한 ${targetChoices.length}명 중 남길 기준 고객을 고르세요.`
        : (hasChoice
            ? `${sourceNames} 님을 합칠 고객을 선택하세요.`
            : `${sourceNames} 님과 ${targetChoices[0].name} 님이 같은 분이면 합칩니다.`);

    const canMerge = targetChoices.some((c) => c.id === selectedTargetId) && sources.length > 0;

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
        const {count: resCount, last: lastRes} = reservationSummary[customer.id] ?? {count: 0, last: null};
        const hasTags = customer.memoTags && customer.memoTags.length > 0;
        const assigneeName = lastRes?.assigneeId
            ? (assigneeNameMap[lastRes.assigneeId] ?? '미지정')
            : '미지정';
        const assigneeColor = lastRes?.assigneeId
            ? (assigneeColorMap[lastRes.assigneeId] ?? '#8E8E93')
            : '#8E8E93';

        return (
            <StyledExtraInfo>
                <StyledMetaLine>
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
                </StyledMetaLine>
                {lastRes && (
                    <>
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
                    </>
                )}
            </StyledExtraInfo>
        );
    };

    return createPortal(
        <StyledMergeOverlay role="dialog" aria-modal="true"
                            aria-label={mode === 'manual' ? '고객 병합' : '고객 병합 제안'}>
            <StyledMergeModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <StyledMergeTitle>{title}</StyledMergeTitle>
                        <StyledHeaderTitleGroupText>{description}</StyledHeaderTitleGroupText>
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onDismiss} />
                </StyledHeader>
                <StyledScrollArea>
                    {/* 자동 제안은 흡수될 마스킹 고객이 고정이라 위에 따로 세우고 화살표로 방향을 말한다.
                        수동 병합은 선택한 고객 전원이 기준 후보라, 같은 고객을 위아래에 두 번 그리게 된다.
                        그래서 목록 하나만 두고 행마다 기준/삭제 배지로 방향을 표시한다. */}
                    {mode === 'suggestion' && (
                        <>
                            {sources.map((source) => (
                                <StyledCustomerItem key={source.id}>
                                    <StyledIdentityRow>
                                        <StyledCustomerName>{source.name}</StyledCustomerName>
                                        <StyledTel>{source.tel ? formatTel(source.tel) : '연락처 없음'}</StyledTel>
                                    </StyledIdentityRow>
                                    {renderCustomerDetail(source)}
                                </StyledCustomerItem>
                            ))}

                            <StyledMergeArrow aria-hidden="true">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 3.5v13M4.5 11l5.5 5.5L15.5 11"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round" />
                                </svg>
                            </StyledMergeArrow>
                        </>
                    )}

                    <StyledSectionTitle id="merge-target-label">
                        {hasChoice ? '병합 기준 고객 선택' : '병합 기준 고객'}
                    </StyledSectionTitle>
                    <StyledCustomerList role={hasChoice ? 'radiogroup' : undefined}
                                        aria-labelledby={hasChoice ? 'merge-target-label' : undefined}>
                        {targetChoices.map((customer) => {
                            const isTarget = customer.id === selectedTargetId;
                            return (
                                <StyledCustomerItem key={customer.id} $isTarget={isTarget}>
                                    <StyledIdentityRow>
                                        <StyledChoiceLabel as={hasChoice ? 'label' : 'div'} $interactive={hasChoice}>
                                            {hasChoice && (
                                                <StyledRadio
                                                    type="radio"
                                                    name="mergeTarget"
                                                    checked={isTarget}
                                                    onChange={() => setSelectedTargetId(customer.id)}
                                                />
                                            )}
                                            <StyledCustomerName>{customer.name}</StyledCustomerName>
                                            {mode === 'manual' && (
                                                <LabelBadge $tone={isTarget ? 'info' : 'danger'}>
                                                    {isTarget ? '기준' : '삭제'}
                                                </LabelBadge>
                                            )}
                                        </StyledChoiceLabel>
                                        <StyledTel>{customer.tel ? formatTel(customer.tel) : '연락처 없음'}</StyledTel>
                                    </StyledIdentityRow>
                                    {renderCustomerDetail(customer)}
                                </StyledCustomerItem>
                            );
                        })}
                    </StyledCustomerList>
                    <StyledGuide>{hasChoice ? copy.guideMulti : copy.guideSingle}</StyledGuide>
                </StyledScrollArea>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onSkip} disabled={merging}>
                        {copy.skipLabel}
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

/* 두 카드를 잇는 연결 표시. 글자 ↓ 는 본문 크기에 묶여 너무 작게 읽혔다. */
const StyledMergeArrow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    margin: 10px auto;
    border-radius: 50%;
    background: var(--gray-color2);
    color: var(--dark-gray-color2);
`;

const StyledCustomerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

/* 기준 고객이 한눈에 보여야 한다. 전에는 강조가 `hasChoice && isTarget` 조건이라
   후보가 1명일 때 아예 걸리지 않았고, 사라질 카드와 남을 카드가 똑같은 회색이었다.
   빗금·좌측 바 같은 장식 대신 **배경색만으로** 가른다 — 카드 안에 예약 카드가 또 들어가
   테두리가 겹치는 구조라, 장식을 더하면 그 경계들과 싸운다. */
const StyledCustomerItem = styled.div<{$isTarget?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 10px 12px;
    border: 1px solid ${(p) => p.$isTarget ? 'rgba(45, 127, 249, 0.45)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-md);
    background: ${(p) => p.$isTarget ? 'rgba(45, 127, 249, 0.10)' : 'var(--gray-color2)'};
    transition: border-color 0.14s, background 0.14s;
`;

const StyledIdentityRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

/* 선택 영역은 라디오와 그 이름까지로 한정한다. 카드 전체를 누르면 기준이
   바뀌던 동작이 오조작을 불렀다. */
const StyledChoiceLabel = styled.label<{$interactive: boolean}>`
    display: inline-flex;
    align-items: center;
    gap: 8px;

    ${(p) => p.$interactive && `
        padding: 8px 8px 8px 6px;
        margin: -8px 0 -8px -6px;
        border-radius: var(--radius-md);
        cursor: pointer;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background: rgba(45, 127, 249, 0.08);
            }
        }
    `}
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

/* 예약·적립금·첫방문·태그를 한 줄로 묶는다. 항목마다 줄을 차지하면 카드가 길어져
   모바일에서 두 번째 후보가 화면 밖으로 밀린다. */
const StyledMetaLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 8px;
`;

const StyledDetailRow = styled.dl`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 8px;
    margin: 0;
`;

const StyledDetailItem = styled.div`
    display: flex;
    gap: 4px;
    font-size: var(--xsmall-font);

    & + &::before {
        content: '·';
        margin-right: 4px;
        color: var(--gray-color);
    }
`;

const StyledDetailLabel = styled.dt`
    color: var(--dark-gray-color2);
`;

const StyledDetailValue = styled.dd`
    margin: 0;
    color: #0f172a;
    font-weight: 600;
`;

/* 태그는 색 있는 칩이라 그 자체로 구분된다. 앞에 가운뎃점을 두면 좁은 폭에서
   줄이 바뀔 때 점만 홀로 남는다. */
const StyledTagList = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
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
