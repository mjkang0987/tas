import type {
    DesignerStatus as DbDesignerStatus,
    PaymentMethod as DbPaymentMethod,
    ReservationChannel as DbReservationChannel,
    ReservationStatus as DbReservationStatus,
} from '@prisma/client';
import type {DesignerStatus} from '../../client/features/designers/model';
import type {Customer, PointHistoryType} from '../../client/features/customers/model';
import type {PaymentMethod, ReservationChannel, Reservation, ReservationHistoryEntry, ReservationStatus} from '../../client/features/reservations/model';

// ── Designer Status ──

const DB_TO_FRONTEND_DESIGNER_STATUS: Record<DbDesignerStatus, DesignerStatus> = {
    active: '재직',
    on_leave: '휴직',
    resigned: '퇴직',
};

const FRONTEND_TO_DB_DESIGNER_STATUS: Record<DesignerStatus, DbDesignerStatus> = {
    '재직': 'active',
    '휴직': 'on_leave',
    '퇴직': 'resigned',
};

export function dbDesignerStatusToFrontend(status: DbDesignerStatus): DesignerStatus {
    return DB_TO_FRONTEND_DESIGNER_STATUS[status];
}

export function frontendDesignerStatusToDb(status: DesignerStatus | undefined): DbDesignerStatus {
    if (!status) return 'active';
    return FRONTEND_TO_DB_DESIGNER_STATUS[status] ?? 'active';
}

// ── Payment Method ──

const DB_TO_FRONTEND_PAYMENT_METHOD: Record<DbPaymentMethod, PaymentMethod> = {
    cash: '현금',
    cash_receipt: '현금+현금영수증',
    card: '카드',
    naver_pay: '네이버페이',
    local_currency: '지역화폐',
    local_currency_receipt: '지역화폐+현금영수증',
    voucher: '상품권',
    points: '적립금',
    discount: '할인',
    naver_deposit: '네이버 예약금',
};

const FRONTEND_TO_DB_PAYMENT_METHOD: Record<string, DbPaymentMethod> = {
    '현금': 'cash',
    '현금+현금영수증': 'cash_receipt',
    '현금영수증': 'cash_receipt',
    '카드': 'card',
    '네이버페이': 'naver_pay',
    '지역화폐': 'local_currency',
    '지역화폐+현금영수증': 'local_currency_receipt',
    '지역화폐(현금영수증)': 'local_currency_receipt',
    '이용권': 'voucher',
    '상품권': 'voucher',
    '적립금': 'points',
    '할인': 'discount',
    '네이버 예약금': 'naver_deposit',
};

export function dbPaymentMethodToFrontend(method: DbPaymentMethod): PaymentMethod {
    return DB_TO_FRONTEND_PAYMENT_METHOD[method];
}

export function frontendPaymentMethodToDb(method: string): DbPaymentMethod {
    return FRONTEND_TO_DB_PAYMENT_METHOD[method] ?? 'cash';
}

// ── Reservation Channel ──

const DB_TO_FRONTEND_CHANNEL: Record<DbReservationChannel, ReservationChannel> = {
    naver: '네이버예약',
    walk_in: '현장방문',
    phone: '전화예약',
};

const FRONTEND_TO_DB_CHANNEL: Record<ReservationChannel, DbReservationChannel> = {
    '네이버예약': 'naver',
    '현장방문': 'walk_in',
    '전화예약': 'phone',
};

export function dbChannelToFrontend(channel: DbReservationChannel): ReservationChannel {
    return DB_TO_FRONTEND_CHANNEL[channel];
}

export function frontendChannelToDb(channel: ReservationChannel): DbReservationChannel {
    return FRONTEND_TO_DB_CHANNEL[channel] ?? 'phone';
}

// ── Reservation Status ──

export function frontendReservationStatusToDb(status: string | undefined): DbReservationStatus {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'noshow') return 'noshow';
    return 'active';
}

// ── Date Helpers ──

function toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ── Row Converters ──

type DbDesignerRow = {
    legacyId: number | null;
    name: string;
    status: DbDesignerStatus;
    phone: string | null;
    note: string | null;
    color: string | null;
    schedules: Array<{
        dayIndex: number;
        enabled: boolean;
        startTime: string;
        endTime: string;
    }>;
};

export function dbDesignerToFrontend(row: DbDesignerRow) {
    const schedule = Array.from({length: 7}, (_, i) => {
        const s = row.schedules.find((sc) => sc.dayIndex === i);
        return {
            enabled: s?.enabled ?? false,
            start: s?.startTime ?? '10:00',
            end: s?.endTime ?? '20:00',
        };
    });

    return {
        id: row.legacyId!,
        name: row.name,
        schedule,
        status: dbDesignerStatusToFrontend(row.status),
        ...(row.phone !== null && {phone: row.phone}),
        ...(row.note !== null && {note: row.note}),
        ...(row.color !== null && {color: row.color}),
    };
}

