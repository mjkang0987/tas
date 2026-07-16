import {useCallback, useEffect, useState} from 'react';

// 고객이 보낸 온라인 예약 변경/취소 요청(오너 승인 대기)을 불러오고 수락/거절한다.
export interface BookingRequestDto {
    id: string;
    legacyId: number | null;
    customerName: string;
    assigneeName: string | null;
    pendingAction: 'cancel' | 'change';
    pendingRequestedAt: string | null;
    current: {date: string; startTime: string; endTime: string; serviceSummary: string};
    requestedChange: {date: string; startTime: string; endTime: string; serviceSummary: string} | null;
}

export function useBookingRequests() {
    const [requests, setRequests] = useState<BookingRequestDto[]>([]);
    const [loading, setLoading] = useState(false);

    const refetch = useCallback(() => {
        setLoading(true);
        fetch('/api/book-requests')
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
            .then((data) => setRequests(Array.isArray(data.requests) ? data.requests : []))
            .catch(() => setRequests([]))
            .finally(() => setLoading(false));
    }, []);

    // 마운트 시 최초 로드. refetch가 로딩 플래그를 세우는 표준 fetch-in-effect 패턴이라 규칙 로컬 예외.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { refetch(); }, [refetch]);

    // 수락/거절. 성공 여부(boolean) 반환.
    const decide = useCallback((id: string, decision: 'approve' | 'reject') =>
        fetch('/api/book-requests', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id, decision}),
        }).then((res) => res.ok).catch(() => false), []);

    return {requests, loading, refetch, decide};
}
