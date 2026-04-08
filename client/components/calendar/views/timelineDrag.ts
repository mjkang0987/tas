import type {Reservation} from '../../../utils/reservations';

export interface DragPreview {
    reservationId: number;
    top: number;
    date: string;
    startTime: string;
    endTime: string;
    ghostLeft: number;
    ghostTop: number;
    ghostWidth: number;
    ghostHeight: number;
}

export interface DragState {
    reservation: Reservation;
    durationMinutes: number;
    pointerOffsetY: number;
    originTop: number;
    didDrag: boolean;
}

export interface PendingMove {
    prev: Reservation;
    next: Reservation;
    customerName?: string;
}

export function buildInitialDragPreview(reservation: Reservation, blockTop: number, blockHeight: number): DragPreview {
    return {
        reservationId: reservation.id,
        top: blockTop,
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        ghostLeft: 0,
        ghostTop: 0,
        ghostWidth: 0,
        ghostHeight: blockHeight,
    };
}
