import type {PaymentMethod} from '../../../utils/reservations';

export type ReservationDetailMode =
    | 'view'
    | 'editing'
    | 'confirming'
    | 'pastConfirm'
    | 'completing'
    | 'cancelling'
    | 'noshow'
    | 'payment'
    | 'approving'
    | 'rejecting'
    | 'deleting';

export type ReservationDiffItem = {
    label: string;
    before: string;
    after: string;
};

export type PaymentEntryDraft = {
    method: PaymentMethod | '';
    amount: string;
    /** 쿠폰으로 생긴 '할인' 줄이면 그 쿠폰 id — 금액·종류는 쿠폰이 정하므로 직접 고치지 않는다 */
    couponId?: string;
};

export type PointAwardDraft = {
    enabled: boolean;
    amount: string;
};
