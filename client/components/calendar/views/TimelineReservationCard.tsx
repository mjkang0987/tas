import React from 'react';

import styled from 'styled-components';

import {ButtonReserve} from '../../ui/Buttons';
import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {ServiceChipList} from '../../ui/ServiceChip';
import type {Customer} from '../../../utils/customers';
import type {Reservation} from '../../../utils/reservations';
import {hasCompletedPayment} from '../../../utils/reservations';
import type {DragPreview} from './timelineDrag';
import type {TimelineLane} from './timelineEntries';
import {cardDetailForHeight} from '../../../features/reservations/timeline-scale';

// 상태 접미사 — 어느 표시 단계에서도 같은 문구를 쓴다.
function statusSuffix(reservation: Reservation): string {
    if (reservation.status === 'requested') return ' (확정대기)';
    if (reservation.status === 'cancelled') return ' (취소)';
    if (reservation.status === 'noshow') return ' (노쇼)';
    return hasCompletedPayment(reservation) ? ' (결제완료)' : '';
}

type TimelineReservationCardProps = {
    reservation: Reservation;
    preview: DragPreview | null;
    blockTop: number;
    blockHeight: number;
    customerName?: string;
    isNewCustomer?: boolean;
    customer?: Customer;
    color: string;
    serviceColorMap: Record<string, string>;
    hideOriginalBlock: boolean;
    suppressClick: boolean;
    /** 겹친 예약을 나눠 놓을 때의 칸. 없으면 지금까지처럼 가로 전체를 쓴다. */
    lane?: TimelineLane;
    /**
     * 고객명(+신규 배지)만 그린다. 칸이 좁아 시술명·상태까지 넣으면 글자가 쪼개지는
     * 모바일 주 뷰용. 담당자는 카드 왼쪽 색 막대가 이미 말해주고, 시술명은 일 뷰나
     * 상세에서 본다.
     */
    nameOnly?: boolean;
    onClick: (event: React.MouseEvent) => void;
    onMouseDragStart?: (event: React.MouseEvent<HTMLElement>) => void;
    onTouchDragStart?: (event: React.TouchEvent<HTMLElement>) => void;
};

// StyledReserveButton 이 좌우로 잡아둔 여백(left 3px + right 5px)과 칸 사이 간격.
// 인라인 style 로 덮어쓰므로 클래스 규칙(left/right/width)보다 우선한다.
const LANE_INSET = 8;
const LANE_GAP = 3;

/** 칸 번호를 가로 위치·폭으로 바꾼다. 폭은 퍼센트라 타임라인 폭이 변해도 따라간다. */
function laneStyle(lane?: TimelineLane): React.CSSProperties | undefined {
    if (!lane || lane.count <= 1) return undefined;
    const width = `calc((100% - ${LANE_INSET + LANE_GAP * (lane.count - 1)}px) / ${lane.count})`;
    return {
        left: `calc(3px + (${width} + ${LANE_GAP}px) * ${lane.index})`,
        right: 'auto',
        width,
    };
}

