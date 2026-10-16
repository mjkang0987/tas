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
    /** 회원권으로 낸 '회원권' 줄이면 그 회원권 id — 종류는 고정, 금액은 고칠 수 있다(추가 시술분을 따로 받을 때) */
    membershipId?: string;
};

export type PointAwardDraft = {
    enabled: boolean;
    amount: string;
};
