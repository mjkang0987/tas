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
import {roundToHalfHour, pad} from '../../../utils/timeRound';
import {ButtonReserve} from "../../ui/Buttons";

interface DragPreview {
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

interface DragState {
    reservation: Reservation;
    durationMinutes: number;
    pointerOffsetY: number;
    originTop: number;
    didDrag: boolean;
}

interface PendingMove {
    prev: Reservation;
    next: Reservation;
    customerName?: string;
}

interface ReservationCluster {
    id: string;
    reservations: Reservation[];
    startMinutes: number;
    endMinutes: number;
}

type TimelineEntry =
    | { kind: 'single'; reservation: Reservation }
    | { kind: 'cluster'; cluster: ReservationCluster };

function toMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return (hour * 60) + minute;
}

function buildTimelineEntries(reservations: Reservation[]): TimelineEntry[] {
    const sorted = [...reservations].sort((a, b) => (
        a.startTime.localeCompare(b.startTime) ||
        a.endTime.localeCompare(b.endTime) ||
        a.id - b.id
    ));
    const entries: TimelineEntry[] = [];
    let current: Reservation[] = [];
    let currentStart = 0;
    let currentEnd = 0;

    const flush = () => {
        if (current.length === 0) return;

        const designerKeys = new Set(current.map((reservation) => reservation.designerId ?? 0));

        if (current.length > 1 && designerKeys.size > 1) {
            entries.push({
                kind: 'cluster',
                cluster: {
                    id: `${current[0].date}-${currentStart}-${currentEnd}-${current.map((reservation) => reservation.id).join('-')}`,
                    reservations: current,
                    startMinutes: currentStart,
                    endMinutes: currentEnd,
                }
            });
        } else {
            current.forEach((reservation) => {
                entries.push({kind: 'single', reservation});
            });
        }

        current = [];
        currentStart = 0;
        currentEnd = 0;
    };

    sorted.forEach((reservation) => {
        const startMinutes = toMinutes(reservation.startTime);
        const endMinutes = toMinutes(reservation.endTime);

        if (current.length === 0) {
            current = [reservation];
            currentStart = startMinutes;
            currentEnd = endMinutes;
            return;
        }

        if (startMinutes < currentEnd) {
            current.push(reservation);
            currentStart = Math.min(currentStart, startMinutes);
            currentEnd = Math.max(currentEnd, endMinutes);
            return;
        }

        flush();
        current = [reservation];
        currentStart = startMinutes;
        currentEnd = endMinutes;
    });

    flush();

    return entries;
}

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

        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const paddingTop = type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
        const relativeY = e.clientY - rect.top - paddingTop;
        const totalMin = Math.max(0, relativeY) / 2;
        let clickH = start + Math.floor(totalMin / 60);
        const clickM = Math.floor(totalMin % 60);
        clickH = Math.min(Math.max(clickH, start), end - 1);

        const result = roundToHalfHour(clickH, clickM);
        clickH = Math.min(result.hour, end - 1);

        const dateStr = toDateKey(fullYear, month, date);
        const startTime = `${pad(clickH)}:${pad(result.rounded)}`;

        setCreateReservationInitial({date: dateStr, startTime});
    };

    const setTouchPositionHandler = (e: React.TouchEvent<HTMLDivElement>) => {
        if (openClusterId) {
            setOpenClusterId(null);
            return;
        }
        if (dragStateRef.current) return;
        if (suppressCreateClickRef.current) return;

        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const paddingTop = type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
        const touch = e.changedTouches[0];
        const relativeY = touch.clientY - rect.top - paddingTop;
        const totalMin = Math.max(0, relativeY) / 2;
        let clickH = start + Math.floor(totalMin / 60);
        const clickM = Math.floor(totalMin % 60);
        clickH = Math.min(Math.max(clickH, start), end - 1);

        const result = roundToHalfHour(clickH, clickM);
        clickH = Math.min(result.hour, end - 1);

        const dateStr = toDateKey(fullYear, month, date);
        const startTime = `${pad(clickH)}:${pad(result.rounded)}`;

        setCreateReservationInitial({date: dateStr, startTime});
    };

    const draggingReservation = dragStateRef.current?.reservation ?? null;
    const isDateChanging = !!(dragPreview && draggingReservation && dragPreview.date !== draggingReservation.date);
    const showDragGhost = isDateChanging && !!dragPreview && !!draggingReservation;
    const draggingCustomer = draggingReservation ? customerMap[draggingReservation.customerId] : null;

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
                const isOpen = openClusterId === cluster.id;
                const designerDots = Array.from(new Map(cluster.reservations.map((reservation) => [
                    reservation.designerId ?? 0,
                    reservation.designerId ? (designerColorMap[reservation.designerId] ?? '#8E8E93') : '#8E8E93'
                ])).values());

                return (
                    <StyledOverlapWrap key={cluster.id}
                                       style={{top: blockTop, height: blockHeight}}>
                        <StyledOverlapButton
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenClusterId((prev) => prev === cluster.id ? null : cluster.id);
                            }}
                        >
                            <StyledOverlapDotList>
                                {designerDots.map((color, index) => (
                                    <StyledOverlapDot key={`${cluster.id}-${index}`}
                                                      $color={color} />
                                ))}
                            </StyledOverlapDotList>
                            <strong>{cluster.reservations.length}건 예약</strong>
                            <span>{`${pad(Math.floor(cluster.startMinutes / 60))}:${pad(cluster.startMinutes % 60)} ~ ${pad(Math.floor(cluster.endMinutes / 60))}:${pad(cluster.endMinutes % 60)}`}</span>
                        </StyledOverlapButton>
                        {isOpen && (
                            <StyledOverlapDropdown onClick={(e) => e.stopPropagation()}>
                                {cluster.reservations
                                    .slice()
                                    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))
                                    .map((reservation) => {
                                        const customer = customerMap[reservation.customerId];
                                        const designerName = reservation.designerId
                                            ? (designers.find((designer) => designer.id === reservation.designerId)?.name ?? '미지정')
                                            : '미지정';

                                        return (
                                            <StyledOverlapItem key={reservation.id}
                                                               type="button"
                                                               onClick={() => {
                                                                   openReservationDetail(reservation);
                                                                   setOpenClusterId(null);
                                                               }}>
                                                <StyledOverlapItemTop>
                                                    <StyledOverlapItemDesigner>
                                                        <StyledOverlapDot $color={reservation.designerId ? (designerColorMap[reservation.designerId] ?? '#8E8E93') : '#8E8E93'} />
                                                        <span>{designerName}</span>
                                                    </StyledOverlapItemDesigner>
                                                    <span>{reservation.startTime}~{reservation.endTime}</span>
                                                </StyledOverlapItemTop>
                                                <StyledOverlapItemService>
                                                    {parseServiceString(reservation.service).map((serviceName) => (
                                                        <span className="service-token"
                                                              key={`${reservation.id}-${serviceName}`}>
                                                            <span className="dot"
                                                                  style={{backgroundColor: getServiceColor(serviceName, serviceColorMap)}} />
                                                            {serviceName}
                                                        </span>
                                                    ))}
                                                </StyledOverlapItemService>
                                                {customer && <span className="detail">{customer.name}</span>}
                                            </StyledOverlapItem>
                                        );
                                    })}
                            </StyledOverlapDropdown>
                        )}
                    </StyledOverlapWrap>
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

            return (<ButtonReserve key={r.id}
                                   style={hideOriginalBlock ? {visibility: 'hidden'} : undefined}
                                   $position='absolute'
                                   $top={preview?.top ?? blockTop}
                                   $height={blockHeight}
                                   $color={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                                   $cancelled={r.status === 'cancelled' || r.status === 'noshow'}
                                   onClick={(e: React.MouseEvent) => {
                                       e.stopPropagation();
                                       if (r.status === 'cancelled' || r.status === 'noshow') {
                                           openReservationDetail(r);
                                       }
                                   }}
                                   onMouseDown={(e: React.MouseEvent) => {
                                       e.stopPropagation();
                                       if (r.status === 'cancelled' || r.status === 'noshow') {
                                           dragStateRef.current = null;
                                           return;
                                       }

                                       dragStateRef.current = {
                                           reservation: r,
                                           durationMinutes,
                                           pointerOffsetY: e.clientY - e.currentTarget.getBoundingClientRect().top,
                                           originTop: blockTop,
                                           didDrag: false,
                                       };
                                       const initialPreview: DragPreview = {
                                           reservationId: r.id,
                                           top: blockTop,
                                           date: r.date,
                                           startTime: r.startTime,
                                           endTime: r.endTime,
                                           ghostLeft: 0,
                                           ghostTop: 0,
                                           ghostWidth: 0,
                                           ghostHeight: blockHeight,
                                       };
                                       dragPreviewRef.current = initialPreview;
                                       setDragPreview(initialPreview);
                                   }}
                                   onTouchStart={(e: React.TouchEvent) => {
                                       e.stopPropagation();
                                       if (r.status === 'cancelled' || r.status === 'noshow') {
                                           dragStateRef.current = null;
                                           return;
                                       }

                                       const touch = e.touches[0];
                                       dragStateRef.current = {
                                           reservation: r,
                                           durationMinutes,
                                           pointerOffsetY: touch.clientY - e.currentTarget.getBoundingClientRect().top,
                                           originTop: blockTop,
                                           didDrag: false,
                                       };
                                       const initialPreview: DragPreview = {
                                           reservationId: r.id,
                                           top: blockTop,
                                           date: r.date,
                                           startTime: r.startTime,
                                           endTime: r.endTime,
                                           ghostLeft: 0,
                                           ghostTop: 0,
                                           ghostWidth: 0,
                                           ghostHeight: blockHeight,
                                       };
                                       dragPreviewRef.current = initialPreview;
                                       setDragPreview(initialPreview);
                                   }}>
                <strong className="highlight">
                    {parseServiceString(r.service).map((serviceName) => (
                        <span className="service-token"
                              key={`${r.id}-${serviceName}`}>
                            <span className="dot"
                                  style={{backgroundColor: getServiceColor(serviceName, serviceColorMap)}} />
                            {serviceName}
                        </span>
                    ))}
                    {r.status === 'cancelled' ? ' (취소)' : r.status === 'noshow' ? ' (노쇼)' : ''}
                </strong>
                {preview && <span className="sub">{preview.date} {preview.startTime}~{preview.endTime}</span>}
                {customer && <span className="detail">{customer.name}</span>}
            </ButtonReserve>);
        })}
        {showDragGhost && dragPreview && draggingReservation && (
            <StyledDragGhost aria-hidden="true"
                             $left={dragPreview.ghostLeft}
                             $top={dragPreview.ghostTop}
                             $width={dragPreview.ghostWidth}
                             $height={dragPreview.ghostHeight}
                             $color={draggingReservation.designerId ? (designerColorMap[draggingReservation.designerId] ?? '#8E8E93') : '#8E8E93'}
                             $cancelled={draggingReservation.status === 'cancelled' || draggingReservation.status === 'noshow'}>
                <strong>
                    {parseServiceString(draggingReservation.service).map((serviceName) => (
                        <span className="service-token"
                              key={`${draggingReservation.id}-${serviceName}`}>
                            <span className="dot"
                                  style={{backgroundColor: getServiceColor(serviceName, serviceColorMap)}} />
                            {serviceName}
                        </span>
                    ))}
                    {draggingReservation.status === 'cancelled' ? ' (취소)' : draggingReservation.status === 'noshow' ? ' (노쇼)' : ''}
                </strong>
                <span className="sub">{dragPreview.date} {dragPreview.startTime}~{dragPreview.endTime}</span>
                {draggingCustomer && <span className="detail">{draggingCustomer.name}</span>}
            </StyledDragGhost>
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

const StyledOverlapWrap = styled.div`
    position: absolute;
    left: 5px;
    right: 5px;
    z-index: 12;
`;

const StyledOverlapButton = styled.button`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    min-height: 100%;
    padding: 6px 8px;
    border: 1px solid var(--blue-color);
    border-left-width: 4px;
    border-radius: var(--radius-sm);
    background: rgba(45, 127, 249, 0.12);
    color: var(--dark-gray-color);
    text-align: left;
    box-sizing: border-box;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
    cursor: pointer;

    strong {
        font-size: var(--small-font);
        font-weight: 700;
    }

    span {
        font-size: var(--tiny-font);
        opacity: 0.9;
    }
`;

const StyledOverlapDotList = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const StyledOverlapDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    flex-shrink: 0;
`;

const StyledOverlapDropdown = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: min(240px, calc(100vw - 32px));
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: var(--white-color);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
    z-index: 20;
`;

const StyledOverlapItem = styled.button`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 8px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    text-align: left;
    color: var(--dark-gray-color);
    cursor: pointer;

    &:hover {
        background: var(--black-color-10);
    }

    .detail {
        font-size: var(--tiny-font);
        color: var(--dark-gray-color2);
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

const StyledOverlapItemTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--tiny-font);
`;

const StyledOverlapItemDesigner = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
`;

const StyledOverlapItemService = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-size: var(--small-font);
    font-weight: 600;
`;

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
