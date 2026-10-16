import {prisma} from './prisma';
import type {CustomerBenefits} from '../../client/features/customers/benefits';

// 고객이 지금 쓸 수 있는 회원권·쿠폰. 매장 화면(`/api/customer-benefits`)과 고객 예약 관리 페이지가 같이 쓴다.
// - 회원권: active · 남은 횟수 있음(무제한 포함) · 만료 전
// - 쿠폰: active · 만료 전 (만료를 status 로 바꾸는 작업이 없어 만료일로도 거른다)
// 매장이 그 기능을 꺼 두었으면 그 종류는 내지 않는다.
// customerId 는 DB id(cuid)다 — 프론트 id(legacyId)가 아니다.
export async function loadCustomerBenefits(
    store: {id: string; useMembershipSystem: boolean; useCouponSystem: boolean},
    customerId: string,
    now: Date,
): Promise<CustomerBenefits> {
    const notExpired = {OR: [{expiresAt: null}, {expiresAt: {gt: now}}]};
    const [memberships, coupons] = await Promise.all([
        store.useMembershipSystem
            ? prisma.customerMembership.findMany({
                where: {
                    storeId: store.id, customerId, status: 'active',
                    AND: [notExpired, {OR: [{remainingCount: null}, {remainingCount: {gt: 0}}]}],
                },
                select: {id: true, name: true, totalCount: true, remainingCount: true, expiresAt: true},
                orderBy: {issuedAt: 'asc'},
            })
            : [],
        store.useCouponSystem
            ? prisma.customerCoupon.findMany({
                where: {storeId: store.id, customerId, status: 'active', ...notExpired},
                select: {id: true, name: true, discountType: true, discountValue: true, maxDiscount: true, minOrderAmount: true, expiresAt: true},
                orderBy: {issuedAt: 'asc'},
            })
            : [],
    ]);
    return {
        memberships: memberships.map((m) => ({...m, expiresAt: m.expiresAt?.toISOString() ?? null})),
        coupons: coupons.map((c) => ({
            ...c,
            discountType: c.discountType === 'rate' ? 'rate' : 'amount',
            expiresAt: c.expiresAt?.toISOString() ?? null,
        })),
    };
}
