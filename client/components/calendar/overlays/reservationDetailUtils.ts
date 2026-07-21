import type {PaymentEntry, PaymentMethod, Reservation, ReservationHistoryEntry} from '../../../utils/reservations';
import {formatPrice, parseServiceString, sumPrice} from '../../../utils/services';
import type {ReservationDetailFormState} from './ReservationDetailSections';
import type {ReservationDetailMode} from './reservationDetailTypes';
import type {PaymentEntryDraft, ReservationDiffItem} from './reservationDetailTypes';
import {getStoreLabels} from '../../../features/store-settings/labels';
import {useCalendarStore} from '../../../store/calendarStore';

// 업종 라벨을 호출 시점(lazy)에 계산해 필드 라벨 맵을 만든다. (모듈 최상위에서 계산 금지)
function getFieldLabels(): Record<keyof ReservationDetailFormState, string> {
    const labels = getStoreLabels(useCalendarStore.getState().shopType);
    return {
        service: labels.service,
        assigneeId: labels.assignee,
        date: '날짜',
        startTime: '시작시간',
        endTime: '종료시간',
        price: '가격',
        memo: '요청사항',
        channel: '예약경로'
    };
}

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
    assigneeNameMap: Record<number, string>
) {
    const fields: ReservationDiffItem[] = [];
    const beforePrice = before.price ?? sumPrice(parseServiceString(before.service));
    const FIELD_LABELS = getFieldLabels();

    (Object.keys(FIELD_LABELS) as (keyof ReservationDetailFormState)[]).forEach((key) => {
        if (key === 'assigneeId') {
            const beforeAssigneeId = before.assigneeId ?? 0;
            if (beforeAssigneeId !== after.assigneeId) {
                fields.push({
                    label: FIELD_LABELS[key],
                    before: assigneeNameMap[beforeAssigneeId] ?? '미지정',
                    after: assigneeNameMap[after.assigneeId] ?? '미지정'
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

export function getHistoryDiffs(entry: ReservationHistoryEntry, assigneeNameMap: Record<number, string>) {
    const diffs: ReservationDiffItem[] = [];
    const FIELD_LABELS = getFieldLabels();

    if (entry.after.status === 'cancelled' && entry.before.status !== 'cancelled') {
        diffs.push({label: '상태', before: '예약', after: '취소'});
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
        const beforeLabel = entry.before.status === 'cancelled' ? '취소' : '노쇼';
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
        if (key === 'assigneeId') {
            const beforeAssigneeId = entry.before.assigneeId ?? 0;
            const afterAssigneeId = entry.after.assigneeId ?? 0;
            if (beforeAssigneeId !== afterAssigneeId) {
                diffs.push({
                    label: FIELD_LABELS[key],
                    before: assigneeNameMap[beforeAssigneeId] ?? '미지정',
                    after: assigneeNameMap[afterAssigneeId] ?? '미지정'
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

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['현금', '현금+현금영수증', '카드', '네이버페이', '네이버 예약금', '지역화폐', '지역화폐+현금영수증', '상품권', '적립금', '할인'];

export const MODE_LABELS: Partial<Record<ReservationDetailMode, string>> = {
    editing: '예약 수정',
    confirming: '변경 확인',
    pastConfirm: '변경 확인',
    completing: '예약 완료',
    cancelling: '예약 취소',
    noshow: '노쇼 처리',
    payment: '결제 처리',
    rejecting: '예약 거절',
};

export function resolveReservationPrice(reservation: Reservation): number {
    return reservation.price ?? sumPrice(parseServiceString(reservation.service));
}

export function buildReservationFormState(reservation: Reservation): ReservationDetailFormState {
    return {
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        service: reservation.service,
        assigneeId: reservation.assigneeId ?? 0,
        price: resolveReservationPrice(reservation),
        memo: reservation.memo ?? '',
        channel: reservation.channel ?? '전화예약',
    };
}

export function buildDraftReservation(reservation: Reservation, form: ReservationDetailFormState): Reservation {
    return {
        ...reservation,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        service: form.service,
        price: form.price,
        memo: form.memo,
        ...(form.assigneeId ? {assigneeId: form.assigneeId} : {assigneeId: undefined}),
    };
}

export function buildSyncedPaidReservation(reservation: Reservation, nextReservation: Reservation): Reservation {
    const paymentEntries = getPaymentEntries(reservation);

    if (paymentEntries.length === 1) {
        return {
            ...nextReservation,
            paymentEntries: [{
                ...paymentEntries[0],
                amount: nextReservation.price ?? 0,
            }],
            paymentMethod: paymentEntries[0].method,
            paymentCompleted: true,
        };
    }

    if (paymentEntries.length === 0 && reservation.paymentCompleted && reservation.paymentMethod) {
        return {
            ...nextReservation,
            paymentEntries: [{
                method: reservation.paymentMethod,
                amount: nextReservation.price ?? 0,
            }],
            paymentMethod: reservation.paymentMethod,
            paymentCompleted: true,
        };
    }

    return nextReservation;
}

