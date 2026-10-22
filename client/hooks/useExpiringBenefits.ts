import {useCallback, useEffect, useState} from 'react';

import {useSession} from 'next-auth/react';

import type {ExpiringBenefit} from '../features/notifications/expiring';

// 알림 목록 '쿠폰·회원권 만료 임박' — 7일 안에 만료되는 쿠폰·회원권과 매장 확인 여부. useBookingRequests 와 같은 모양.
/** featureOn: 매장에서 쿠폰·회원권 중 하나라도 켰는지 — 둘 다 끈 매장은 부르지 않는다. */
export function useExpiringBenefits(featureOn: boolean) {
    const [benefits, setBenefits] = useState<ExpiringBenefit[]>([]);
    const {data: session, status} = useSession();
    // 쿠폰·회원권은 로그인 매장 기능 — 게스트·미인증은 서버 세션이 없어 401만 난다.
    const authed = status === 'authenticated' && !!session?.user?.role && !!session.user?.storeId;
    const active = authed && featureOn;

    const refetch = useCallback(() => {
        if (!active) { setBenefits([]); return; }
        fetch('/api/expiring-benefits')
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
            .then((data) => setBenefits(Array.isArray(data.items) ? data.items : []))
            .catch(() => setBenefits([]));
    }, [active]);

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

    // enabled: 이 칸을 쓸 수 있는 사람(로그인 매장 직원 이상) — 비어 있어도 칸·탭을 보일지 정한다
    return {benefits, enabled: authed, refetch, setChecked};
}
