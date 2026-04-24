import type React from 'react';

import {TIMELINE_DAY_TOP, TIMELINE_TOP, ViewType} from '../../../utils/constants';
import type {Reservation} from '../../../utils/reservations';
import {toDateKey} from '../../../utils/reservations';
import {roundToHalfHour, pad} from '../../../utils/timeRound';
import {buildInitialDragPreview, type DragState} from './timelineDrag';

type CreateReservationInitial = {
    date: string;
    startTime: string;
};

export function buildCreateReservationFromPointer({
    container,
    clientY,
    type,
    start,
    end,
    fullYear,
    month,
    date,
}: {
    container: HTMLDivElement;
    clientY: number;
    type: string;
    start: number;
    end: number;
    fullYear: number;
    month: number;
    date: number;
}): CreateReservationInitial {
    const rect = container.getBoundingClientRect();
    const paddingTop = type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
    const relativeY = clientY - rect.top - paddingTop;
    const totalMin = Math.max(0, relativeY) / 2;
    let clickHour = start + Math.floor(totalMin / 60);
    const clickMinute = Math.floor(totalMin % 60);
    clickHour = Math.min(Math.max(clickHour, start), end - 1);

    const rounded = roundToHalfHour(clickHour, clickMinute);
    clickHour = Math.min(rounded.hour, end - 1);

    return {
        date: toDateKey(fullYear, month, date),
        startTime: `${pad(clickHour)}:${pad(rounded.rounded)}`,
    };
}

export function buildMouseDragState(
    event: React.MouseEvent<HTMLElement>,
    reservation: Reservation,
    durationMinutes: number,
    blockTop: number,
    blockHeight: number
): { dragState: DragState; preview: ReturnType<typeof buildInitialDragPreview> } | null {
    if (reservation.status === 'cancelled' || reservation.status === 'noshow' || reservation.status === 'completed') {
        return null;
    }

    return {
        dragState: {
            reservation,
            durationMinutes,
            pointerOffsetY: event.clientY - event.currentTarget.getBoundingClientRect().top,
            originTop: blockTop,
            didDrag: false,
        },
        preview: buildInitialDragPreview(reservation, blockTop, blockHeight),
    };
}

export function buildTouchDragState(
    event: React.TouchEvent<HTMLElement>,
    reservation: Reservation,
    durationMinutes: number,
    blockTop: number,
    blockHeight: number
): { dragState: DragState; preview: ReturnType<typeof buildInitialDragPreview> } | null {
    if (reservation.status === 'cancelled' || reservation.status === 'noshow' || reservation.status === 'completed') {
        return null;
    }

    const touch = event.touches[0];

    return {
        dragState: {
            reservation,
            durationMinutes,
            pointerOffsetY: touch.clientY - event.currentTarget.getBoundingClientRect().top,
            originTop: blockTop,
            didDrag: false,
        },
        preview: buildInitialDragPreview(reservation, blockTop, blockHeight),
    };
}
