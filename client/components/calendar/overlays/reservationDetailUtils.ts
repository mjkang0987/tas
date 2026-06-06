import type {PaymentEntry, Reservation, ReservationHistoryEntry} from '../../../utils/reservations';
import {formatPrice, parseServiceString, sumPrice} from '../../../utils/services';
import type {ReservationDetailFormState} from './ReservationDetailSections';
import type {PaymentEntryDraft, ReservationDiffItem} from './reservationDetailTypes';

const FIELD_LABELS: Record<keyof ReservationDetailFormState, string> = {
    service: '서비스',
    designerId: '디자이너',
    date: '날짜',
    startTime: '시작시간',
    endTime: '종료시간',
    price: '가격',
    memo: '요청사항',
    channel: '예약경로'
};

export function getPaymentEntries(reservation: Reservation): PaymentEntry[] {
    if (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0) {
        return reservation.paymentEntries;
    }

    if (reservation.paymentCompleted && reservation.paymentMethod) {
        return [{
            method: reservation.paymentMethod,
            amount: reservation.price ?? 0,
        }];
    }

    return [];
}

export function formatPaymentEntries(entries: PaymentEntry[]): string[] {
    if (entries.length === 0) return ['미입력'];
    return entries.map((entry) => `${entry.method} · ${formatPrice(entry.amount)}`);
}

export function getPointAmount(entries: PaymentEntry[]): number {
    return entries
        .filter((entry) => entry.method === '적립금')
        .reduce((sum, entry) => sum + entry.amount, 0);
}

export function getPaymentEntryDrafts(
    reservation: Reservation,
    fallbackAmount: number,
    naverDeposit: number = 0,
): PaymentEntryDraft[] {
    const entries = getPaymentEntries(reservation);
    if (entries.length > 0) {
        return entries.map((entry) => ({method: entry.method, amount: String(entry.amount)}));
    }

    if (naverDeposit > 0) {
        const remainder = fallbackAmount - naverDeposit;
        const drafts: PaymentEntryDraft[] = [{method: '네이버 예약금', amount: String(naverDeposit)}];
        if (remainder > 0) {
            drafts.push({method: '', amount: String(remainder)});
        }
        return drafts;
    }

    return [{method: '', amount: String(fallbackAmount)}];
}

export function getChangedFields(
    before: Reservation,
    after: ReservationDetailFormState,
    designerNameMap: Record<number, string>
) {
    const fields: ReservationDiffItem[] = [];
    const beforePrice = before.price ?? sumPrice(parseServiceString(before.service));

    (Object.keys(FIELD_LABELS) as (keyof ReservationDetailFormState)[]).forEach((key) => {
        if (key === 'designerId') {
            const beforeDesignerId = before.designerId ?? 0;
            if (beforeDesignerId !== after.designerId) {
                fields.push({
                    label: FIELD_LABELS[key],
                    before: designerNameMap[beforeDesignerId] ?? '미지정',
                    after: designerNameMap[after.designerId] ?? '미지정'
                });
            }
        } else if (key === 'price') {
            if (beforePrice !== after.price) {
                fields.push({
                    label: FIELD_LABELS[key],
                    before: formatPrice(beforePrice),
                    after: formatPrice(after.price)
                });
            }
        } else if ((before[key] ?? '') !== (after[key] ?? '')) {
            fields.push({
                label: FIELD_LABELS[key],
                before: before[key] as string,
                after: after[key] as string
            });
        }
    });

    return fields;
}

export function getHistoryDiffs(entry: ReservationHistoryEntry, designerNameMap: Record<number, string>) {
    const diffs: ReservationDiffItem[] = [];

    if (entry.after.status === 'cancelled' && entry.before.status !== 'cancelled') {
        diffs.push({label: '상태', before: '예약', after: '예약취소'});
        return diffs;
    }

    if (entry.after.status === 'noshow' && entry.before.status !== 'noshow') {
        diffs.push({label: '상태', before: '예약', after: '노쇼'});
        return diffs;
    }

    if (entry.after.status === 'completed' && entry.before.status !== 'completed') {
        diffs.push({label: '상태', before: '예약', after: '완료'});
        return diffs;
    }

    if (entry.after.status === 'active' && (entry.before.status === 'cancelled' || entry.before.status === 'noshow')) {
        const beforeLabel = entry.before.status === 'cancelled' ? '예약취소' : '노쇼';
        diffs.push({label: '상태', before: beforeLabel, after: '예약'});
        return diffs;
    }

    if ((entry.before.paymentCompleted ?? false) !== (entry.after.paymentCompleted ?? false)) {
        diffs.push({
            label: '결제상태',
            before: entry.before.paymentCompleted ? '결제완료' : '미결제',
            after: entry.after.paymentCompleted ? '결제완료' : '미결제'
        });
    }

    const beforePaymentLines = formatPaymentEntries(getPaymentEntries(entry.before)).join(', ');
    const afterPaymentLines = formatPaymentEntries(getPaymentEntries(entry.after)).join(', ');

    if (beforePaymentLines !== afterPaymentLines) {
        diffs.push({
            label: '결제수단',
            before: beforePaymentLines,
            after: afterPaymentLines
        });
    }

    (Object.keys(FIELD_LABELS) as (keyof ReservationDetailFormState)[]).forEach((key) => {
        if (key === 'designerId') {
            const beforeDesignerId = entry.before.designerId ?? 0;
            const afterDesignerId = entry.after.designerId ?? 0;
            if (beforeDesignerId !== afterDesignerId) {
                diffs.push({
                    label: FIELD_LABELS[key],
                    before: designerNameMap[beforeDesignerId] ?? '미지정',
                    after: designerNameMap[afterDesignerId] ?? '미지정'
                });
            }
        } else if (key === 'price') {
            const beforePrice = entry.before.price ?? sumPrice(parseServiceString(entry.before.service));
            const afterPrice = entry.after.price ?? sumPrice(parseServiceString(entry.after.service));
            if (beforePrice !== afterPrice) {
                diffs.push({
                    label: FIELD_LABELS[key],
                    before: formatPrice(beforePrice),
                    after: formatPrice(afterPrice)
                });
            }
        } else if ((entry.before[key] ?? '') !== (entry.after[key] ?? '')) {
            diffs.push({
                label: FIELD_LABELS[key],
                before: entry.before[key] as string,
                after: entry.after[key] as string
            });
        }
    });

    return diffs;
}

export function formatTimestamp(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
