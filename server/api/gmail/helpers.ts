import type {PaymentMethod as DbPaymentMethod} from '../../../client/prisma/generated/prisma/client';

const NAVER_PAYMENT_MAP: Record<string, DbPaymentMethod> = {
    '네이버페이 머니': 'naver_pay',
    '네이버페이 포인트': 'naver_pay',
    '네이버페이 카드': 'card',
    '네이버페이': 'naver_pay',
    '카드': 'card',
    '현금': 'cash',
};

export function mapNaverPaymentMethod(str: string): DbPaymentMethod {
    const normalized = str.trim();
    return NAVER_PAYMENT_MAP[normalized] ?? 'naver_pay';
}

export function calcEndTime(startTime: string, totalDurationMin: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const totalMin = h * 60 + m + totalDurationMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export async function getLastNaverSyncTimestamp(_storeId: string): Promise<number> {
    // Always scan from the 1st of the current month.
    // Duplicate emails are handled by the naverBookingId unique constraint (P2002).
    const now = new Date();
    return Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
}
