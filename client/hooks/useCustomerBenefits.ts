import {useEffect, useState} from 'react';

import {useCalendarStore} from '../store/calendarStore';
import {shouldUseLocalDb} from '../lib/local-db';
import type {CustomerBenefits} from '../features/customers/benefits';

// 고객 한 명이 쓸 수 있는 회원권·쿠폰. 예약 상세·고객정보 레이어 표시용.
// 게스트(로컬 저장)거나 매장이 회원권·쿠폰을 둘 다 안 쓰면 요청하지 않는다(benefits: null, loading: false).
// all: 매장 기능 토글과 무관하게 전부 — 고객 삭제 창처럼 "삭제하면 취소되는 것"을 빠짐없이 보여야 할 때.
// customerId 가 없으면 요청하지 않는다(삭제 창이 열릴 때만 받는 식으로 쓴다).
// 레이어를 열 때마다 새로 받는다 — 발급·사용은 설정 화면에서 일어나 여기서 캐시를 맞출 길이 없다.
export function useCustomerBenefits(customerId: number | undefined, options?: {all?: boolean}) {
    const all = options?.all ?? false;
    const featureOn = useCalendarStore((s) => s.useMembershipSystem || s.useCouponSystem);
    const enabled = !!customerId && (all || featureOn) && !shouldUseLocalDb();
    const [loaded, setLoaded] = useState<{key: string; benefits: CustomerBenefits | null} | null>(null);
    const key = `${customerId}:${all}`;

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        fetch(`/api/customer-benefits?customerId=${customerId}${all ? '&all=1' : ''}`)
            .then((res) => (res.ok ? res.json() as Promise<CustomerBenefits> : null))
            // 표시용 부가 정보라 실패해도 레이어는 그대로 쓴다(행만 안 보임).
            .catch(() => null)
            .then((benefits) => {
                if (!cancelled) setLoaded({key, benefits});
            });
        return () => { cancelled = true; };
    }, [enabled, customerId, all, key]);

    const current = loaded?.key === key ? loaded : null;
    return {benefits: current?.benefits ?? null, loading: enabled && !current};
}
