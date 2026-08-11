import {useEffect, useEffectEvent, useRef, useState} from 'react';

import {TIMELINE_DAY_TOP, TIMELINE_TOP, ViewType} from '../../../utils/constants';
import type {TimelineScale} from '../../../hooks/useTimelineScale';
import {findOverlap, type Reservation, type ReservationMap} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import type {Assignee} from '../../../utils/assignees';
import {getAssigneeAvailabilityState} from '../../../utils/assignees';
import {calcEndTime} from '../../../utils/services';
import {pad} from '../../../utils/timeRound';
import type {DragPreview, DragState, PendingMove} from './timelineDrag';
import {buildMouseDragState, buildTouchDragState} from './timelineInteractions';

type UseTimelineDragParams = {
    timelineRef: React.RefObject<HTMLDivElement | null>;
    dateKey: string;
    type: string;
    start: number;
    end: number;
    blockOffset: number;
    reservationMap: ReservationMap;
    customerMap: CustomerMap;
    assignees: Assignee[];
    /** 시간축 배율 — 눈금·블록과 같은 값을 써야 드래그 결과가 화면과 맞는다. */
    scale: TimelineScale;
    onOpenReservationDetail: (reservation: Reservation) => void;
};

function getStartTimeFromTop(topValue: number, durationMinutes: number, startHour: number, endHour: number, offset: number, scale: TimelineScale) {
    const maxStartMinutes = Math.max(0, ((endHour - startHour) * 60) - durationMinutes);
    const rawMinutes = (topValue - offset) / scale.minuteHeight;
    const boundedMinutes = Math.min(Math.max(rawMinutes, 0), maxStartMinutes);
    // 스냅은 매장 단위로. 30분 고정이던 시절엔 10분 예약을 옮기는 순간 시각이 30분 격자로 끌려갔다.
    const snappedMinutes = Math.round(boundedMinutes / scale.unit) * scale.unit;
    const hour = startHour + Math.floor(snappedMinutes / 60);
    const minute = snappedMinutes % 60;

    return `${pad(hour)}:${pad(minute)}`;
}

function getTimelineTarget(clientX: number, clientY: number) {
    const pointedElement = document.elementFromPoint(clientX, clientY);
    const timelineElement = pointedElement?.closest('[data-timeline-date]');

    if (!(timelineElement instanceof HTMLDivElement)) return null;

    const targetDate = timelineElement.dataset.timelineDate;
    if (!targetDate) return null;

    return {element: timelineElement, date: targetDate};
}

