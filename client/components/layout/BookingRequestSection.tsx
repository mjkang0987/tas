import {useCallback, useState} from 'react';

import styled from 'styled-components';

import {StyledEmpty as StyledEmptyBase} from '../settings/settings-styles';

import type {BookingRequestDto} from '../../hooks/useBookingRequests';
import {LabelBadge} from '../ui/LabelBadge';
import {StyledItemSub, StyledItemTop, StyledPlainItem, StyledStrong} from './NotificationCenter.styles';

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
            {/* 다른 칸(확인할 일)과 같은 줄 모양 — 왼쪽 내용, 오른쪽 거절·수락 */}
            {requests.map((req) => (
                <StyledPlainItem key={req.id}>
                    <StyledItemBody type="button" onClick={() => req.legacyId != null && onOpenReservation(req.legacyId)} title="예약 상세 보기">
                        <StyledItemTop>
                            <StyledStrong>{req.customerName || '고객'}</StyledStrong>
                            {req.kind === 'new' && <LabelBadge $tone="warning" $shape="soft" $size="sm">신규 신청</LabelBadge>}
                            {req.kind === 'change' && <LabelBadge $tone="purple" $shape="soft" $size="sm">변경 요청</LabelBadge>}
                            {req.kind === 'cancel' && <LabelBadge $tone="danger" $shape="soft" $size="sm">취소 요청</LabelBadge>}
                        </StyledItemTop>
                        <StyledItemSub>
                            {formatMd(req.current.date)} {req.current.startTime}~{req.current.endTime} · {req.current.serviceSummary}
                        </StyledItemSub>
                        {req.kind === 'change' && req.requestedChange && (
                            <StyledChangeLine>
                                → {formatMd(req.requestedChange.date)} {req.requestedChange.startTime}~{req.requestedChange.endTime} · {req.requestedChange.serviceSummary}
                            </StyledChangeLine>
                        )}
                    </StyledItemBody>
                    <StyledRejectBtn type="button" disabled={!!busyId} onClick={() => onDecide(req, 'reject')}
                                     aria-label={`${req.customerName || '고객'} 요청 거절`}>거절</StyledRejectBtn>
                    <StyledApproveBtn type="button" disabled={!!busyId} onClick={() => onDecide(req, 'approve')}
                                      aria-label={`${req.customerName || '고객'} 요청 수락`}>수락</StyledApproveBtn>
                </StyledPlainItem>
            ))}
        </>
    );
};

const StyledEmpty = styled(StyledEmptyBase)`
    padding: 14px 12px;
`;

const StyledItemBody = styled.button`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    font-size: var(--small-font);
    text-align: left;
    cursor: pointer;
`;

const StyledChangeLine = styled.span`
    color: var(--brand-color);
    font-size: var(--xsmall-font);
    font-weight: 600;
`;

const StyledDecisionBtn = styled.button`
    flex-shrink: 0;
    min-height: 32px;
    padding: 0 10px;
    border-radius: var(--radius-md);
    font-size: var(--xsmall-font);
    font-weight: 700;
    cursor: pointer;

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

const StyledRejectBtn = styled(StyledDecisionBtn)`
    border: 1px solid var(--gray-color2);
    background: var(--surface-color);
    color: var(--dark-gray-color);
`;

const StyledApproveBtn = styled(StyledDecisionBtn)`
    border: 1px solid var(--brand-fill);
    background: var(--brand-fill);
    color: var(--white-color);
`;
