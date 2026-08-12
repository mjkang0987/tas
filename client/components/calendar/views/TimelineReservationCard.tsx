import React from 'react';

import styled from 'styled-components';

import {ButtonReserve} from '../../ui/Buttons';
import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {ServiceChipList} from '../../ui/ServiceChip';
import type {Customer} from '../../../utils/customers';
import type {Reservation} from '../../../utils/reservations';
import {hasCompletedPayment} from '../../../utils/reservations';
import type {DragPreview} from './timelineDrag';
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
    onClick: (event: React.MouseEvent) => void;
    onMouseDragStart?: (event: React.MouseEvent<HTMLElement>) => void;
    onTouchDragStart?: (event: React.TouchEvent<HTMLElement>) => void;
};

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
    onClick,
    onMouseDragStart,
    onTouchDragStart,
}: TimelineReservationCardProps) {
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'noshow' || reservation.status === 'completed';
    // 짧은 예약은 두 줄이 안 들어간다. 높이에 맞춰 서비스 → 한 줄 → 이름만으로 줄인다.
    // (매장 단위가 아니라 이 카드의 높이로 정한다 — 예약별로 소요시간을 줄인 건도 있다.)
    const detail = cardDetailForHeight(blockHeight);

    return (
        <ButtonReserve
            $detail={detail}
            data-timeline-interactive="true"
            style={hideOriginalBlock ? {visibility: 'hidden'} : undefined}
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
                    {isNewCustomer && <NewCustomerBadge>N</NewCustomerBadge>}
                    <span className="oneline-text">
                        {customerName || '고객'}
                        {detail === 'compact' && reservation.service ? ` · ${reservation.service}` : ''}
                        {statusSuffix(reservation)}
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
