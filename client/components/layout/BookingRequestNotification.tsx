import {useCallback, useEffect, useRef, useState} from 'react';

import styled from 'styled-components';

import {useBookingRequests, type BookingRequestDto} from '../../hooks/useBookingRequests';
import {LabelBadge} from '../ui/LabelBadge';
import {useCalendarStore} from '../../store/calendarStore';
import {groupByDate, type Reservation, type ReservationMap} from '../../utils/reservations';
import {ReservationDetail} from '../calendar/overlays/ReservationDetail';

function formatMd(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
}

// 오너용 온라인 예약 변경/취소 요청 승인 벨. 대기 요청이 있을 때만 노출된다.
export const BookingRequestNotification = () => {
    const {requests, loading, refetch, decide} = useBookingRequests();
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const reservationHistory = useCalendarStore((s) => s.reservationHistory);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const restoreReservation = useCalendarStore((s) => s.restoreReservation);
    const deleteReservation = useCalendarStore((s) => s.deleteReservation);
    const useOnlineBooking = useCalendarStore((s) => s.useOnlineBooking);
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState<string>('');
    // 벨이 직접 여는 상세 대상(예약 객체). 페이지의 오버레이 렌더러에 의존하지 않고
    // 벨 자신이 ReservationDetail을 렌더한다 — 어느 페이지(달력·고객명단 등)에서든 동일하게 열린다.
    const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 벨 항목 클릭 → legacyId로 예약을 찾아 상세 레이어를 연다(미래 날짜 예약도 상세 접근 가능).
    // 예전엔 전역 스토어(openReservationDetail)로 열어 "그 페이지가 오버레이를 렌더하는지"에 의존했다.
    // 달력(id→reservationMap 조회) 등 일부 페이지에선 대기 예약이 맵에 없어 안 떴다.
    // 이제 벨이 예약 객체를 직접 들고 상세를 렌더하므로 페이지·맵 상태와 무관하게 열린다.
    const findInMap = (map: ReservationMap, legacyId: number): Reservation | null => {
        for (const list of Object.values(map)) {
            const found = list.find((r) => r.id === legacyId);
            if (found) return found;
        }
        return null;
    };
    const openDetail = useCallback(async (req: BookingRequestDto) => {
        if (req.legacyId == null) return;
        const inMap = findInMap(reservationMap, req.legacyId);
        if (inMap) { setDetailReservation(inMap); setOpen(false); return; }
        // 맵에 없으면(페이지 로드 후 들어온 신규 예약) 다시 불러와 찾는다.
        try {
            const res = await fetch('/api/reservations');
            if (!res.ok) return;
            const data = await res.json();
            const list: Reservation[] = Array.isArray(data.reservations) ? data.reservations : [];
            const nextMap = groupByDate(list);
            setReservationMap(nextMap); // 앱 전역 상태도 최신으로 맞춰둔다.
            if (Array.isArray(data.history)) setReservationHistory(data.history);
            const found = list.find((r) => r.id === req.legacyId) ?? null;
            if (found) { setDetailReservation(found); setOpen(false); }
        } catch { /* 네트워크 실패 무시 */ }
    }, [reservationMap, setReservationMap, setReservationHistory]);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const onDecide = useCallback(async (req: BookingRequestDto, decision: 'approve' | 'reject') => {
        if (busyId) return;
        setBusyId(req.id);
        const ok = await decide(req.id, decision);
        setBusyId('');
        if (!ok) return;
        // 예약 상태가 바뀌는 경우 캘린더 반영을 위해 새로고침:
        //  - 수락(확정/변경/취소 반영), 신규 신청 거절(→취소). 변경/취소 요청 거절은 예약 불변 → 목록만 갱신.
        if (decision === 'approve' || req.kind === 'new') {
            window.location.reload();
            return;
        }
        refetch();
    }, [busyId, decide, refetch]);

    // 온라인 예약을 쓰는 매장은 대기 건이 없어도 아이콘을 상시 노출(헤더 진입점 유지).
    // 온라인 미사용 매장에는 노출하지 않는다.
    if (!useOnlineBooking) return null;

    const count = requests.length;

    return (
        <>
        <StyledContainer ref={containerRef}>
            <StyledBellButton type="button" onClick={() => setOpen((v) => !v)}
                              aria-label={count > 0 ? `예약 요청 ${count}건` : '예약 요청'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                {count > 0 && <StyledBadge aria-hidden="true">{count > 9 ? '9+' : count}</StyledBadge>}
            </StyledBellButton>

            {open && (
                <StyledPanel>
                    <StyledPanelHeader>
                        <StyledPanelTitle>예약 신청·변경·취소</StyledPanelTitle>
                    </StyledPanelHeader>
                    <StyledPanelBody>
                        {loading && requests.length === 0 && <StyledEmpty>불러오는 중…</StyledEmpty>}
                        {!loading && requests.length === 0 && <StyledEmpty>대기 중인 요청이 없습니다</StyledEmpty>}
                        {requests.map((req) => (
                            <StyledItem key={req.id}>
                                <StyledItemBody type="button" onClick={() => openDetail(req)} title="예약 상세 보기">
                                    <StyledItemHead>
                                        <StyledCustomer>{req.customerName || '고객'}</StyledCustomer>
                                        {req.kind === 'new' && <LabelBadge $tone="warning" $shape="pill">신규 예약 신청</LabelBadge>}
                                        {req.kind === 'change' && <LabelBadge $tone="purple" $shape="pill">변경 요청</LabelBadge>}
                                        {req.kind === 'cancel' && <LabelBadge $tone="danger" $shape="pill">취소 요청</LabelBadge>}
                                    </StyledItemHead>
                                    <StyledItemLine>
                                        {req.kind === 'new' ? '신청' : '현재'}: {formatMd(req.current.date)} {req.current.startTime}~{req.current.endTime} ({req.current.serviceSummary})
                                    </StyledItemLine>
                                    {req.kind === 'change' && req.requestedChange && (
                                        <StyledItemLine $accent>
                                            변경: {formatMd(req.requestedChange.date)} {req.requestedChange.startTime}~{req.requestedChange.endTime} ({req.requestedChange.serviceSummary})
                                        </StyledItemLine>
                                    )}
                                </StyledItemBody>
                                <StyledItemActions>
                                    <StyledRejectBtn type="button" disabled={!!busyId} onClick={() => onDecide(req, 'reject')}>거절</StyledRejectBtn>
                                    <StyledApproveBtn type="button" disabled={!!busyId} onClick={() => onDecide(req, 'approve')}>수락</StyledApproveBtn>
                                </StyledItemActions>
                            </StyledItem>
                        ))}
                    </StyledPanelBody>
                </StyledPanel>
            )}
        </StyledContainer>

        {/* 벨이 직접 여는 상세 오버레이. ReservationDetail은 createPortal로 body에 렌더돼
            어느 페이지에서든 동일하게 뜬다(페이지별 오버레이 렌더러 의존 제거). */}
        {detailReservation && (
            <ReservationDetail
                reservation={detailReservation}
                customerMap={customerMap}
                reservationMap={reservationMap}
                history={reservationHistory}
                onClose={() => setDetailReservation(null)}
                onCustomerClick={openCustomerDetail}
                onUpdate={(prev, updated) => { updateReservation(prev, updated); setDetailReservation(updated); }}
                onCancel={(target, status) => { cancelReservation(target, status); setDetailReservation(null); }}
                onRestore={restoreReservation}
                onDelete={(target) => { deleteReservation(target); setDetailReservation(null); }}
            />
        )}
        </>
    );
};

const StyledContainer = styled.div`
    position: relative;
    display: inline-flex;
`;

const StyledBellButton = styled.button`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--dark-gray-color, #444);
    cursor: pointer;
`;

const StyledBadge = styled.span`
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--danger-color, #d64545);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
`;

const StyledPanel = styled.div`
    position: absolute;
    top: 44px;
    right: 0;
    width: 320px;
    max-width: 90vw;
    background: var(--white-color, #fff);
    border: 1px solid var(--light-gray-color, #e4e7eb);
    border-radius: 12px;
    box-shadow: var(--shadow-md, 0 6px 24px rgba(0,0,0,0.12));
    z-index: 50;
    overflow: hidden;
`;

const StyledPanelHeader = styled.div`
    padding: 12px 14px;
    border-bottom: 1px solid var(--light-gray-color, #eef0f2);
`;

const StyledPanelTitle = styled.strong`
    font-size: 14px;
    font-weight: 700;
    color: var(--black-color, #111);
`;

const StyledPanelBody = styled.div`
    max-height: 360px;
    overflow-y: auto;
`;

const StyledEmpty = styled.p`
    margin: 0;
    padding: 20px 14px;
    font-size: 13px;
    color: var(--dark-gray-color2, #667);
    text-align: center;
`;

const StyledItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--light-gray-color, #f1f3f5);
`;

const StyledItemBody = styled.button`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
`;

const StyledItemHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const StyledCustomer = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: var(--black-color, #111);
`;

const StyledItemLine = styled.span<{$accent?: boolean}>`
    font-size: 12.5px;
    color: ${(p) => (p.$accent ? 'var(--brand-color, #6526d9)' : 'var(--dark-gray-color2, #667)')};
    font-weight: ${(p) => (p.$accent ? 600 : 400)};
`;

const StyledItemActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 6px;
`;

const StyledApproveBtn = styled.button`
    flex: 1;
    height: 34px;
    border: none;
    border-radius: 8px;
    background: var(--brand-color, #6526d9);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const StyledRejectBtn = styled.button`
    flex: 1;
    height: 34px;
    border: 1px solid var(--light-gray-color, #d7dbe0);
    border-radius: 8px;
    background: var(--white-color, #fff);
    color: var(--dark-gray-color, #444);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;
