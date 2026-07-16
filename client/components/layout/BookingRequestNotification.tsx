import {useCallback, useEffect, useRef, useState} from 'react';

import styled from 'styled-components';

import {useBookingRequests, type BookingRequestDto} from '../../hooks/useBookingRequests';

function formatMd(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
}

// 오너용 온라인 예약 변경/취소 요청 승인 벨. 대기 요청이 있을 때만 노출된다.
export const BookingRequestNotification = () => {
    const {requests, loading, refetch, decide} = useBookingRequests();
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);

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

    // 대기 요청이 없으면 벨 자체를 숨긴다(온라인예약 미사용 매장엔 노출 안 됨).
    if (!loading && requests.length === 0) return null;

    const count = requests.length;

    return (
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
                        <StyledPanelTitle>예약 변경·취소 요청</StyledPanelTitle>
                    </StyledPanelHeader>
                    <StyledPanelBody>
                        {loading && requests.length === 0 && <StyledEmpty>불러오는 중…</StyledEmpty>}
                        {!loading && requests.length === 0 && <StyledEmpty>대기 중인 요청이 없습니다</StyledEmpty>}
                        {requests.map((req) => (
                            <StyledItem key={req.id}>
                                <StyledItemHead>
                                    <StyledCustomer>{req.customerName || '고객'}</StyledCustomer>
                                    {req.kind === 'new' && <StyledTag>신규 예약 신청</StyledTag>}
                                    {req.kind === 'change' && <StyledTag>변경 요청</StyledTag>}
                                    {req.kind === 'cancel' && <StyledTag $danger>취소 요청</StyledTag>}
                                </StyledItemHead>
                                <StyledItemLine>
                                    {req.kind === 'new' ? '신청' : '현재'}: {formatMd(req.current.date)} {req.current.startTime}~{req.current.endTime} ({req.current.serviceSummary})
                                </StyledItemLine>
                                {req.kind === 'change' && req.requestedChange && (
                                    <StyledItemLine $accent>
                                        변경: {formatMd(req.requestedChange.date)} {req.requestedChange.startTime}~{req.requestedChange.endTime} ({req.requestedChange.serviceSummary})
                                    </StyledItemLine>
                                )}
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

const StyledTag = styled.span<{$danger?: boolean}>`
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    background: ${(p) => (p.$danger ? 'var(--danger-color, #d64545)' : 'var(--brand-color, #6526d9)')};
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
