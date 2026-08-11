import type React from 'react';

import {ViewType} from '../../../utils/constants';
import {roundToUnit} from '../../../features/reservations/timeline-scale';
import type {TimelineScale} from '../../../hooks/useTimelineScale';
import type {Reservation} from '../../../utils/reservations';
import {toDateKey} from '../../../utils/reservations';
import {pad} from '../../../utils/timeRound';
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
    scale,
}: {
    container: HTMLDivElement;
    clientY: number;
    type: string;
    start: number;
    end: number;
    fullYear: number;
    month: number;
    date: number;
    /** 블록·눈금과 같은 배율이어야 클릭한 자리와 잡히는 시각이 맞는다. */
    scale: TimelineScale;
}): CreateReservationInitial {
    const rect = container.getBoundingClientRect();
    // 예약 카드/현재시간 바는 StyledTimelineWrap 안에 position:absolute; top: (경과분*분당높이 + blockOffset)으로 그려진다.
    // (padding은 absolute 자식 위치에 영향을 주지 않으므로 paddingTop은 빼지 않는다.)
    // 클릭 역변환도 이 렌더 좌표와 동일하게 blockOffset만 빼야 시각이 맞는다.
    // ⚠️ Timeline.tsx의 blockOffset과 반드시 일치(축 눈금선 정렬값).
    const blockOffset = type === ViewType.Day ? 55 : 25;
    const relativeY = clientY - rect.top - blockOffset;
    const totalMin = Math.max(0, relativeY) / scale.minuteHeight;
    let clickHour = start + Math.floor(totalMin / 60);
    const clickMinute = Math.floor(totalMin % 60);
    clickHour = Math.min(Math.max(clickHour, start), end - 1);

    // 격자 정렬은 매장 단위로. 30분 고정이던 시절엔 10분 매장에서 10:10을 눌러도 10:00·10:30만 잡혔다.
    const rounded = roundToUnit(clickHour, clickMinute, scale.unit);
    clickHour = Math.min(rounded.hour, end - 1);

    return {
        date: toDateKey(fullYear, month, date),
        startTime: `${pad(clickHour)}:${pad(rounded.minute)}`,
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
