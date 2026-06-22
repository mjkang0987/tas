import React from 'react';

import {StyledActionButton} from './ModalStyles';
import type {ReservationDetailMode} from './reservationDetailTypes';

type ReservationDetailFooterActionsProps = {
    mode: ReservationDetailMode;
    isInactive: boolean;
    isCompleted: boolean;
    paymentCompleted: boolean;
    isNaverBooking: boolean;
    canDelete: boolean;
    onOpenCompleting: () => void;
    onOpenCancelling: () => void;
    onOpenNoshow: () => void;
    onOpenPayment: () => void;
    onOpenEditing: () => void;
    onCancelEdit: () => void;
    onConfirmRequest: () => void;
    onConfirmSave: () => void;
    onCancelReservation: () => void;
    onNoshowReservation: () => void;
    onOpenRestoring: () => void;
    onRestoreReservation: () => void;
    onOpenDeleting: () => void;
    onDeleteReservation: () => void;
    onPaymentSave: () => void;
    onBackToEditing: () => void;
    onBackToView: () => void;
};

export function ReservationDetailFooterActions({
                                                   mode,
                                                   isInactive,
                                                   isCompleted,
                                                   paymentCompleted,
                                                   isNaverBooking,
                                                   canDelete,
                                                   onOpenCompleting,
                                                   onOpenCancelling,
                                                   onOpenNoshow,
                                                   onOpenPayment,
                                                   onOpenEditing,
                                                   onCancelEdit,
                                                   onConfirmRequest,
                                                   onConfirmSave,
                                                   onCancelReservation,
                                                   onNoshowReservation,
                                                   onOpenRestoring,
                                                   onRestoreReservation,
                                                   onOpenDeleting,
                                                   onDeleteReservation,
                                                   onPaymentSave,
                                                   onBackToEditing,
                                                   onBackToView,
                                               }: ReservationDetailFooterActionsProps) {
    if (mode === 'view') {
        if (isInactive) {
            return (
                <>
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={onOpenRestoring}>예약전환</StyledActionButton>
                    {canDelete && (
                        <StyledActionButton type="button"
                                            $dangerOutline
                                            onClick={onOpenDeleting}>삭제</StyledActionButton>
                    )}
                </>
            );
        }

        return (
            <>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onOpenPayment}>
                    {paymentCompleted ? '결제수단 변경' : '결제완료'}
                </StyledActionButton>
                {!isCompleted && paymentCompleted && (
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={onOpenCompleting}>예약완료</StyledActionButton>
                )}
                {!paymentCompleted && (
                    <StyledActionButton type="button"
                                        $dangerOutline
                                        onClick={onOpenCancelling}>취소</StyledActionButton>
                )}
                {!paymentCompleted && (
                    <StyledActionButton type="button"
                                        $warning
                                        onClick={onOpenNoshow}>노쇼</StyledActionButton>
                )}
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onOpenEditing}>변경</StyledActionButton>
                {canDelete && (
                    <StyledActionButton type="button"
                                        $dangerOutline
                                        onClick={onOpenDeleting}>삭제</StyledActionButton>
                )}
            </>
        );
    }

    if (mode === 'editing') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onCancelEdit}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onConfirmRequest}>저장</StyledActionButton>
            </>
        );
    }

    if (mode === 'confirming' || mode === 'pastConfirm') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToEditing}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onConfirmSave}>확인</StyledActionButton>
            </>
        );
    }

    if (mode === 'cancelling') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onCancelReservation}>확인</StyledActionButton>
            </>
        );
    }

    if (mode === 'deleting') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $danger
                                    onClick={onDeleteReservation}>삭제</StyledActionButton>
            </>
        );
    }

    if (mode === 'completing') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onConfirmSave}>확인</StyledActionButton>
            </>
        );
    }

    if (mode === 'noshow') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onNoshowReservation}>확인</StyledActionButton>
            </>
        );
    }

    if (mode === 'payment') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onPaymentSave}>결제 저장</StyledActionButton>
            </>
        );
    }

    return null;
}
