import * as XLSX from 'xlsx';

import type {Reservation, ReservationMap} from './reservations';
import type {CustomerMap} from './customers';
import type {Designer} from './designers';
import type {RevenueFilterMode} from './revenue';
import {isRevenueReservationTarget} from './revenue';
import {parseServiceString, sumPrice} from './services';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const STATUS_LABELS: Record<string, string> = {
    active: '예약',
    completed: '완료',
    cancelled: '취소',
    noshow: '노쇼',
};

function resolvePrice(service: string, price?: number): number {
    if (price != null) return price;
    return sumPrice(parseServiceString(service));
}

function formatPayment(reservation: Reservation): string {
    if (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0) {
        return reservation.paymentEntries
            .map((e) => `${e.method} ${e.amount.toLocaleString('ko-KR')}원`)
            .join(', ');
    }
    if (reservation.paymentMethod) {
        return reservation.paymentMethod;
    }
    return '';
}

interface ExportParams {
    reservationMap: ReservationMap;
    customerMap: CustomerMap;
    designers: Designer[];
    startDateKey: string;
    endDateKey: string;
    designerId: number | null;
    filterMode: RevenueFilterMode;
}

export function exportRevenueToExcel({
    reservationMap,
    customerMap,
    designers,
    startDateKey,
    endDateKey,
    designerId,
    filterMode,
}: ExportParams): void {
    const designerMap = new Map(designers.map((d) => [d.id, d.name]));

    const rows: Record<string, string | number>[] = [];

    const dateKeys = Object.keys(reservationMap)
        .filter((key) => key >= startDateKey && key <= endDateKey)
        .sort((a, b) => b.localeCompare(a));

    for (const dateKey of dateKeys) {
        const reservations = reservationMap[dateKey] ?? [];

        for (const r of reservations) {
            if (!isRevenueReservationTarget(r, designerId, filterMode)) continue;

            const date = new Date(`${r.date}T00:00:00`);
            const weekday = WEEKDAYS[date.getDay()];
            const customer = customerMap[r.customerId];

            rows.push({
                '날짜': r.date,
                '요일': weekday,
                '시간': `${r.startTime}~${r.endTime}`,
                '고객명': customer?.name ?? '',
                '서비스': r.service,
                '디자이너': r.designerId != null ? (designerMap.get(r.designerId) ?? '') : '',
                '금액': resolvePrice(r.service, r.price),
                '결제수단': formatPayment(r),
                '상태': STATUS_LABELS[r.status ?? 'active'] ?? r.status ?? '',
                '예약경로': r.channel ?? '',
            });
        }
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 12},  // 날짜
        {wch: 4},   // 요일
        {wch: 13},  // 시간
        {wch: 10},  // 고객명
        {wch: 20},  // 서비스
        {wch: 10},  // 디자이너
        {wch: 12},  // 금액
        {wch: 20},  // 결제수단
        {wch: 6},   // 상태
        {wch: 10},  // 채널
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '매출');

    const filename = `매출_${startDateKey}_${endDateKey}.xlsx`;
    XLSX.writeFile(wb, filename);
}
