import styled from 'styled-components';

import {OVERLAY_Z_INDEX, StyledDetail, StyledOverlay} from './ModalStyles';
export const StyledReservationOverlay = styled(StyledOverlay)<{ $stacked: boolean }>`
    z-index: ${(props) => props.$stacked ? OVERLAY_Z_INDEX.confirm : OVERLAY_Z_INDEX.detail};
`;

export const StyledRestoreOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

export const StyledRestoreModal = styled(StyledDetail)`
    width: min(360px, 90vw);
`;

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

