import React, {useEffect, useMemo, useRef, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    ViewType,
} from '../../../utils/constants';

import {buildServiceColorMap, calcEndTime, getServiceColor} from '../../../utils/services';

import {findOverlap, toDateKey, type Reservation} from '../../../utils/reservations';
import {roundToHalfHour, pad} from '../../../utils/timeRound';
import {ButtonReserve} from "../../ui/Buttons";

interface DragPreview {
    reservationId: number;
    top: number;
    startTime: string;
    endTime: string;
}

interface DragState {
    reservation: Reservation;
    durationMinutes: number;
    pointerOffsetY: number;
    originTop: number;
    didDrag: boolean;
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
    const setSelectedReservation = useCalendarStore((s) => s.setSelectedReservation);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);

    const {start, end} = time;

    const customerMap = useCalendarStore((s) => s.customerMap);

    const dateKey = toDateKey(fullYear, month, date);
    const reservations = reservationMap[dateKey] || [];
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const blockOffset = type === ViewType.Day ? 50 : 20;

    const today = new Date();
    const hour = today.getHours();
    const minutes = today.getMinutes();
    const seconds = today.getSeconds();

    const timing = ((end - hour) * 3600) - (minutes * 60) - seconds;
    const top = ((hour - start) * 80) + (minutes * 4 / 3);
    const full = (end - start) * 80;
    const timelineRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const suppressCreateClickRef = useRef(false);
    const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

    const pxPerMinute = 4 / 3;

    const getStartTimeFromTop = (topValue: number, durationMinutes: number) => {
        const maxStartMinutes = Math.max(0, ((end - start) * 60) - durationMinutes);
        const rawMinutes = (topValue - blockOffset) / pxPerMinute;
        const boundedMinutes = Math.min(Math.max(rawMinutes, 0), maxStartMinutes);
        const snappedMinutes = Math.round(boundedMinutes / 30) * 30;
        const hour = start + Math.floor(snappedMinutes / 60);
        const minute = snappedMinutes % 60;

        return `${pad(hour)}:${pad(minute)}`;
    };

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            const dragState = dragStateRef.current;
            const timeline = timelineRef.current;
            if (!dragState || !timeline) return;

            const rect = timeline.getBoundingClientRect();
            const paddingTop = type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
            const rawTop = event.clientY - rect.top - paddingTop - dragState.pointerOffsetY;
            const nextStartTime = getStartTimeFromTop(rawTop, dragState.durationMinutes);
            const [nextHour, nextMinute] = nextStartTime.split(':').map(Number);
            const nextTop = (nextHour - start) * 80 + nextMinute * pxPerMinute + blockOffset;
            const movedPx = Math.abs(nextTop - dragState.originTop);

            if (movedPx > 3) {
                dragState.didDrag = true;
            }

            setDragPreview({
                reservationId: dragState.reservation.id,
                top: nextTop,
                startTime: nextStartTime,
                endTime: calcEndTime(nextStartTime, dragState.durationMinutes),
            });
        };

        const handleMouseUp = () => {
            const dragState = dragStateRef.current;

            if (!dragState) return;

            const preview = dragPreview;
            dragStateRef.current = null;

            if (!dragState.didDrag || !preview) {
                setSelectedReservation(dragState.reservation);
                setDragPreview(null);
                return;
            }

            suppressCreateClickRef.current = true;
            window.setTimeout(() => {
                suppressCreateClickRef.current = false;
            }, 0);

            if (preview.startTime !== dragState.reservation.startTime || preview.endTime !== dragState.reservation.endTime) {
                const overlap = findOverlap(reservationMap, dateKey, preview.startTime, preview.endTime, dragState.reservation.id);

                if (!overlap) {
                    updateReservation(dragState.reservation, {
                        ...dragState.reservation,
                        startTime: preview.startTime,
                        endTime: preview.endTime,
                    });
                }
            }

            setDragPreview(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [blockOffset, dateKey, dragPreview, end, pxPerMinute, reservationMap, setSelectedReservation, start, type, updateReservation]);

    const setMousePositionHandler = (e: React.MouseEvent<HTMLDivElement>) => {
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

    return (<StyledTimelineWrap ref={timelineRef}
                                onClick={setMousePositionHandler}
                                type={type}
                                $timing={timing}
                                $top={top}
                                $full={full}>
        {isToday && <StyledBar />}
        {reservations.map((r, index) => {
            const [sH, sM] = r.startTime.split(':').map(Number);
            const [eH, eM] = r.endTime.split(':').map(Number);
            const blockTop = (sH - start) * 80 + sM * 4 / 3 + blockOffset;
            const blockHeight = (eH - sH) * 80 + (eM - sM) * 4 / 3;
            const customer = customerMap[r.customerId];
            const preview = dragPreview?.reservationId === r.id ? dragPreview : null;
            const durationMinutes = (eH * 60 + eM) - (sH * 60 + sM);

            return (<ButtonReserve key={r.id}
                                   $position='absolute'
                                   $top={preview?.top ?? blockTop}
                                   $height={blockHeight}
                                   $color={getServiceColor(r.service, serviceColorMap)}
                                   $cancelled={r.status === 'cancelled' || r.status === 'noshow'}
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
                                       setDragPreview({
                                           reservationId: r.id,
                                           top: blockTop,
                                           startTime: r.startTime,
                                           endTime: r.endTime,
                                       });
                                   }}>
                <strong>{r.service}{r.status === 'cancelled' ? ' (취소)' : r.status === 'noshow' ? ' (노쇼)' : ''}</strong>
                {preview && <span className="sub">{preview.startTime}~{preview.endTime}</span>}
                {customer && <span className="detail">{customer.name}</span>}
            </ButtonReserve>);
        })}
    </StyledTimelineWrap>);
};
const StyledTimelineWrap = styled.div<{
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void,
    type: string,
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
    padding: ${props => props.type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP}px 5px 0;
    box-sizing: border-box;
    user-select: none;

    > span {
        top: ${props => props.type === ViewType.Day ? 50 : 20}px;
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
