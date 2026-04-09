import React, {useEffect, useMemo, useRef, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {ReservationMoveConfirmModal} from '../overlays/ReservationMoveConfirmModal';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    ViewType,
} from '../../../utils/constants';

import {getDesignerColor} from '../../../utils/designers';
import {buildServiceColorMap, calcEndTime, getServiceColor, parseServiceString} from '../../../utils/services';

import {findOverlap, toDateKey, type Reservation} from '../../../utils/reservations';
import {pad} from '../../../utils/timeRound';
import {type DragPreview, type DragState, type PendingMove} from './timelineDrag';
import {TimelineCluster} from './TimelineCluster';
import {
    buildCreateReservationFromPointer,
    buildMouseDragState,
    buildTouchDragState,
} from './timelineInteractions';
import {TimelineDragGhost, TimelineReservationCard} from './TimelineReservationCard';
import {buildTimelineEntries, type TimelineEntry} from './timelineEntries';

export const Timeline = ({
                             fullYear,
                             month,
                             date,
                             isToday
                         }: { isToday: boolean, fullYear: number, month: number, date: number }) => {

    const view = useCalendarStore((s) => s.view);
    const {type} = view;
    const time = useCalendarStore((s) => s.time);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);

    const {start, end} = time;

    const customerMap = useCalendarStore((s) => s.customerMap);
    const calendarDesignerId = useCalendarStore((s) => s.calendarDesignerId);

    const dateKey = toDateKey(fullYear, month, date);
    const reservations = (reservationMap[dateKey] || []).filter((reservation) => (
        calendarDesignerId == null || (calendarDesignerId === 0 ? !reservation.designerId : reservation.designerId === calendarDesignerId)
    ));
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerColorMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = getDesignerColor(designer);
            return acc;
        }, {}),
        [designers]
    );
    const designerNameById = (designerId?: number) => (
        designerId
            ? (designers.find((designer) => designer.id === designerId)?.name ?? '미지정')
            : '미지정'
    );
    const blockOffset = type === ViewType.Day ? 50 : 20;
    const timelineEntries = useMemo(() => buildTimelineEntries(reservations), [reservations]);

    const today = new Date();
    const hour = today.getHours();
    const minutes = today.getMinutes();
    const seconds = today.getSeconds();

    const timing = ((end - hour) * 3600) - (minutes * 60) - seconds;
    const top = ((hour - start) * 80) + (minutes * 4 / 3);
    const full = (end - start) * 80;
    const timelineRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const dragPreviewRef = useRef<DragPreview | null>(null);
    const suppressCreateClickRef = useRef(false);
    const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [openClusterId, setOpenClusterId] = useState<string | null>(null);

    const pxPerMinute = 4 / 3;

    // store refs for use inside event handlers without stale closures
    const reservationMapRef = useRef(reservationMap);
    const updateReservationRef = useRef(updateReservation);
    const setSelectedReservationRef = useRef(openReservationDetail);
    useEffect(() => {
        reservationMapRef.current = reservationMap;
    }, [reservationMap]);
    useEffect(() => {
        updateReservationRef.current = updateReservation;
    }, [updateReservation]);
    useEffect(() => {
        setSelectedReservationRef.current = openReservationDetail;
    }, [openReservationDetail]);

    const startRef = useRef(start);
    const endRef = useRef(end);
    const typeRef = useRef(type);
    const blockOffsetRef = useRef(blockOffset);
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

    const getStartTimeFromTop = (topValue: number, durationMinutes: number, startHour: number, endHour: number, offset: number) => {
        const maxStartMinutes = Math.max(0, ((endHour - startHour) * 60) - durationMinutes);
        const rawMinutes = (topValue - offset) / pxPerMinute;
        const boundedMinutes = Math.min(Math.max(rawMinutes, 0), maxStartMinutes);
        const snappedMinutes = Math.round(boundedMinutes / 30) * 30;
        const h = startHour + Math.floor(snappedMinutes / 60);
        const minute = snappedMinutes % 60;

        return `${pad(h)}:${pad(minute)}`;
    };

    const getTimelineTarget = (clientX: number, clientY: number) => {
        const pointedElement = document.elementFromPoint(clientX, clientY);
        const timelineElement = pointedElement?.closest('[data-timeline-date]');

        if (!(timelineElement instanceof HTMLDivElement)) return null;

        const targetDate = timelineElement.dataset.timelineDate;
        if (!targetDate) return null;

        return {element: timelineElement, date: targetDate};
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const targetTimeline = getTimelineTarget(clientX, clientY);
        const timeline = targetTimeline?.element ?? timelineRef.current;
        const targetDate = targetTimeline?.date ?? dateKey;
        if (!timeline) return;

        const rect = timeline.getBoundingClientRect();
        const paddingTop = typeRef.current === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
        const rawTop = clientY - rect.top - paddingTop - dragState.pointerOffsetY;
        const nextStartTime = getStartTimeFromTop(rawTop, dragState.durationMinutes, startRef.current, endRef.current, blockOffsetRef.current);
        const [nextHour, nextMinute] = nextStartTime.split(':').map(Number);
        const nextTop = (nextHour - startRef.current) * 80 + nextMinute * pxPerMinute + blockOffsetRef.current;
        const movedPx = Math.abs(nextTop - dragState.originTop);
        const nextHeight = dragState.durationMinutes * pxPerMinute;

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
    };

    const handlePointerUp = () => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const preview = dragPreviewRef.current;
        dragStateRef.current = null;
        dragPreviewRef.current = null;

        if (!dragState.didDrag || !preview) {
            setSelectedReservationRef.current(dragState.reservation);
            setDragPreview(null);
            return;
        }

        suppressCreateClickRef.current = true;
        window.setTimeout(() => {
            suppressCreateClickRef.current = false;
        }, 0);

        if (
            preview.date !== dragState.reservation.date ||
            preview.startTime !== dragState.reservation.startTime ||
            preview.endTime !== dragState.reservation.endTime
        ) {
            const overlap = findOverlap(reservationMapRef.current, preview.date, preview.startTime, preview.endTime, dragState.reservation.id);

            if (!overlap) {
                const nextReservation = {
                    ...dragState.reservation,
                    date: preview.date,
                    startTime: preview.startTime,
                    endTime: preview.endTime,
                };
                setPendingMove({
                    prev: dragState.reservation,
                    next: nextReservation,
                    customerName: customerMap[dragState.reservation.customerId]?.name,
                });
            }
        }

        setDragPreview(null);
    };

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
    }, [fullYear, month, date]);

    useEffect(() => {
        setOpenClusterId(null);
    }, [dateKey, reservations.length]);

    const setMousePositionHandler = (e: React.MouseEvent<HTMLDivElement>) => {
        if (openClusterId) {
            setOpenClusterId(null);
            return;
        }
        if (suppressCreateClickRef.current) return;
        setCreateReservationInitial(buildCreateReservationFromPointer({
            container: e.currentTarget,
            clientY: e.clientY,
            type,
            start,
            end,
            fullYear,
            month,
            date,
        }));
    };

    const setTouchPositionHandler = (e: React.TouchEvent<HTMLDivElement>) => {
        if (openClusterId) {
            setOpenClusterId(null);
            return;
        }
        if (dragStateRef.current) return;
        if (suppressCreateClickRef.current) return;
        setCreateReservationInitial(buildCreateReservationFromPointer({
            container: e.currentTarget,
            clientY: e.changedTouches[0].clientY,
            type,
            start,
            end,
            fullYear,
            month,
            date,
        }));
    };

    const draggingReservation = dragStateRef.current?.reservation ?? null;
    const isDateChanging = !!(dragPreview && draggingReservation && dragPreview.date !== draggingReservation.date);
    const showDragGhost = isDateChanging && !!dragPreview && !!draggingReservation;
    const draggingCustomer = draggingReservation ? customerMap[draggingReservation.customerId] : null;

    const startMouseDrag = (event: React.MouseEvent<HTMLElement>, reservation: Reservation, durationMinutes: number, blockTop: number, blockHeight: number) => {
        event.stopPropagation();
        const nextDrag = buildMouseDragState(event, reservation, durationMinutes, blockTop, blockHeight);
        if (!nextDrag) {
            dragStateRef.current = null;
            return;
        }

        dragStateRef.current = nextDrag.dragState;
        dragPreviewRef.current = nextDrag.preview;
        setDragPreview(nextDrag.preview);
    };

    const startTouchDrag = (event: React.TouchEvent<HTMLElement>, reservation: Reservation, durationMinutes: number, blockTop: number, blockHeight: number) => {
        event.stopPropagation();
        const nextDrag = buildTouchDragState(event, reservation, durationMinutes, blockTop, blockHeight);
        if (!nextDrag) {
            dragStateRef.current = null;
            return;
        }

        dragStateRef.current = nextDrag.dragState;
        dragPreviewRef.current = nextDrag.preview;
        setDragPreview(nextDrag.preview);
    };

    return (<StyledTimelineWrap ref={timelineRef}
                                data-timeline-date={dateKey}
                                onClick={setMousePositionHandler}
                                onTouchEnd={setTouchPositionHandler}
                                $type={type}
                                $timing={timing}
                                $top={top}
                                $full={full}>
        {isToday && <StyledBar />}
        {timelineEntries.map((entry) => {
            if (entry.kind === 'cluster') {
                const {cluster} = entry;
                const blockTop = (Math.floor(cluster.startMinutes / 60) - start) * 80 + (cluster.startMinutes % 60) * 4 / 3 + blockOffset;
                const blockHeight = (cluster.endMinutes - cluster.startMinutes) * 4 / 3;
                return (
                    <TimelineCluster
                        key={cluster.id}
                        cluster={cluster}
                        blockTop={blockTop}
                        blockHeight={blockHeight}
                        isOpen={openClusterId === cluster.id}
                        designerColorMap={designerColorMap}
                        serviceColorMap={serviceColorMap}
                        customerMap={customerMap}
                        designerNameById={designerNameById}
                        onToggle={() => setOpenClusterId((prev) => prev === cluster.id ? null : cluster.id)}
                        onReservationClick={(reservation) => {
                            openReservationDetail(reservation);
                            setOpenClusterId(null);
                        }}
                    />
                );
            }

            const r = entry.reservation;
            const [sH, sM] = r.startTime.split(':').map(Number);
            const [eH, eM] = r.endTime.split(':').map(Number);
            const blockTop = (sH - start) * 80 + sM * 4 / 3 + blockOffset;
            const blockHeight = (eH - sH) * 80 + (eM - sM) * 4 / 3;
            const customer = customerMap[r.customerId];
            const preview = dragPreview?.reservationId === r.id ? dragPreview : null;
            const durationMinutes = (eH * 60 + eM) - (sH * 60 + sM);
            const hideOriginalBlock = !!(
                preview &&
                draggingReservation &&
                draggingReservation.id === r.id &&
                preview.date !== r.date
            );

            return (
                <TimelineReservationCard
                    key={r.id}
                    reservation={r}
                    preview={preview}
                    blockTop={blockTop}
                    blockHeight={blockHeight}
                    customerName={customer?.name}
                    color={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                    serviceColorMap={serviceColorMap}
                    hideOriginalBlock={hideOriginalBlock}
                    suppressClick={suppressCreateClickRef.current}
                    onClick={() => openReservationDetail(r)}
                    onMouseDragStart={(e) => startMouseDrag(e, r, durationMinutes, blockTop, blockHeight)}
                    onTouchDragStart={(e) => startTouchDrag(e, r, durationMinutes, blockTop, blockHeight)}
                />
            );
        })}
        {showDragGhost && dragPreview && draggingReservation && (
            <TimelineDragGhost
                reservation={draggingReservation}
                preview={dragPreview}
                customerName={draggingCustomer?.name}
                color={draggingReservation.designerId ? (designerColorMap[draggingReservation.designerId] ?? '#8E8E93') : '#8E8E93'}
                serviceColorMap={serviceColorMap}
            />
        )}
        {pendingMove && <ReservationMoveConfirmModal reservation={pendingMove.prev}
                                                     nextReservation={pendingMove.next}
                                                     customerName={pendingMove.customerName}
                                                     onClose={() => setPendingMove(null)}
                                                     onConfirm={() => {
                                                         updateReservationRef.current(pendingMove.prev, pendingMove.next);
                                                         setPendingMove(null);
                                                     }} />}
    </StyledTimelineWrap>);
};
const StyledTimelineWrap = styled.div<{
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void,
    $type: string,
    $timing: number,
    $top: number,
    $full: number
}>`
    --bar-top: ${props => props.$top ? props.$top : 0}px;
    --timeline-height: ${props => props.$full ? props.$full : 10 * 80}px;

    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%;
    padding: ${props => props.$type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP}px 5px 0;
    box-sizing: border-box;
    user-select: none;

    > span {
        top: ${props => props.$type === ViewType.Day ? 50 : 20}px;
        animation: down ${props => props.$timing ? props.$timing : 10 * 3600}s linear;
    }
`;

const StyledBar = styled.span`
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--orange-color);
    pointer-events: none;

    &:before {
        content: "";
        position: absolute;
        top: -4px;
        left: 0;
        width: 10px;
        height: 10px;
        background-color: var(--orange-color);
        border-radius: 100%;
    }
`;