export function useTimelineDrag({
    timelineRef,
    dateKey,
    type,
    start,
    end,
    blockOffset,
    reservationMap,
    customerMap,
    assignees,
    scale,
    onOpenReservationDetail,
}: UseTimelineDragParams) {
    const dragStateRef = useRef<DragState | null>(null);
    const dragPreviewRef = useRef<DragPreview | null>(null);
    const suppressCreateClickRef = useRef(false);
    const reservationMapRef = useRef(reservationMap);
    const onOpenReservationDetailRef = useRef(onOpenReservationDetail);
    const startRef = useRef(start);
    const endRef = useRef(end);
    const typeRef = useRef(type);
    const blockOffsetRef = useRef(blockOffset);
    // 드래그 중 배율이 바뀌는 일은 없지만, 이벤트 핸들러가 클로저에 갇히지 않도록 다른 값들과 같은 방식으로 둔다.
    const scaleRef = useRef(scale);

    const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [draggingReservation, setDraggingReservation] = useState<Reservation | null>(null);
    const [suppressCreateClick, setSuppressCreateClick] = useState(false);

    useEffect(() => {
        reservationMapRef.current = reservationMap;
    }, [reservationMap]);

    useEffect(() => {
        onOpenReservationDetailRef.current = onOpenReservationDetail;
    }, [onOpenReservationDetail]);

    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
        startRef.current = start;
    }, [start]);

    useEffect(() => {
        endRef.current = end;
    }, [end]);

    useEffect(() => {
        typeRef.current = type;
    }, [type]);

    useEffect(() => {
        blockOffsetRef.current = blockOffset;
    }, [blockOffset]);

    const handlePointerMove = useEffectEvent((clientX: number, clientY: number) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const targetTimeline = getTimelineTarget(clientX, clientY);
        const timeline = targetTimeline?.element ?? timelineRef.current;
        const targetDate = targetTimeline?.date ?? dateKey;
        if (!timeline) return;

        const rect = timeline.getBoundingClientRect();
        const paddingTop = typeRef.current === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
        const rawTop = clientY - rect.top - paddingTop - dragState.pointerOffsetY;
        const nextStartTime = getStartTimeFromTop(rawTop, dragState.durationMinutes, startRef.current, endRef.current, blockOffsetRef.current, scaleRef.current);
        const [nextHour, nextMinute] = nextStartTime.split(':').map(Number);
        const nextTop = (nextHour - startRef.current) * scaleRef.current.hourHeight + nextMinute * scaleRef.current.minuteHeight + blockOffsetRef.current;
        const movedPx = Math.abs(nextTop - dragState.originTop);
        const nextHeight = dragState.durationMinutes * scaleRef.current.minuteHeight;

        if (movedPx > 3) {
            dragState.didDrag = true;
        }

        const preview: DragPreview = {
            reservationId: dragState.reservation.id,
            top: nextTop,
            date: targetDate,
            startTime: nextStartTime,
            endTime: calcEndTime(nextStartTime, dragState.durationMinutes),
            ghostLeft: rect.left + 5,
            ghostTop: rect.top + nextTop,
            ghostWidth: Math.max(rect.width - 10, 0),
            ghostHeight: nextHeight,
        };

        dragPreviewRef.current = preview;
        setDragPreview(preview);
    });

    const handlePointerUp = useEffectEvent(() => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const preview = dragPreviewRef.current;
        dragStateRef.current = null;
        dragPreviewRef.current = null;

        if (!dragState.didDrag || !preview) {
            onOpenReservationDetailRef.current(dragState.reservation);
            setDragPreview(null);
            setDraggingReservation(null);
            return;
        }

        suppressCreateClickRef.current = true;
        setSuppressCreateClick(true);
        window.setTimeout(() => {
            suppressCreateClickRef.current = false;
            setSuppressCreateClick(false);
        }, 0);

        if (
            preview.date !== dragState.reservation.date ||
            preview.startTime !== dragState.reservation.startTime ||
            preview.endTime !== dragState.reservation.endTime
        ) {
            const availability = getAssigneeAvailabilityState(
                assignees,
                dragState.reservation.assigneeId,
                preview.date,
                preview.startTime,
                preview.endTime
            );

            if (availability.kind === 'outside-hours') {
                window.alert(availability.message);
                setDragPreview(null);
                return;
            }

            const overlap = findOverlap(
                reservationMapRef.current,
                preview.date,
                preview.startTime,
                preview.endTime,
                dragState.reservation.id
            );

            if (!overlap) {
                setPendingMove({
                    prev: dragState.reservation,
                    next: {
                        ...dragState.reservation,
                        date: preview.date,
                        startTime: preview.startTime,
                        endTime: preview.endTime,
                    },
                    customerName: customerMap[dragState.reservation.customerId]?.name,
                    warningMessage: availability.kind === 'off-day' ? availability.message : undefined,
                });
            }
        }

        setDragPreview(null);
        setDraggingReservation(null);
    });

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            handlePointerMove(event.clientX, event.clientY);
        };

        const handleMouseUp = () => {
            handlePointerUp();
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (!dragStateRef.current) return;
            event.preventDefault();
            const touch = event.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
        };

        const handleTouchEnd = () => {
            handlePointerUp();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, {passive: false});
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [dateKey, timelineRef]);

    const startMouseDrag = (
        event: React.MouseEvent<HTMLElement>,
        reservation: Reservation,
        durationMinutes: number,
        blockTop: number,
        blockHeight: number
    ) => {
        event.stopPropagation();
        const nextDrag = buildMouseDragState(event, reservation, durationMinutes, blockTop, blockHeight);
        if (!nextDrag) {
            dragStateRef.current = null;
            return;
        }

        dragStateRef.current = nextDrag.dragState;
        dragPreviewRef.current = nextDrag.preview;
        setDraggingReservation(reservation);
        setDragPreview(nextDrag.preview);
    };

    const startTouchDrag = (
        event: React.TouchEvent<HTMLElement>,
        reservation: Reservation,
        durationMinutes: number,
        blockTop: number,
        blockHeight: number
    ) => {
        event.stopPropagation();
        const nextDrag = buildTouchDragState(event, reservation, durationMinutes, blockTop, blockHeight);
        if (!nextDrag) {
            dragStateRef.current = null;
            return;
        }

        dragStateRef.current = nextDrag.dragState;
        dragPreviewRef.current = nextDrag.preview;
        setDraggingReservation(reservation);
        setDragPreview(nextDrag.preview);
    };

    return {
        dragPreview,
        pendingMove,
        setPendingMove,
        suppressCreateClick,
        draggingReservation,
        startMouseDrag,
        startTouchDrag,
    };
}
