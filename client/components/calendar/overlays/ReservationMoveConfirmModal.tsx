import styled from 'styled-components';

import type {Reservation} from '../../../utils/reservations';

import {StyledArrow, StyledChangeRow, StyledNewTime} from './ModalStyles';
import {ConfirmDialog} from '../../ui/ConfirmDialog';
import {useStoreLabels} from '../../../hooks/useStoreLabels';

interface ReservationMoveConfirmModalProps {
    reservation: Reservation;
    nextReservation: Reservation;
    customerName?: string;
    onClose: () => void;
    onConfirm: () => void;
}

export const ReservationMoveConfirmModal = ({
    reservation,
    nextReservation,
    customerName,
    onClose,
    onConfirm,
}: ReservationMoveConfirmModalProps) => {
    const labels = useStoreLabels();
    const dateChanged = reservation.date !== nextReservation.date;

    return (
        <ConfirmDialog
            title="예약 변경 전 확인"
            description="이동할 예약 시간을 한 번 더 확인합니다."
            ariaLabel="예약 변경 확인"
            layerKey="reservation-move-confirm"
            confirmLabel="변경"
            onConfirm={onConfirm}
            onClose={onClose}
        >
            <StyledConfirmContent>
                <StyledConfirmList>
                    <StyledTerm>{labels.service}</StyledTerm>
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
                    <StyledTerm>변경 전</StyledTerm>
                    <StyledDesc>
                        <StyledOldTime>{reservation.startTime} ~ {reservation.endTime}</StyledOldTime>
                    </StyledDesc>
                    <StyledTerm>변경 후</StyledTerm>
                    <StyledDesc>
                        <StyledNewTime>{nextReservation.startTime} ~ {nextReservation.endTime}</StyledNewTime>
                    </StyledDesc>
                </StyledConfirmList>
            </StyledConfirmContent>
        </ConfirmDialog>
    );
};

const StyledConfirmContent = styled.div`
    padding: var(--modal-body-padding);
`;

const StyledConfirmList = styled.dl`
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 8px 12px;
    margin: 0;
`;

const StyledTerm = styled.dt`
    font-size: var(--medium-font);
    color: var(--dark-gray-color);
    font-weight: 500;
`;

const StyledDesc = styled.dd`
    margin: 0;
    font-size: var(--medium-font);
`;

const StyledOldTime = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--radius-md);
    background: var(--gray-color2);
    font-size: var(--medium-font);
    color: var(--dark-gray-color2);
    text-decoration: line-through;
`;
