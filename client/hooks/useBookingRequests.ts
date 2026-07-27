import {useCallback, useEffect, useState} from 'react';

import {useSession} from 'next-auth/react';

// 고객이 보낸 온라인 예약 변경/취소 요청(오너 승인 대기)을 불러오고 수락/거절한다.
export interface BookingRequestDto {
    id: string;
    legacyId: number | null;
    kind: 'new' | 'cancel' | 'change';
    customerName: string;
    assigneeName: string | null;
    requestedAt: string | null;
    current: {date: string; startTime: string; endTime: string; serviceSummary: string};
    requestedChange: {date: string; startTime: string; endTime: string; serviceSummary: string} | null;
}

export function useBookingRequests() {
    const [requests, setRequests] = useState<BookingRequestDto[]>([]);
    const [loading, setLoading] = useState(false);
    const {data: session, status} = useSession();

    // 인증이 확정된(역할·매장 보유) 오너만 호출한다. 예전엔 sessionStorage 플래그(shouldUseLocalDb)로
    // 게이트했는데, 그 플래그는 부모(_app) 이펙트에서 설정돼 벨(자식) 마운트 이펙트보다 늦게 켜진다.
    // 그래서 콜드 로드 땐 플래그 미설정 창에서 호출이 취소되고 재조회도 안 돼 벨이 늘 비어 보였다.
    // 세션 상태에 반응하도록 바꿔, 인증 확정 시 refetch 신원이 바뀌며 자동 재조회된다.
    const authed = status === 'authenticated' && !!session?.user?.role && !!session.user?.storeId;

    const refetch = useCallback(() => {
        // 게스트/미인증에선 서버 세션이 없어 401만 나므로 호출하지 않는다.
        if (!authed) { setRequests([]); return; }
        setLoading(true);
        fetch('/api/book-requests')
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
            .then((data) => setRequests(Array.isArray(data.requests) ? data.requests : []))
            .catch(() => setRequests([]))
            .finally(() => setLoading(false));
    }, [authed]);

    // 마운트 시 + 인증 상태 변화 시 로드(refetch가 authed에 의존 → 인증 확정되면 재실행).
    // refetch가 로딩 플래그를 세우는 표준 fetch-in-effect 패턴이라 규칙 로컬 예외.
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