export function TimelineReservationCard({
    reservation,
    preview,
    blockTop,
    blockHeight,
    customerName,
    isNewCustomer,
    customer,
    color,
    serviceColorMap,
    hideOriginalBlock,
    suppressClick,
    lane,
    nameOnly = false,
    onClick,
    onMouseDragStart,
    onTouchDragStart,
}: TimelineReservationCardProps) {
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'noshow' || reservation.status === 'completed';
    // 짧은 예약은 두 줄이 안 들어간다. 높이에 맞춰 서비스 → 한 줄 → 이름만으로 줄인다.
    // (매장 단위가 아니라 이 카드의 높이로 정한다 — 예약별로 소요시간을 줄인 건도 있다.)
    // 높이가 정하는 표시 단계. nameOnly 면 높이와 무관하게 가장 짧은 단계로 내린다 —
    // 좁은 칸에서는 카드가 높아도 넣을 가로 폭이 없다.
    const detail = nameOnly ? 'name' : cardDetailForHeight(blockHeight);
    // 드래그 중엔 칸을 풀어 원래 폭으로 돌린다 — 끌고 가는 곳의 겹침은 아직 계산되지 않았다.
    const style = {
        ...(preview ? undefined : laneStyle(lane)),
        ...(hideOriginalBlock ? {visibility: 'hidden' as const} : undefined),
    };

    return (
        <ButtonReserve
            $detail={detail}
            data-timeline-interactive="true"
            // 드래그 중엔 hover 확장을 끈다 — 끌고 있는 카드가 커서 아래에서 커졌다 작아지면 조준이 흔들린다.
            data-dragging={preview ? 'true' : undefined}
            style={Object.keys(style).length > 0 ? style : undefined}
            $position="absolute"
            $top={preview?.top ?? blockTop}
            $height={blockHeight}
            $color={color}
            $cancelled={isCancelled}
            $requested={reservation.status === 'requested'}
            onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                if (suppressClick) return;
                onClick(event);
            }}
        >
            {!isCancelled && onMouseDragStart && onTouchDragStart && (
                <span
                    data-timeline-interactive="true"
                    className="drag-handle"
                    onMouseDown={onMouseDragStart}
                    onTouchStart={onTouchDragStart}
                >
                    <span className="a11y">예약 이동</span>
                </span>
            )}
            {detail === 'full' ? (<>
                <strong className="highlight">
                    <StyledTimelineServiceList service={reservation.service}
                                              serviceColorMap={serviceColorMap}
                                              keyPrefix={reservation.id} />
                    {statusSuffix(reservation)}
                </strong>
                {preview && <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>}
                {customerName && (
                    <span className="detail">
                        {isNewCustomer && <NewCustomerBadge>N</NewCustomerBadge>}
                        <span>{customerName}</span>
                    </span>
                )}
            </>) : (
                // 한 줄에 담는다. 넘치면 말줄임 — 무엇인지는 왼쪽 색 막대가 이미 말해준다.
                <span className="oneline">
                    {/* nameOnly 에선 신규 배지도 뺀다 — 한 칸이 약 47px 이라
                        배지(15px)+간격이 들어가면 정작 이름이 잘린다. */}
                    {isNewCustomer && !nameOnly && <NewCustomerBadge>N</NewCustomerBadge>}
                    <span className="oneline-text">
                        {customerName || '고객'}
                        {detail === 'compact' && reservation.service ? ` · ${reservation.service}` : ''}
                        {nameOnly ? '' : statusSuffix(reservation)}
                    </span>
                </span>
            )}
        </ButtonReserve>
    );
}

type TimelineDragGhostProps = {
    reservation: Reservation;
    preview: DragPreview;
    customerName?: string;
    isNewCustomer?: boolean;
    customer?: Customer;
    color: string;
    serviceColorMap: Record<string, string>;
};

export function TimelineDragGhost({
    reservation,
    preview,
    customerName,
    isNewCustomer,
    customer,
    color,
    serviceColorMap,
}: TimelineDragGhostProps) {
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'noshow' || reservation.status === 'completed';


    return (
        <StyledDragGhost
            aria-hidden="true"
            $left={preview.ghostLeft}
            $top={preview.ghostTop}
            $width={preview.ghostWidth}
            $height={preview.ghostHeight}
            $color={color}
            $cancelled={isCancelled}
        >
            <strong>
                <StyledTimelineServiceList service={reservation.service}
                                          serviceColorMap={serviceColorMap}
                                          keyPrefix={`ghost-${reservation.id}`} />
                {reservation.status === 'requested' ? ' (확정대기)' : reservation.status === 'cancelled' ? ' (취소)' : reservation.status === 'noshow' ? ' (노쇼)' : hasCompletedPayment(reservation) ? ' (결제완료)' : ''}
            </strong>
            <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>
            {customerName && (
                <span className="detail">
                    {isNewCustomer && <NewCustomerBadge>N</NewCustomerBadge>}
                    <span>{customerName}</span>
                </span>
            )}
        </StyledDragGhost>
    );
}

const StyledDragGhost = styled.div<{
    $left: number;
    $top: number;
    $width: number;
    $height: number;
    $color: string;
    $cancelled: boolean
}>`
    position: fixed;
    left: ${(props) => props.$left}px;
    top: ${(props) => props.$top}px;
    width: ${(props) => props.$width}px;
    height: auto;
    max-height: none;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-sizing: border-box;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background-color: ${(props) => props.$cancelled ? 'var(--cancelled-color)' : `${props.$color}12`};
    border: 1px solid ${(props) => props.$cancelled ? 'var(--cancelled-color)' : props.$color};
    border-left-width: 4px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.28);
    color: ${(props) => props.$cancelled ? 'var(--white-color)' : 'var(--dark-gray-color)'};
    opacity: 0.72;
    filter: ${(props) => props.$cancelled ? 'grayscale(.5)' : 'none'};
    pointer-events: none;
    @media (max-width: 640px) {
        padding: 2px;
    }

    strong {
        font-size: var(--small-font);
        font-weight: 600;
    }

    .sub {
        font-size: var(--tiny-font);
        @media (max-width: 640px) {
            display: none;
        }
    }

    .detail {
        margin-top: 2px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--tiny-font);
        opacity: 0.9;
        @media (max-width: 640px) {
            display: none;
        }
    }
`;

const StyledTimelineServiceList = styled(ServiceChipList)`
    @media (max-width: 640px) {
        gap: 4px;
    }
`;
