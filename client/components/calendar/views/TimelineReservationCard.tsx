import React from 'react';

import styled from 'styled-components';

import {ButtonReserve} from '../../ui/Buttons';
import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {ServiceChipList} from '../../ui/ServiceChip';
import type {Customer} from '../../../utils/customers';
import type {Reservation} from '../../../utils/reservations';
import {hasCompletedPayment} from '../../../utils/reservations';
import type {DragPreview} from './timelineDrag';

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


    return (
        <ButtonReserve
            data-timeline-interactive="true"
            style={hideOriginalBlock ? {visibility: 'hidden'} : undefined}
            $position="absolute"
            $top={preview?.top ?? blockTop}
            $height={blockHeight}
            $color={color}
            $cancelled={isCancelled}
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
            <strong className="highlight">
                <StyledTimelineServiceList service={reservation.service}
                                          serviceColorMap={serviceColorMap}
                                          keyPrefix={reservation.id} />
                {reservation.status === 'cancelled' ? ' (예약취소)' : reservation.status === 'noshow' ? ' (노쇼)' : hasCompletedPayment(reservation) ? ' (결제완료)' : ''}
            </strong>
            {preview && <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>}
            {customerName && (
                <span className="detail">
                    {isNewCustomer && <NewCustomerBadge>N</NewCustomerBadge>}
                    <span>{customerName}</span>
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
                {reservation.status === 'cancelled' ? ' (예약취소)' : reservation.status === 'noshow' ? ' (노쇼)' : hasCompletedPayment(reservation) ? ' (결제완료)' : ''}
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
