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
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';

interface DesignerOffDayMoveConfirmModalProps {
    reservation: Reservation;
    nextReservation: Reservation;
    customerName?: string;
    warningMessage: string;
    onClose: () => void;
    onConfirm: () => void;
}

export const DesignerOffDayMoveConfirmModal = ({
    reservation,
    nextReservation,
    customerName,
    warningMessage,
    onClose,
    onConfirm,
}: DesignerOffDayMoveConfirmModalProps) => {
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('designer-off-day-move-confirm');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    if (!modalRoot) return null;

    return createPortal(
        <StyledConfirmOverlay onClick={onClose}
                              role="dialog"
                              aria-modal="true"
                              aria-label="휴무일 이동 확인"
                              id={layerId}
                              data-layer-id={layerDataId}>
            <StyledConfirmModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <h3>휴무일 이동 확인</h3>
                    <button type="button" onClick={onClose} aria-label="닫기">닫기</button>
                </StyledHeader>
                <StyledContent>
                    <StyledModalMessage>{warningMessage} 이동하시겠습니까?</StyledModalMessage>
                    <StyledWarningMessage>
                        선택한 날짜는 디자이너 휴무일입니다. 그대로 이동하면 휴무일 예약으로 저장됩니다.
                    </StyledWarningMessage>
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
                            <dt>변경 후</dt>
                            <dd>{nextReservation.startTime}~{nextReservation.endTime}</dd>
                        </div>
                    </StyledInfoList>
                </StyledContent>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onClose}>아니오</StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={onConfirm}>네</StyledActionButton>
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

const StyledWarningMessage = styled.p`
    margin: 0 0 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(251, 140, 0, 0.12);
    color: #9a5a00;
    font-size: var(--small-font);
    font-weight: 600;
    line-height: 1.45;
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
