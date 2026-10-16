import React from 'react';

import {StyledActionButton} from './ModalStyles';
import type {ReservationDetailMode} from './reservationDetailTypes';

type ReservationDetailFooterActionsProps = {
    mode: ReservationDetailMode;
    isInactive: boolean;
    isRequested: boolean;
    isCompleted: boolean;
    paymentCompleted: boolean;
    isNaverBooking: boolean;
    /** 삭제(익명 처리)된 고객의 예약 — 결제·변경을 막는다. 고객 행이 서버 저장에서 빠져 적립금이 새로고침 때 사라진다 */
    isCustomerDeleted: boolean;
    canDelete: boolean;
    onConfirmBooking: () => void;
    onApproveReservation: () => void;
    onRejectBooking: () => void;
    onRejectReservation: () => void;
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
                                                   isRequested,
                                                   isCompleted,
                                                   paymentCompleted,
                                                   isNaverBooking,
                                                   isCustomerDeleted,
                                                   canDelete,
                                                   onConfirmBooking,
                                                   onApproveReservation,
                                                   onRejectBooking,
                                                   onRejectReservation,
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
        // 온라인 예약 신청(확정 대기): 결제·완료 등 활성 액션 대신 예약확정/거절만 노출.
        if (isRequested) {
            return (
                <>
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={onConfirmBooking}>예약확정</StyledActionButton>
                    <StyledActionButton type="button"
                                        $dangerOutline
                                        onClick={onRejectBooking}>거절</StyledActionButton>
                </>
            );
        }
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

        // 채운 색은 주 동작 하나만: 미결제면 결제완료, 결제 후엔 예약완료. 나머지는 테두리 버튼.
        return (
            <>
                {!isCustomerDeleted && (
                    <StyledActionButton type="button"
                                        $primary={!paymentCompleted}
                                        onClick={onOpenPayment}>
                        {paymentCompleted ? '결제수단 변경' : '결제완료'}
                    </StyledActionButton>
                )}
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
                                        $dangerOutline
                                        onClick={onOpenNoshow}>노쇼</StyledActionButton>
                )}
                {!isCustomerDeleted && (
                    <StyledActionButton type="button"
                                        onClick={onOpenEditing}>변경</StyledActionButton>
                )}
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
                                    onClick={onConfirmSave}>저장</StyledActionButton>
            </>
        );
    }

    if (mode === 'cancelling') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $danger
                                    onClick={onCancelReservation}>예약 취소</StyledActionButton>
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
                                    onClick={onConfirmSave}>예약완료</StyledActionButton>
            </>
        );
    }

    if (mode === 'noshow') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $danger
                                    onClick={onNoshowReservation}>노쇼 처리</StyledActionButton>
            </>
        );
    }

    if (mode === 'approving') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={onApproveReservation}>예약확정</StyledActionButton>
            </>
        );
    }

    if (mode === 'rejecting') {
        return (
            <>
                <StyledActionButton type="button"
                                    onClick={onBackToView}>취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $danger
                                    onClick={onRejectReservation}>거절</StyledActionButton>
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
