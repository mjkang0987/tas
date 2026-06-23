import React, {useEffect, useMemo, useRef, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {DesignerOffDayMoveConfirmModal} from '../overlays/DesignerOffDayMoveConfirmModal';
import {ReservationMoveConfirmModal} from '../overlays/ReservationMoveConfirmModal';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    TIMELINE_HOUR_HEIGHT,
    TIMELINE_MINUTE_HEIGHT,
    ViewType,
} from '../../../utils/constants';

import {buildDesignerColorMap} from '../../../utils/designers';
import {isNewCustomerVisit} from '../../../utils/customers';
import {buildServiceColorMap} from '../../../utils/services';
import {getTimelineRange} from '../../../utils/timelineRange';

import type {Reservation} from '../../../utils/reservations';
import {toDateKey} from '../../../utils/reservations';
import {TimelineCluster} from './TimelineCluster';
import {TimelineClusterLayer, type TimelineClusterData} from './TimelineClusterLayer';
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
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);

    // 영업시간 설정 1개를 기준으로 뷰별 시간축 범위를 파생(현재 모든 뷰가 영업시간 그대로, 패딩 0).
    const {start, end} = useMemo(
        () => getTimelineRange(type, storeSettings.businessHours),
        [type, storeSettings.businessHours]
    );

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
    const designerColorMap = useMemo(() => buildDesignerColorMap(designers), [designers]);
    const designerNameById = (designerId?: number) => (
        designerId
            ? (designers.find((designer) => designer.id === designerId)?.name ?? '미지정')
            : '미지정'
    );
    // 카드/현재시간 바/클러스터의 세로 위치 오프셋. 축 눈금선(행 높이 50px의 중앙=+25)에 맞춤.
    // ⚠️ timelineInteractions.ts의 동일 상수와 반드시 일치시킬 것(클릭 역변환이 같은 좌표계).
    const blockOffset = type === ViewType.Day ? 55 : 25;
    const timelineEntries = useMemo(() => buildTimelineEntries(reservations), [reservations]);

    // 현재시간 바: 렌더 1회 계산 + CSS 애니메이션에 의존하면 백그라운드 탭 스로틀·절전 이후
    // 애니메이션이 실제 경과만큼 진행되지 않아 바가 과거 시각에 멈춘다.
    // 주기적으로, 그리고 화면이 다시 보일 때 즉시 현재 시각을 재계산해 위치를 직접 지정한다.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        if (!isToday) return;
        const update = () => setNow(new Date());
        update();
        const intervalId = window.setInterval(update, 30_000);
        const handleVisible = () => {
            if (!document.hidden) update();
        };
        document.addEventListener('visibilitychange', handleVisible);
        window.addEventListener('focus', update);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisible);
            window.removeEventListener('focus', update);
        };
    }, [isToday]);

    const barTop = blockOffset
        + (now.getHours() - start) * TIMELINE_HOUR_HEIGHT
        + now.getMinutes() * TIMELINE_MINUTE_HEIGHT
        + now.getSeconds() * (TIMELINE_MINUTE_HEIGHT / 60);
    const timelineRef = useRef<HTMLDivElement | null>(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [openClusterState, setOpenClusterState] = useState<{ dateKey: string; cluster: TimelineClusterData } | null>(null);
    const pendingClusterReservationRef = useRef<Reservation | null>(null);
    const [confirmedOffDayMoveState, setConfirmedOffDayMoveState] = useState<{ dateKey: string; move: PendingMove } | null>(null);
    const {
        dragPreview,
        pendingMove,
        setPendingMove,
        suppressCreateClick,
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

    const openCluster = openClusterState?.dateKey === dateKey ? openClusterState.cluster : null;
    const confirmedOffDayMove = confirmedOffDayMoveState?.dateKey === dateKey ? confirmedOffDayMoveState.move : null;

    useEffect(() => {
        if (!openCluster && pendingClusterReservationRef.current) {
            const reservation = pendingClusterReservationRef.current;
            pendingClusterReservationRef.current = null;
            openReservationDetail(reservation);
        }
    }, [openCluster, openReservationDetail]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

        const mediaQuery = window.matchMedia('(pointer: coarse)');
        const update = () => setIsTouchDevice(mediaQuery.matches);
        update();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', update);
            return () => mediaQuery.removeEventListener('change', update);
        }

        mediaQuery.addListener(update);
        return () => mediaQuery.removeListener(update);
    }, []);

    const setMousePositionHandler = (e: React.MouseEvent<HTMLElement>) => {
        if (isTouchDevice) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-timeline-interactive="true"]')) return;
        if (!timelineRef.current) return;
        if (openCluster) {
            setOpenClusterState(null);
            return;
        }
        if (suppressCreateClick) return;
        setCreateReservationInitial(buildCreateReservationFromPointer({
            container: timelineRef.current,
            clientY: e.clientY,
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
                                $type={type}>
        {!isTouchDevice && (
            <StyledTimelineBackground
                type="button"
                aria-label="예약 추가"
                onClick={setMousePositionHandler}
            />
        )}
        {isToday && <StyledBar $top={barTop} />}
        {timelineEntries.map((entry) => {
            if (entry.kind === 'cluster') {
                const {cluster} = entry;
                const blockTop = (Math.floor(cluster.startMinutes / 60) - start) * TIMELINE_HOUR_HEIGHT + (cluster.startMinutes % 60) * TIMELINE_MINUTE_HEIGHT + blockOffset;
                const blockHeight = (cluster.endMinutes - cluster.startMinutes) * TIMELINE_MINUTE_HEIGHT;
                return (
                    <TimelineCluster
                        key={cluster.id}
                        cluster={cluster}
                        blockTop={blockTop}
                        blockHeight={blockHeight}
                        designerColorMap={designerColorMap}
                        designerNameById={designerNameById}
                        onToggle={() => setOpenClusterState({dateKey, cluster})}
                    />
                );
            }

            const r = entry.reservation;
            const [sH, sM] = r.startTime.split(':').map(Number);
            const [eH, eM] = r.endTime.split(':').map(Number);
            const blockTop = (sH - start) * TIMELINE_HOUR_HEIGHT + sM * TIMELINE_MINUTE_HEIGHT + blockOffset;
            const blockHeight = (eH - sH) * TIMELINE_HOUR_HEIGHT + (eM - sM) * TIMELINE_MINUTE_HEIGHT;
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
                    isNewCustomer={isNewCustomerVisit(customer?.firstVisitDate, r.date)}
                    customer={customer}
                    color={r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93'}
                    serviceColorMap={serviceColorMap}
                    hideOriginalBlock={hideOriginalBlock}
                    suppressClick={suppressCreateClick}
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
                isNewCustomer={isNewCustomerVisit(draggingCustomer?.firstVisitDate, draggingReservation.date)}
                customer={draggingCustomer ?? undefined}
                color={draggingReservation.designerId ? (designerColorMap[draggingReservation.designerId] ?? '#8E8E93') : '#8E8E93'}
                serviceColorMap={serviceColorMap}
            />
        )}
        {openCluster && (
            <TimelineClusterLayer
                cluster={openCluster}
                designerColorMap={designerColorMap}
                serviceColorMap={serviceColorMap}
                customerMap={customerMap}
                designerNameById={designerNameById}
                onClose={() => setOpenClusterState(null)}
                onReservationClick={(reservation) => {
                    pendingClusterReservationRef.current = reservation;
                    setOpenClusterState(null);
                }}
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
                    setConfirmedOffDayMoveState({dateKey, move: pendingMove});
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
                    setConfirmedOffDayMoveState(null);
                }}
                onConfirm={() => {
                    const moveTarget = (confirmedOffDayMove ?? pendingMove)!;
                    updateReservation(moveTarget.prev, moveTarget.next);
                    setPendingMove(null);
                    setConfirmedOffDayMoveState(null);
                }}
            />
        ) : null}
    </StyledTimelineWrap>);
};
const StyledTimelineWrap = styled.div<{
    $type: string
}>`
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%;
    padding: ${props => props.$type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP}px 5px 0;
    box-sizing: border-box;
    user-select: none;
`;

const StyledTimelineBackground = styled.button`
    position: absolute;
    inset: 0;
    border: 0;
    background: transparent;
    padding: 0;
    margin: 0;
    z-index: 0;
`;

const StyledBar = styled.span<{ $top: number }>`
    position: absolute;
    top: ${props => props.$top}px;
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
