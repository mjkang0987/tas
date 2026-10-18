// 예약 밖에서 받은 돈 — 회원권 판매·적립금 충전. 받은 날 매출로 잡는다(지시자 2026-10-16, 방법 3).
// 쓸 때(결제 '회원권'·'적립금')는 이미 받은 돈이라 예약 매출에서 뺀다(features/reservations NON_REVENUE_PAYMENT_METHODS).

import type {Customer} from '../customers/model';
import type {CustomerMembership} from '../memberships/model';
import type {PaymentMethod} from '../reservations/model';
import {toLocalDateKey} from '../reservations/model';

export type StoreSaleKind = 'membership' | 'recharge';

export interface StoreSale {
    dateKey: string; // 받은 날(한국 날짜)
    amount: number;
    method: PaymentMethod | null; // 예전 앱이 결제수단 없이 판매하면 null
    kind: StoreSaleKind;
    customerId: number;
    label: string;
}

/**
 * 회원권 판매(판매 금액이 있는 것 — 기존 등록은 매출 없음)와 적립금 충전(받은 금액이 기록된 것 — 예전 충전은 모름)을 모은다.
 * 판매는 취소돼도 남긴다 — 받은 돈이고, 고객 삭제(익명 처리)도 남은 회원권을 취소하므로 빼면 지난 매출이 사라진다.
 */
export function buildStoreSales(customers: Customer[], memberships: CustomerMembership[]): StoreSale[] {
    const sales: StoreSale[] = [];
    for (const membership of memberships) {
        if (membership.salePrice == null || membership.salePrice <= 0) continue;
        sales.push({
            dateKey: toLocalDateKey(membership.issuedAt),
            amount: membership.salePrice,
            method: membership.salePaymentMethod ?? null,
            kind: 'membership',
            customerId: membership.customerId,
            label: `회원권 판매 · ${membership.name}`,
        });
    }
    for (const customer of customers) {
        for (const history of customer.pointHistories ?? []) {
            if (history.type !== 'recharge' || history.paidAmount == null || history.paidAmount <= 0) continue;
            sales.push({
                dateKey: toLocalDateKey(history.createdAt),
                amount: history.paidAmount,
                method: history.paymentMethod ?? null,
                kind: 'recharge',
                customerId: customer.id,
                label: '적립금 충전',
            });
        }
    }
    return sales;
}

interface DayTotal {
    dateKey: string;
    total: number;
    count: number;
}

/**
 * 예약 매출 결과에 기간 안 판매분을 더한다(일별 합계·전체 합계, 결제수단 분포·받은 돈 합계).
 * 건수(count)는 예약 수라 더하지 않는다. 판매가 있는 날이 목록에 없으면 0건으로 끼워 넣는다.
 */
export function addSalesToRevenue<D extends DayTotal>(
    days: D[],
    payments: Array<{method: PaymentMethod; total: number}>,
    sales: StoreSale[],
    startDateKey: string,
    endDateKey: string,
    makeDay: (dateKey: string) => D,
): {days: D[]; payments: Array<{method: PaymentMethod; total: number}>; salesTotal: number; paidSalesTotal: number} {
    const inRange = sales.filter((sale) => sale.dateKey >= startDateKey && sale.dateKey <= endDateKey);
    const byDate = new Map<string, number>();
    const byMethod = new Map<PaymentMethod, number>();
    let salesTotal = 0;
    let paidSalesTotal = 0;
    for (const sale of inRange) {
        byDate.set(sale.dateKey, (byDate.get(sale.dateKey) ?? 0) + sale.amount);
        salesTotal += sale.amount;
        if (sale.method) {
            byMethod.set(sale.method, (byMethod.get(sale.method) ?? 0) + sale.amount);
            paidSalesTotal += sale.amount;
        }
    }

    const nextDays = days.map((day) => (byDate.has(day.dateKey) ? {...day, total: day.total + byDate.get(day.dateKey)!} : day));
    for (const [dateKey, amount] of byDate) {
        if (!days.some((day) => day.dateKey === dateKey)) nextDays.push({...makeDay(dateKey), total: amount});
    }
    nextDays.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const paymentMap = new Map(payments.map((entry) => [entry.method, entry.total]));
    for (const [method, amount] of byMethod) paymentMap.set(method, (paymentMap.get(method) ?? 0) + amount);
    const nextPayments = [...paymentMap.entries()]
        .map(([method, total]) => ({method, total}))
        .sort((a, b) => b.total - a.total);

    return {days: nextDays, payments: nextPayments, salesTotal, paidSalesTotal};
}
