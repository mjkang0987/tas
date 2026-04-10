import React, {useEffect, useMemo, useRef, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {DesignerOffDayMoveConfirmModal} from '../overlays/DesignerOffDayMoveConfirmModal';
import {ReservationMoveConfirmModal} from '../overlays/ReservationMoveConfirmModal';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    ViewType,
} from '../../../utils/constants';

import {getDesignerColor} from '../../../utils/designers';
import {buildServiceColorMap} from '../../../utils/services';

import {toDateKey} from '../../../utils/reservations';
import {TimelineCluster} from './TimelineCluster';
import {
    buildCreateReservationFromPointer,
} from './timelineInteractions';
import {TimelineDragGhost, TimelineReservationCard} from './TimelineReservationCard';
import type {PendingMove} from './timelineDrag';
import {buildTimelineEntries} from './timelineEntries';
import {useTimelineDrag} from './useTimelineDrag';

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
    const [openClusterId, setOpenClusterId] = useState<string | null>(null);
    const [confirmedOffDayMove, setConfirmedOffDayMove] = useState<PendingMove | null>(null);
    const {
        dragPreview,
        pendingMove,
        setPendingMove,
        suppressCreateClickRef,
        draggingReservation,
        startMouseDrag,
        startTouchDrag,
    } = useTimelineDrag({
        timelineRef,
        dateKey,
        type,
        start,
        end,
        blockOffset,
        reservationMap,
        customerMap,
        designers,
        onOpenReservationDetail: openReservationDetail,
    });

    useEffect(() => {
        setOpenClusterId(null);
    }, [dateKey, reservations.length]);

    useEffect(() => {
        setConfirmedOffDayMove(null);
    }, [dateKey]);

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
        if (draggingReservation) return;
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
        {pendingMove?.warningMessage && (
            <DesignerOffDayMoveConfirmModal
                reservation={pendingMove.prev}
                nextReservation={pendingMove.next}
                customerName={pendingMove.customerName}
                warningMessage={pendingMove.warningMessage}
                onClose={() => setPendingMove(null)}
                onConfirm={() => {
                    setConfirmedOffDayMove(pendingMove);
                    setPendingMove(null);
                }}
            />
        )}
        {(pendingMove && !pendingMove.warningMessage) || confirmedOffDayMove ? (
            <ReservationMoveConfirmModal
                reservation={(confirmedOffDayMove ?? pendingMove)!.prev}
                nextReservation={(confirmedOffDayMove ?? pendingMove)!.next}
                customerName={(confirmedOffDayMove ?? pendingMove)!.customerName}
                onClose={() => {
                    setPendingMove(null);
                    setConfirmedOffDayMove(null);
                }}
                onConfirm={() => {
                    const moveTarget = (confirmedOffDayMove ?? pendingMove)!;
                    updateReservation(moveTarget.prev, moveTarget.next);
                    setPendingMove(null);
                    setConfirmedOffDayMove(null);
                }}
            />
        ) : null}
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
