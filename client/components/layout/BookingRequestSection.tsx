import {useCallback, useState} from 'react';

import styled from 'styled-components';

import {StyledEmpty as StyledEmptyBase} from '../settings/settings-styles';

import type {BookingRequestDto} from '../../hooks/useBookingRequests';
import {LabelBadge} from '../ui/LabelBadge';

function formatMd(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
}

interface BookingRequestSectionProps {
    requests: BookingRequestDto[];
    loading: boolean;
    refetch: () => void;
    decide: (id: string, decision: 'approve' | 'reject') => Promise<boolean>;
    /** 요청을 누르면 그 예약 상세 — 상세는 알림 종(NotificationCenter)이 한 곳에서 띄운다 */
    onOpenReservation: (legacyId: number) => void;
}

/**
 * 알림 목록의 '고객 예약 요청' 칸 — 온라인 예약의 신청·변경·취소 요청과 수락·거절.
 * 예전엔 따로 있던 요청 벨(헤더)이었는데, 휴대폰 헤더에 자리가 없어 알림 종 하나로 합쳤다(2026-10-22).
 */
export const BookingRequestSection = ({requests, loading, refetch, decide, onOpenReservation}: BookingRequestSectionProps) => {
    const [busyId, setBusyId] = useState<string>('');

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

    return (
        <>
            {loading && requests.length === 0 && <StyledEmpty>불러오는 중…</StyledEmpty>}
            {!loading && requests.length === 0 && <StyledEmpty>대기 중인 요청이 없습니다</StyledEmpty>}
            {requests.map((req) => (
                <StyledItem key={req.id}>
                    <StyledItemBody type="button" onClick={() => req.legacyId != null && onOpenReservation(req.legacyId)} title="예약 상세 보기">
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
        </>
    );
};

const StyledEmpty = styled(StyledEmptyBase)`
    padding: 20px 14px;
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
    font-size: var(--font);
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
    font-size: var(--medium-font);
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
    font-size: var(--medium-font);
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;
