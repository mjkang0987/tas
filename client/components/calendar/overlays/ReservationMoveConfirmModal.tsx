import {createPortal} from 'react-dom';

import styled from 'styled-components';

import type {Reservation} from '../../../utils/reservations';

import {
    OVERLAY_Z_INDEX,
    StyledActionButton,
    StyledDetail,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledInfoGrid,
    StyledModalContent,
    StyledModalMessage,
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';

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
    const {layerId, layerDataId} = useLayerInstanceId('reservation-move-confirm');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    if (!modalRoot) return null;

    return createPortal(
        <StyledConfirmOverlay onClick={onClose}
                              role="dialog"
                              aria-modal="true"
                              aria-label="예약 변경 확인"
                              id={layerId}
                              data-layer-id={layerDataId}>
            <StyledConfirmModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <h3>예약 변경 전 확인</h3>
                        <p>이동할 예약 시간을 한 번 더 확인합니다.</p>
                    </StyledHeaderTitleGroup>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledModalContent>
                    <StyledModalMessage>드래그한 예약 시간을 변경할까요?</StyledModalMessage>
                    <StyledInfoGrid>
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
                    </StyledInfoGrid>
                </StyledModalContent>
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
    width: min(360px, 90vw);
`;
