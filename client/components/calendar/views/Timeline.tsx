import React, {useEffect, useMemo, useRef, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import {AssigneeOffDayMoveConfirmModal} from '../overlays/AssigneeOffDayMoveConfirmModal';
import {ReservationMoveConfirmModal} from '../overlays/ReservationMoveConfirmModal';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,

    ViewType,
} from '../../../utils/constants';

import {buildAssigneeColorMap} from '../../../utils/assignees';
import {isNewCustomerVisit} from '../../../utils/customers';
import {buildServiceColorMap} from '../../../utils/services';
import {getTimelineRange} from '../../../utils/timelineRange';

import type {Reservation} from '../../../utils/reservations';
import {isOnlineReservation, toDateKey} from '../../../utils/reservations';
import {TimelineCluster} from './TimelineCluster';
import {TimelineClusterLayer, type TimelineClusterData} from './TimelineClusterLayer';
import {
    buildCreateReservationFromPointer,
} from './timelineInteractions';
import {TimelineDragGhost, TimelineReservationCard} from './TimelineReservationCard';
import type {PendingMove} from './timelineDrag';
import {buildTimelineEntries} from './timelineEntries';
import {useTimelineDrag} from './useTimelineDrag';
import {useTimelineScale} from '../../../hooks/useTimelineScale';
import {cardDetailForHeight, cardHeightFor} from '../../../features/reservations/timeline-scale';

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
    const assignees = useCalendarStore((s) => s.assignees);

    // 영업시간 설정 1개를 기준으로 뷰별 시간축 범위를 파생(현재 모든 뷰가 영업시간 그대로, 패딩 0).
    const {start, end} = useMemo(
        () => getTimelineRange(type, storeSettings.businessHours),
        [type, storeSettings.businessHours]
    );

    const customerMap = useCalendarStore((s) => s.customerMap);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);

    const dateKey = toDateKey(fullYear, month, date);
    // 시간축·블록·드래그·클릭생성이 공유하는 배율. 한 곳만 다른 값을 쓰면 화면이 예약 시각을 거짓말한다.
    const scale = useTimelineScale();
    // 타임라인(일별/주별/3일)에서는 취소된 예약을 숨긴다(블록·건수 부풀림 방지).
    // 단, 고객 예약 페이지 경유(온라인) 취소 건은 기록 추적을 위해 취소 상태로 남긴다.
    const reservations = (reservationMap[dateKey] || []).filter((reservation) => (
        (calendarAssigneeId == null || (calendarAssigneeId === 0 ? !reservation.assigneeId : reservation.assigneeId === calendarAssigneeId))
        && (reservation.status !== 'cancelled' || isOnlineReservation(reservation))
    ));
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const assigneeColorMap = useMemo(() => buildAssigneeColorMap(assignees), [assignees]);
    const assigneeNameById = (assigneeId?: number) => (
        assigneeId
            ? (assignees.find((assignee) => assignee.id === assigneeId)?.name ?? '미지정')
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
        + (now.getHours() - start) * scale.hourHeight
        + now.getMinutes() * scale.minuteHeight
        + now.getSeconds() * (scale.minuteHeight / 60);
    const timelineRef = useRef<HTMLDivElement | null>(null);
    const nowBarRef = useRef<HTMLSpanElement | null>(null);

    // 오늘이면 열자마자 현재시각이 화면 위쪽에 오도록 스크롤한다.
    //
    // 타임라인은 영업시간 전체(예: 09~20시)를 세로로 펼치므로 첫 화면은 언제나 개점
    // 시각이다. 오후에 열면 현재시각 바가 한참 아래에 있어 매번 손으로 내려야 했다.
    // 위쪽 여백은 `StyledBar` 의 `scroll-margin-top` 이 정한다 — 가운데 두면 이미
    // 지나간 시간대가 절반을 먹는다. 앞으로 올 예약이 더 보여야 한다.
    //
    // **높이가 확정된 뒤에 놓아야 한다.** 마운트 직후엔 콘텐츠가 짧아 스크롤이 그 시점의
    // 최대치에 걸린다(측정: 목표 72px 인데 426px 에서 멈췄고, 나중에 최대치가 늘어도
    // 그대로였다). 그래서 크기가 바뀔 때마다 다시 놓는다.
    //
    // 최초 1회만(deps: isToday). 매 30초 `now` 가 갱신될 때마다 스크롤하면 사용자가
    // 다른 시간대를 보고 있어도 계속 끌려온다.
    useEffect(() => {
        if (!isToday) return;

        const place = () => {
            nowBarRef.current?.scrollIntoView({block: 'start', inline: 'nearest', behavior: 'auto'});
        };

        // 크기가 바뀔 때마다 다시 놓되, 짧은 창(1초) 뒤에는 관찰을 끝낸다.
        // "더 이상 안 움직이면 정착"으로 판정했더니 `ResizeObserver` 가 관찰 시작 시
        // 한 번 즉시 호출되는 바람에 콘텐츠가 커지기도 전에 끊겨, 최대치에 걸린
        // 위치(72px 목표인데 426px)에 머물렀다.
        const observer = new ResizeObserver(place);
        const wrap = timelineRef.current;
        if (wrap) observer.observe(wrap);
        place();

        const stop = window.setTimeout(() => observer.disconnect(), 1000);

        return () => {
            window.clearTimeout(stop);
            observer.disconnect();
        };
    }, [isToday]);
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
        assignees,
        scale,
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
            scale,
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
        {isToday && <StyledBar ref={nowBarRef} $top={barTop} />}
        {timelineEntries.map((entry) => {
            if (entry.kind === 'cluster') {
                const {cluster} = entry;
                const blockTop = (Math.floor(cluster.startMinutes / 60) - start) * scale.hourHeight + (cluster.startMinutes % 60) * scale.minuteHeight + blockOffset;
                const blockHeight = cardHeightFor(cluster.endMinutes - cluster.startMinutes, scale.minuteHeight);
                return (
                    <TimelineCluster
                        key={cluster.id}
                        cluster={cluster}
                        blockTop={blockTop}
                        blockHeight={blockHeight}
                        assigneeColorMap={assigneeColorMap}
                        assigneeNameById={assigneeNameById}
                        onToggle={() => setOpenClusterState({dateKey, cluster})}
                    />
                );
            }

            const r = entry.reservation;
            const [sH, sM] = r.startTime.split(':').map(Number);
            const [eH, eM] = r.endTime.split(':').map(Number);
            const blockTop = (sH - start) * scale.hourHeight + sM * scale.minuteHeight + blockOffset;
            // 비례 높이가 글자 한 줄도 못 담으면 최소 높이가 받는다(오너가 소요시간을 직접 줄인 예약).
            const blockHeight = cardHeightFor(((eH - sH) * 60) + (eM - sM), scale.minuteHeight);
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
                    color={r.assigneeId ? (assigneeColorMap[r.assigneeId] ?? '#8E8E93') : '#8E8E93'}
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
                color={draggingReservation.assigneeId ? (assigneeColorMap[draggingReservation.assigneeId] ?? '#8E8E93') : '#8E8E93'}
                serviceColorMap={serviceColorMap}
            />
        )}
        {openCluster && (
            <TimelineClusterLayer
                cluster={openCluster}
                assigneeColorMap={assigneeColorMap}
                serviceColorMap={serviceColorMap}
                customerMap={customerMap}
                assigneeNameById={assigneeNameById}
                onClose={() => setOpenClusterState(null)}
                onReservationClick={(reservation) => {
                    pendingClusterReservationRef.current = reservation;
                    setOpenClusterState(null);
                }}
            />
        )}
        {pendingMove?.warningMessage && (
            <AssigneeOffDayMoveConfirmModal
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
    /* 자동 스크롤 시 화면 맨 위에 딱 붙지 않게 여백을 둔다.
       바로 앞 시간대가 조금 보여야 "지금 어디쯤인지" 읽힌다. */
    scroll-margin-top: 72px;

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
