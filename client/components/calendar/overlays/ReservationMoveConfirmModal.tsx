import {createPortal} from 'react-dom';

import styled from 'styled-components';

import type {Reservation} from '../../../utils/reservations';

import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledModalMessage,
    StyledOverlay,
} from './ModalStyles';

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
    const modalRoot = document.getElementById('modal-root');

    if (!modalRoot) return null;

    return createPortal(
        <StyledConfirmOverlay onClick={onClose}
                              role="dialog"
                              aria-modal="true"
                              aria-label="예약 변경 확인">
            <StyledConfirmModal onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <h3>예약 변경 전 확인</h3>
                    <button type="button"
                            onClick={onClose}
                            aria-label="닫기">&#x2715;</button>
                </StyledHeader>
                <StyledContent>
                    <StyledModalMessage>드래그한 예약 시간을 변경할까요?</StyledModalMessage>
                    <StyledInfoList>
                        <div>
                            <dt>시술</dt>
                            <dd>{reservation.service}</dd>
                        </div>
                        {customerName && (
                            <div>
                                <dt>고객</dt>
                                <dd>{customerName}</dd>
                            </div>
                        )}
                        <div>
                            <dt>날짜</dt>
                            <dd>{reservation.date} {'->'} {nextReservation.date}</dd>
                        </div>
                        <div>
                            <dt>변경 전</dt>
                            <dd>{reservation.startTime}~{reservation.endTime}</dd>
                        </div>
                        <div>
                            <dt>변경 후</dt>
                            <dd>{nextReservation.startTime}~{nextReservation.endTime}</dd>
                        </div>
                    </StyledInfoList>
                </StyledContent>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={onConfirm}>변경</StyledActionButton>
                </StyledFooter>
            </StyledConfirmModal>
        </StyledConfirmOverlay>,
        modalRoot
    );
};

const StyledConfirmOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

const StyledConfirmModal = styled(StyledDetail)`
    width: min(100%, 360px);
`;

const StyledContent = styled.div`
    padding: 16px;
`;

const StyledInfoList = styled.dl`
    display: grid;
    gap: 10px;
    margin: 0;

    > div {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: 8px;
        align-items: center;
        font-size: var(--small-font);
    }

    dt {
        color: var(--gray-color);
        font-weight: 500;
    }

    dd {
        margin: 0;
        color: var(--black-color);
        font-weight: 600;
    }
`;