type DbCustomerRow = {
    legacyId: number | null;
    name: string;
    tel: string;
    points: number;
    firstVisitDate: Date | null;
    allergyNote: string | null;
    claimNote: string | null;
    preferenceNote: string | null;
    memoTags: Array<{ text: string; color: string }>;
    pointHistories: Array<{
        id: string;
        type: string;
        delta: number;
        balance: number;
        description: string;
        createdAt: Date;
        relatedReservation: { legacyId: number | null } | null;
    }>;
};

export function dbCustomerToFrontend(row: DbCustomerRow): Customer {
    return {
        id: row.legacyId!,
        name: row.name,
        tel: row.tel,
        points: row.points,
        firstVisitDate: row.firstVisitDate ? toDateKey(row.firstVisitDate) : null,
        memoTags: row.memoTags.map((t) => ({text: t.text, color: t.color})),
        pointHistories: row.pointHistories.map((h) => ({
            id: h.id,
            type: h.type as PointHistoryType,
            delta: h.delta,
            balance: h.balance,
            description: h.description,
            createdAt: h.createdAt.toISOString(),
            ...(h.relatedReservation?.legacyId != null && {relatedReservationId: h.relatedReservation.legacyId}),
        })),
        ...(row.allergyNote !== null && {allergyNote: row.allergyNote}),
        ...(row.claimNote !== null && {claimNote: row.claimNote}),
        ...(row.preferenceNote !== null && {preferenceNote: row.preferenceNote}),
    };
}

type DbReservationRow = {
    legacyId: number | null;
    date: Date;
    startTime: string;
    endTime: string;
    serviceSummary: string;
    customerId: string;
    designerId: string | null;
    status: DbReservationStatus;
    price: number;
    memo: string | null;
    paymentCompleted: boolean;
    pointEarned: number;
    naverBookingId: string | null;
    naverBookingUrl: string | null;
    naverDeposit: number | null;
    channel: DbReservationChannel;
    paymentEntries: Array<{
        method: DbPaymentMethod;
        amount: number;
    }>;
    customer: { legacyId: number | null };
    designer: { legacyId: number | null } | null;
};

export function dbReservationToFrontend(row: DbReservationRow): Reservation {
    return {
        id: row.legacyId!,
        date: toDateKey(row.date),
        startTime: row.startTime,
        endTime: row.endTime,
        service: row.serviceSummary,
        customerId: row.customer.legacyId!,
        ...(row.designer?.legacyId != null && {designerId: row.designer.legacyId}),
        status: row.status as ReservationStatus,
        price: row.price,
        ...(row.memo !== null && {memo: row.memo}),
        paymentCompleted: row.paymentCompleted,
        paymentEntries: row.paymentEntries.map((e) => ({
            method: dbPaymentMethodToFrontend(e.method),
            amount: e.amount,
        })),
        pointEarned: row.pointEarned,
        ...(row.naverBookingId != null && {naverBookingId: row.naverBookingId}),
        ...(row.naverBookingUrl != null && {naverBookingUrl: row.naverBookingUrl}),
        ...(row.naverDeposit != null && {naverDeposit: row.naverDeposit}),
        channel: dbChannelToFrontend(row.channel),
    };
}

type DbHistoryRow = {
    reservationId: string;
    beforeJson: unknown;
    afterJson: unknown;
    createdAt: Date;
    reservation: { legacyId: number | null };
};

export function dbHistoryToFrontend(row: DbHistoryRow): ReservationHistoryEntry {
    return {
        reservationId: row.reservation.legacyId!,
        before: row.beforeJson as Reservation,
        after: row.afterJson as Reservation,
        timestamp: row.createdAt.toISOString(),
    };
}

type DbServiceRow = {
    name: string;
    category: string;
    duration: number;
    price: number;
};

export function dbServiceToFrontend(row: DbServiceRow) {
    return {
        name: row.name,
        durationMinutes: row.duration,
        category: row.category,
        price: row.price,
    };
}

type DbStoreData = {
    businessHours: Array<{ dayIndex: number; openTime: string; closeTime: string; enabled: boolean }>;
    closedDates: Array<{ date: Date }>;
    pointSettings: {
        enableServiceRate: boolean;
        enableRecharge: boolean;
        serviceRate: number;
        rechargeRulesJson: unknown;
    } | null;
};

export function dbStoreToFrontend(data: DbStoreData) {
    const firstHour = data.businessHours[0];
    return {
        businessHours: {
            start: firstHour?.openTime ?? '10:00',
            end: firstHour?.closeTime ?? '20:00',
        },
        closedDates: data.closedDates.map((cd) => toDateKey(cd.date)),
        pointSettings: {
            enableServiceRate: data.pointSettings?.enableServiceRate ?? false,
            enableRecharge: data.pointSettings?.enableRecharge ?? false,
            serviceRate: data.pointSettings?.serviceRate ?? 0,
            rechargeRules: (data.pointSettings?.rechargeRulesJson as Array<{ baseAmount: number; bonusAmount: number }>) ?? [],
        },
    };
}
