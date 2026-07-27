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

export function buildRevenueLinePath(values: number[], width: number, height: number): {linePath: string; areaPath: string} {
    if (values.length === 0) return {linePath: '', areaPath: ''};
    const max = Math.max(...values, 1);
    if (values.length === 1) {
        const y = height - (values[0] / max) * height;
        return {
            linePath: `M 0 ${y} L ${width} ${y}`,
            areaPath: `M 0 ${y} L ${width} ${y} L ${width} ${height} L 0 ${height} Z`,
        };
    }
    const stepX = width / (values.length - 1);
    const points = values.map((value, index) => ({
        x: index * stepX,
        y: height - (value / max) * height,
    }));
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    return {linePath, areaPath};
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
