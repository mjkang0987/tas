import React from 'react';

import styled from 'styled-components';

import {ButtonReserve} from '../../ui/Buttons';
import type {Reservation} from '../../../utils/reservations';
import {getServiceColor, parseServiceString} from '../../../utils/services';
import type {DragPreview} from './timelineDrag';

type TimelineReservationCardProps = {
    reservation: Reservation;
    preview: DragPreview | null;
    blockTop: number;
    blockHeight: number;
    customerName?: string;
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
    color,
    serviceColorMap,
    hideOriginalBlock,
    suppressClick,
    onClick,
    onMouseDragStart,
    onTouchDragStart,
}: TimelineReservationCardProps) {
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'noshow';

    return (
        <ButtonReserve
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
                    className="drag-handle"
                    onMouseDown={onMouseDragStart}
                    onTouchStart={onTouchDragStart}
                >
                    <span className="a11y">예약 이동</span>
                </span>
            )}
            <strong className="highlight">
                {parseServiceString(reservation.service).map((serviceName) => (
                    <span className="service-token" key={`${reservation.id}-${serviceName}`}>
                        <span className="dot" style={{backgroundColor: getServiceColor(serviceName, serviceColorMap)}} />
                        {serviceName}
                    </span>
                ))}
                {reservation.status === 'cancelled' ? ' (취소)' : reservation.status === 'noshow' ? ' (노쇼)' : ''}
            </strong>
            {preview && <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>}
            {customerName && <span className="detail">{customerName}</span>}
        </ButtonReserve>
    );
}

type TimelineDragGhostProps = {
    reservation: Reservation;
    preview: DragPreview;
    customerName?: string;
    color: string;
    serviceColorMap: Record<string, string>;
};

export function TimelineDragGhost({
    reservation,
    preview,
    customerName,
    color,
    serviceColorMap,
}: TimelineDragGhostProps) {
    const isCancelled = reservation.status === 'cancelled' || reservation.status === 'noshow';

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
                {parseServiceString(reservation.service).map((serviceName) => (
                    <span className="service-token" key={`${reservation.id}-${serviceName}`}>
                        <span className="dot" style={{backgroundColor: getServiceColor(serviceName, serviceColorMap)}} />
                        {serviceName}
                    </span>
                ))}
                {reservation.status === 'cancelled' ? ' (취소)' : reservation.status === 'noshow' ? ' (노쇼)' : ''}
            </strong>
            <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>
            {customerName && <span className="detail">{customerName}</span>}
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
    height: ${(props) => props.$height}px;
    max-height: ${(props) => props.$height}px;
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
    pointer-events: none;

    strong {
        font-size: var(--small-font);
        font-weight: 600;
    }

    .sub {
        font-size: var(--tiny-font);
        opacity: 0.9;
    }

    .detail {
        margin-top: 2px;
        font-size: var(--tiny-font);
        opacity: 0.9;
    }

    .dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        margin-right: 4px;
        border-radius: 50%;
        vertical-align: middle;
    }

    .service-token {
        display: inline-flex;
        align-items: center;
        margin-right: 6px;
    }
`;
