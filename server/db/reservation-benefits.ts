import {prisma} from './prisma';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * 예약이 취소·삭제될 때 그 예약 결제에 쓴 쿠폰·회원권을 돌려준다(지시자 2026-10-19 — "예약취소 시 돌려주는게 맞지").
 * 적립금은 고객 잔액을 화면이 관리하므로 화면(store)에서 돌려준다.
 *
 * - 쿠폰: 다시 쓸 수 있게(active). 만료여도 되돌린다(되살아나도 못 쓴다). 고객당 1장 쿠폰을 이미 따로 보유 중이면
 *   두 장이 되므로 연결만 풀고 사용됨으로 둔다.
 * - 회원권: 그 예약에 연결된 사용 기록을 풀고 깎은 횟수만큼 돌려준다(최대 횟수까지). 취소된 회원권은 연결만 푼다.
 */
export async function releaseReservationBenefits(tx: Tx, storeId: string, reservationId: string): Promise<void> {
    const coupons = await tx.customerCoupon.findMany({
        where: {storeId, reservationId, status: 'used'},
        select: {id: true, customerId: true, productId: true, product: {select: {oncePerCustomer: true}}},
    });
    for (const coupon of coupons) {
        const held = coupon.product?.oncePerCustomer && coupon.productId
            ? await tx.customerCoupon.count({where: {storeId, customerId: coupon.customerId, productId: coupon.productId, status: 'active'}})
            : 0;
        await tx.customerCoupon.update({
            where: {id: coupon.id},
            data: held > 0 ? {reservationId: null} : {status: 'active', usedAt: null, reservationId: null},
        });
    }

    const usages = await tx.membershipUsage.findMany({
        where: {reservationId, type: 'use', customerMembership: {storeId}},
        select: {id: true, delta: true, customerMembershipId: true},
    });
    for (const usage of usages) {
        await tx.membershipUsage.update({where: {id: usage.id}, data: {reservationId: null}});
        const m = await tx.customerMembership.findUnique({
            where: {id: usage.customerMembershipId},
            select: {status: true, totalCount: true, remainingCount: true},
        });
        if (!m || m.status === 'cancelled') continue;
        const back = -usage.delta; // 사용은 -1(무제한은 0)
        const next = m.remainingCount == null || m.totalCount == null ? null : Math.min(m.remainingCount + back, m.totalCount);
        if (next != null && next !== m.remainingCount) {
            await tx.customerMembership.update({where: {id: usage.customerMembershipId}, data: {remainingCount: next, status: 'active'}});
        }
        await tx.membershipUsage.create({
            data: {customerMembershipId: usage.customerMembershipId, delta: next == null ? 0 : next - m.remainingCount!, type: 'refund', memo: '예약 취소 복원'},
        });
    }
}
