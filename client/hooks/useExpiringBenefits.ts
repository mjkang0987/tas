import {useCallback, useEffect, useState} from 'react';

import {useSession} from 'next-auth/react';

import type {ExpiringBenefit} from '../features/notifications/expiring';

// 알림 목록 '확인할 일' — 7일 안에 만료되는 쿠폰·회원권과 매장 확인 여부. useBookingRequests 와 같은 모양.
export function useExpiringBenefits() {
    const [benefits, setBenefits] = useState<ExpiringBenefit[]>([]);
    const {data: session, status} = useSession();
    // 쿠폰·회원권은 로그인 매장 기능 — 게스트·미인증은 서버 세션이 없어 401만 난다.
    const authed = status === 'authenticated' && !!session?.user?.role && !!session.user?.storeId;

    const refetch = useCallback(() => {
        if (!authed) { setBenefits([]); return; }
        fetch('/api/expiring-benefits')
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
            .then((data) => setBenefits(Array.isArray(data.items) ? data.items : []))
            .catch(() => setBenefits([]));
    }, [authed]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { refetch(); }, [refetch]);

    // 확인 체크 — 바로 바꿔 보이고, 실패하면 되돌린다.
    const setChecked = useCallback((target: ExpiringBenefit, checked: boolean) => {
        const apply = (value: boolean) => setBenefits((list) => list.map((b) =>
            b.kind === target.kind && b.id === target.id ? {...b, checked: value} : b));
        apply(checked);
        fetch('/api/expiring-benefits', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({kind: target.kind, id: target.id, checked}),
        }).then((res) => { if (!res.ok) apply(!checked); }).catch(() => apply(!checked));
    }, []);

    return {benefits, refetch, setChecked};
}
