import styled from 'styled-components';

import {OVERLAY_Z_INDEX, StyledConfirmModal, StyledConfirmOverlay, StyledOverlay} from './ModalStyles';
export const StyledReservationOverlay = styled(StyledOverlay)<{ $stacked: boolean }>`
    z-index: ${(props) => props.$stacked ? OVERLAY_Z_INDEX.confirm : OVERLAY_Z_INDEX.detail};
`;

// 예약 전환 확인 — 짧은 확인창이라 공용 확인창 부품(모바일에서도 가운데 카드)을 쓴다
export const StyledRestoreOverlay = styled(StyledConfirmOverlay)``;

export const StyledRestoreModal = styled(StyledConfirmModal)``;

export const StyledRestoreBody = styled.div`
    padding: var(--modal-body-padding);
`;

export const StyledRestoreList = styled.dl`
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 8px 12px;
    margin: 0;
`;

export const StyledRestoreTerm = styled.dt`
    font-size: var(--medium-font);
    color: var(--dark-gray-color);
    font-weight: 500;
`;

export const StyledRestoreDesc = styled.dd`
    margin: 0;
    font-size: var(--medium-font);
`;

export const StyledRestoreMessage = styled.p`
    margin: 0 0 16px;
    font-size: var(--font);
    font-weight: 600;
    color: var(--blue-color);
`;

