import React from 'react';

import {StyledActionButton} from './ModalStyles';
import type {ReservationDetailMode} from './reservationDetailTypes';

type ReservationDetailFooterActionsProps = {
    mode: ReservationDetailMode;
    isInactive: boolean;
    paymentCompleted: boolean;
    onOpenCancelling: () => void;
    onOpenNoshow: () => void;
    onOpenPayment: () => void;
    onOpenEditing: () => void;
    onCancelEdit: () => void;
    onConfirmRequest: () => void;
    onConfirmSave: () => void;
    onCancelReservation: () => void;
    onNoshowReservation: () => void;
    onPaymentSave: () => void;
    onBackToEditing: () => void;
    onBackToView: () => void;
};

export function ReservationDetailFooterActions({
    mode,
    isInactive,
    paymentCompleted,
    onOpenCancelling,
    onOpenNoshow,
    onOpenPayment,
    onOpenEditing,
    onCancelEdit,
    onConfirmRequest,
    onConfirmSave,
    onCancelReservation,
    onNoshowReservation,
    onPaymentSave,
    onBackToEditing,
    onBackToView,
}: ReservationDetailFooterActionsProps) {
    if (mode === 'view') {
        if (isInactive) return null;

        return (
            <>
                <StyledActionButton type="button" $danger onClick={onOpenCancelling}>예약취소</StyledActionButton>
                <StyledActionButton type="button" $warning onClick={onOpenNoshow}>노쇼</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={onOpenPayment}>
                    {paymentCompleted ? '결제수단 변경' : '결제완료'}
                </StyledActionButton>
                <StyledActionButton type="button" $primary onClick={onOpenEditing}>수정</StyledActionButton>
            </>
        );
    }

    if (mode === 'editing') {
        return (
            <>
                <StyledActionButton type="button" onClick={onCancelEdit}>취소</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={onConfirmRequest}>저장</StyledActionButton>
            </>
        );
    }

    if (mode === 'confirming') {
        return (
            <>
                <StyledActionButton type="button" onClick={onBackToEditing}>돌아가기</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={onConfirmSave}>확인</StyledActionButton>
            </>
        );
    }

    if (mode === 'noChanges') {
        return <StyledActionButton type="button" $primary onClick={onBackToEditing}>확인</StyledActionButton>;
    }

    if (mode === 'pastConfirm') {
        return (
            <>
                <StyledActionButton type="button" onClick={onBackToEditing}>아니오</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={onConfirmSave}>네</StyledActionButton>
            </>
        );
    }

    if (mode === 'cancelling') {
        return (
            <>
                <StyledActionButton type="button" onClick={onBackToView}>돌아가기</StyledActionButton>
                <StyledActionButton type="button" $danger onClick={onCancelReservation}>예약취소</StyledActionButton>
            </>
        );
    }

    if (mode === 'noshow') {
        return (
            <>
                <StyledActionButton type="button" onClick={onBackToView}>돌아가기</StyledActionButton>
                <StyledActionButton type="button" $warning onClick={onNoshowReservation}>노쇼 처리</StyledActionButton>
            </>
        );
    }

    if (mode === 'payment') {
        return (
            <>
                <StyledActionButton type="button" onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={onPaymentSave}>결제 저장</StyledActionButton>
            </>
        );
    }

    return null;
}
