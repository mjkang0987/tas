import {prisma} from './prisma';
import type {PointHistoryEntry} from '../../client/features/customers/model';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export interface PointRefund {
    customerId: number; // 프론트 고객 번호
    balance: number;
    history: PointHistoryEntry;
}

/**
 * 예약이 취소·삭제될 때 그 예약 결제에 쓴 쿠폰·회원권·적립금을 돌려준다(지시자 2026-10-19 — "예약취소 시 돌려주는게 맞지").
 * 취소·삭제와 **같은 트랜잭션**에서 한다 — 화면이 따로 돌려주면 요청이 실패·경합할 때 두 번 돌려주거나 잃었다.
 *
 * - 적립금: 결제에 쓴 적립금은 돌려주고, 그 결제로 쌓인 적립금은 회수한다(0 아래로는 안 내려감). 잔액은 더하기로 바꾼다
 *   (절대값으로 쓰면 동시에 들어온 다른 변경을 덮는다).
 * - 쿠폰: 다시 쓸 수 있게(active). 만료여도 되돌린다(되살아나도 못 쓴다). 고객당 1장 쿠폰을 이미 따로(만료 전) 보유 중이면
 *   두 장이 되므로 연결만 풀고 사용됨으로 둔다.
 * - 회원권: 그 예약에 연결된 사용 기록을 풀고 깎은 횟수를 돌려준다(최대 횟수까지). 취소된 회원권은 연결만 푼다.
 * - clearPayment(취소): 결제 기록을 비운다 — 돌려준 뒤에도 결제가 남으면 복원 후 다시 취소할 때 또 돌려줬다.
 *   복원하면 결제 전 예약으로 돌아가 다시 결제한다.
 *
 * 모든 변경은 "아직 그 상태일 때만" 바꾸므로 두 번 불려도(두 탭에서 동시 취소, 취소 후 삭제) 한 번만 돌려준다.
 */
export async function releaseReservationBenefits(
    tx: Tx,
    storeId: string,
    reservationId: string,
    {clearPayment}: {clearPayment: boolean},
): Promise<PointRefund | null> {
    // 같은 예약을 동시에 처리하는 다른 요청이 끝날 때까지 기다린다(그 뒤엔 이미 돌려준 상태를 읽는다).
    await tx.$queryRaw`SELECT id FROM "Reservation" WHERE id = ${reservationId} FOR UPDATE`;

    const reservation = await tx.reservation.findUnique({
        where: {id: reservationId},
        select: {
            pointEarned: true,
            paymentEntries: {select: {method: true, amount: true}},
            customer: {select: {id: true, legacyId: true, deletedAt: true}},
        },
    });
    if (!reservation) return null;

    const coupons = await tx.customerCoupon.findMany({
        where: {storeId, reservationId, status: 'used'},
        select: {id: true, customerId: true, productId: true, product: {select: {oncePerCustomer: true}}},
    });
    const now = new Date();
    for (const coupon of coupons) {
        const held = coupon.product?.oncePerCustomer && coupon.productId
            ? await tx.customerCoupon.count({
                where: {
                    storeId, customerId: coupon.customerId, productId: coupon.productId, status: 'active',
                    OR: [{expiresAt: null}, {expiresAt: {gt: now}}],
                },
            })
            : 0;
        await tx.customerCoupon.updateMany({
            where: {id: coupon.id, status: 'used', reservationId},
            data: held > 0 ? {reservationId: null} : {status: 'active', usedAt: null, reservationId: null},
        });
    }

    const usages = await tx.membershipUsage.findMany({
        where: {reservationId, type: 'use', customerMembership: {storeId}},
        select: {id: true, delta: true, customerMembershipId: true},
    });
    for (const usage of usages) {
        const unlinked = await tx.membershipUsage.updateMany({where: {id: usage.id, reservationId}, data: {reservationId: null}});
        if (unlinked.count === 0) continue;
        const m = await tx.customerMembership.findUnique({
            where: {id: usage.customerMembershipId},
            select: {status: true, totalCount: true, remainingCount: true},
        });
        if (!m || m.status === 'cancelled') continue;
        let given = 0;
        if (usage.delta < 0 && m.totalCount != null && m.remainingCount != null) {
            // 더하기로 — 그 사이 다른 기기의 차감을 덮지 않게. 최대 횟수를 넘지 않을 때만.
            const back = await tx.customerMembership.updateMany({
                where: {id: usage.customerMembershipId, remainingCount: {lt: m.totalCount}},
                data: {remainingCount: {increment: 1}, status: 'active'},
            });
            given = back.count;
        }
        await tx.membershipUsage.create({
            data: {customerMembershipId: usage.customerMembershipId, delta: given, type: 'refund', memo: '예약 취소 복원'},
        });
    }

    // 적립금
    const used = reservation.paymentEntries.filter((entry) => entry.method === 'points').reduce((sum, entry) => sum + entry.amount, 0);
    const delta = used - reservation.pointEarned;
    let refund: PointRefund | null = null;
    if (delta !== 0 && !reservation.customer.deletedAt && reservation.customer.legacyId != null) {
        const updated = await tx.customer.update({
            where: {id: reservation.customer.id},
            data: {points: {increment: delta}},
            select: {points: true},
        });
        const balance = Math.max(updated.points, 0);
        if (updated.points < 0) await tx.customer.update({where: {id: reservation.customer.id}, data: {points: 0}});
        const history = await tx.customerPointHistory.create({
            data: {
                customerId: reservation.customer.id,
                type: 'payment_adjust',
                delta,
                balance,
                description: delta > 0 ? '예약 취소 — 결제에 쓴 적립금 반환' : '예약 취소 — 결제 적립금 회수',
                relatedReservationId: reservationId,
            },
            select: {id: true, createdAt: true},
        });
        refund = {
            customerId: reservation.customer.legacyId,
            balance,
            history: {
                id: history.id,
                type: 'payment_adjust',
                delta,
                balance,
                description: delta > 0 ? '예약 취소 — 결제에 쓴 적립금 반환' : '예약 취소 — 결제 적립금 회수',
                createdAt: history.createdAt.toISOString(),
            },
        };
    }

    if (clearPayment) {
        await tx.reservationPaymentEntry.deleteMany({where: {reservationId}});
        await tx.reservation.update({where: {id: reservationId}, data: {paymentCompleted: false, pointEarned: 0}});
    }

    return refund;
}
