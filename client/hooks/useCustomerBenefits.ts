import {useEffect, useState} from 'react';

import {useCalendarStore} from '../store/calendarStore';
import {shouldUseLocalDb} from '../lib/local-db';
import type {CustomerBenefits} from '../features/customers/benefits';

// 고객 한 명이 쓸 수 있는 회원권·쿠폰. 예약 상세·고객정보 레이어 표시용.
// 게스트(로컬 저장)거나 매장이 회원권·쿠폰을 둘 다 안 쓰면 요청하지 않는다(null).
// 레이어를 열 때마다 새로 받는다 — 발급·사용은 설정 화면에서 일어나 여기서 캐시를 맞출 길이 없다.
export function useCustomerBenefits(customerId: number | undefined): CustomerBenefits | null {
    const enabled = useCalendarStore((s) => s.useMembershipSystem || s.useCouponSystem);
    const [loaded, setLoaded] = useState<{customerId: number; benefits: CustomerBenefits} | null>(null);

    useEffect(() => {
        if (!enabled || !customerId || shouldUseLocalDb()) return;
        let cancelled = false;
        fetch(`/api/customer-benefits?customerId=${customerId}`)
            .then((res) => (res.ok ? res.json() as Promise<CustomerBenefits> : null))
            .then((benefits) => {
                if (!cancelled && benefits) setLoaded({customerId, benefits});
            })
            // 표시용 부가 정보라 실패해도 레이어는 그대로 쓴다(행만 안 보임).
            .catch(() => {});
        return () => { cancelled = true; };
    }, [enabled, customerId]);

    return loaded && loaded.customerId === customerId ? loaded.benefits : null;
}
