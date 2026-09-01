import type {PaymentMethod} from '../../../utils/reservations';
import {toDateKey} from '../../../utils/reservations';

export const CHANNEL_ORDER = ['전화예약', '현장방문', '네이버예약', '온라인예약'] as const;

export const CHANNEL_COLORS: Record<string, string> = {'전화예약': '#FB8C00', '현장방문': '#4285F4', '네이버예약': '#2DB400', '온라인예약': '#7C3AED'};

export const PAYMENT_METHOD_COLORS = ['#2D7FF9', '#00A896', '#FB8C00', '#E85D75', '#7E57C2', '#4C6EF5', '#8E8E93', '#34A853'] as const;

export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ['현금', '현금+현금영수증', '카드', '네이버페이', '지역화폐', '지역화폐+현금영수증', '상품권', '적립금'];

export function shiftDateKey(dateKey: string, days: number): string {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDiffDays(fromDateKey: string, toDateKeyValue: string): number {
    const from = new Date(`${fromDateKey}T00:00:00`);
    const to = new Date(`${toDateKeyValue}T00:00:00`);
    return Math.max(Math.round((to.getTime() - from.getTime()) / 86400000), 0);
}

/**
 * 매출 기간 상한 — 시작~종료 간격(일). 365면 윤년을 포함한 만 1년이 들어간다.
 * 차트만이 아니라 KPI·일별 목록·엑셀 내보내기가 같은 기간을 쓰므로, 연간 정산을 막지 않는 선이 하한선이다.
 */
export const REVENUE_MAX_RANGE_DAYS = 365;

/** 상한을 넘는 기간을 최근 쪽으로 자른다 — 끝을 남기고 시작을 당긴다. */
export function clampRevenueRange(startDateKey: string, endDateKey: string): {startDateKey: string; endDateKey: string} {
    const ascending = startDateKey <= endDateKey;
    const [from, to] = ascending ? [startDateKey, endDateKey] : [endDateKey, startDateKey];
    if (getDiffDays(from, to) <= REVENUE_MAX_RANGE_DAYS) return {startDateKey, endDateKey};

    const clamped = shiftDateKey(to, -REVENUE_MAX_RANGE_DAYS);
    return ascending ? {startDateKey: clamped, endDateKey} : {startDateKey, endDateKey: clamped};
}

export function buildPaymentDonutGradient(colors: string[], totals: number[]): string {
    const sum = totals.reduce((acc, value) => acc + value, 0);
    if (sum <= 0 || colors.length === 0) return 'conic-gradient(#E5E7EB 0deg 360deg)';
    let angle = 0;
    const segments = totals.map((total, index) => {
        const start = angle;
        angle += (total / sum) * 360;
        return `${colors[index]} ${start}deg ${angle}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
}
