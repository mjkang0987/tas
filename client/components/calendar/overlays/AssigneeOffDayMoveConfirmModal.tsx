import styled from 'styled-components';

import type {Reservation} from '../../../utils/reservations';

import {StyledArrow, StyledChangeRow, StyledNewTime} from './ModalStyles';
import {ConfirmDialog} from '../../ui/ConfirmDialog';

interface AssigneeOffDayMoveConfirmModalProps {
    reservation: Reservation;
    nextReservation: Reservation;
    customerName?: string;
    warningMessage: string;
    onClose: () => void;
    onConfirm: () => void;
}

export const AssigneeOffDayMoveConfirmModal = ({
    reservation,
    nextReservation,
    customerName,
    warningMessage,
    onClose,
    onConfirm,
}: AssigneeOffDayMoveConfirmModalProps) => {
    const dateChanged = reservation.date !== nextReservation.date;

    return (
        <ConfirmDialog
            title="휴무일 이동 확인"
            description="근무 외 일정으로 이동되기 전에 내용을 확인합니다."
            ariaLabel="휴무일 이동 확인"
            layerKey="assignee-off-day-move-confirm"
            confirmLabel="네"
            cancelLabel="아니오"
            onConfirm={onConfirm}
            onClose={onClose}
        >
            <StyledConfirmContent>
                <StyledConfirmList>
                    <StyledTerm>서비스</StyledTerm>
                    <StyledDesc>{reservation.service}</StyledDesc>
                    {customerName && (
                        <>
                            <StyledTerm>고객</StyledTerm>
                            <StyledDesc>{customerName}</StyledDesc>
                        </>
                    )}
                    {dateChanged ? (
                        <>
                            <StyledTerm>날짜</StyledTerm>
                            <StyledDesc>
                                <StyledChangeRow>
                                    <span>{reservation.date}</span>
                                    <StyledArrow>→</StyledArrow>
                                    <span>{nextReservation.date}</span>
                                </StyledChangeRow>
                            </StyledDesc>
                        </>
                    ) : (
                        <>
                            <StyledTerm>날짜</StyledTerm>
                            <StyledDesc>{reservation.date}</StyledDesc>
                        </>
                    )}
                    <StyledTerm>변경 후</StyledTerm>
                    <StyledDesc>
                        <StyledNewTime>{nextReservation.startTime} ~ {nextReservation.endTime}</StyledNewTime>
                    </StyledDesc>
                </StyledConfirmList>
                <StyledWarningMessage>{warningMessage} 이동하시겠습니까?</StyledWarningMessage>
            </StyledConfirmContent>
        </ConfirmDialog>
    );
};

const StyledConfirmContent = styled.div`
    padding: var(--modal-body-padding);
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const StyledConfirmList = styled.dl`
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 8px 12px;
    margin: 0;
`;

const StyledTerm = styled.dt`
    font-size: 13px;
    color: var(--dark-gray-color);
    font-weight: 500;
`;

const StyledDesc = styled.dd`
    margin: 0;
    font-size: 13px;
`;

const StyledWarningMessage = styled.p`
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--radius-lg);
    background: rgba(168, 132, 23, 0.1);
    border: 1px solid rgba(168, 132, 23, 0.2);
    color: var(--caution-color);
    font-size: var(--small-font);
    font-weight: 600;
    line-height: 1.45;
    word-break: keep-all;
`;
