import type {PaymentMethod} from '../../../utils/reservations';

export type ReservationDetailMode =
    | 'view'
    | 'editing'
    | 'confirming'
    | 'pastConfirm'
    | 'completing'
    | 'cancelling'
    | 'noshow'
    | 'payment';

export type ReservationDiffItem = {
    label: string;
    before: string;
    after: string;
};

export type PaymentEntryDraft = {
    method: PaymentMethod | '';
    amount: string;
};

export type PointAwardDraft = {
    enabled: boolean;
    amount: string;
};
