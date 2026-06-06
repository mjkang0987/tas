import {useMemo} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {isNewCustomerVisit} from '../../../utils/customers';
import type {Reservation} from '../../../utils/reservations';
import {pad} from '../../../utils/timeRound';
import {
    OVERLAY_Z_INDEX,
    StyledBody,
    StyledBodyInner,
    StyledDetail,
    StyledHeader,
    StyledOverlay,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../overlays/ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {ReservationInfoCard} from '../../ui/ReservationInfoCard';

export type TimelineClusterData = {
    id: string;
    startMinutes: number;
    endMinutes: number;
    reservations: Reservation[];
};

type TimelineClusterLayerProps = {
    cluster: TimelineClusterData;
    designerColorMap: Record<number, string>;
    serviceColorMap: Record<string, string>;
    customerMap: Record<number, { name: string; firstVisitDate?: string | null } | undefined>;
    designerNameById: (designerId?: number) => string;
    onClose: () => void;
    onReservationClick: (reservation: Reservation) => void;
};

export function TimelineClusterLayer({
                                         cluster,
                                         designerColorMap,
                                         serviceColorMap,
                                         customerMap,
                                         designerNameById,
                                         onClose,
                                         onReservationClick,
                                     }: TimelineClusterLayerProps) {
    const modalRoot = document.getElementById('modal-root');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const {layerId, layerDataId} = useLayerInstanceId('timeline-cluster');

    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    if (!modalRoot) return null;

    return createPortal(
        <StyledClusterOverlay
            data-timeline-interactive="true"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="겹침 예약 목록"
            id={layerId}
            data-layer-id={layerDataId}
        >
            <StyledClusterModal ref={dialogRef}
                                tabIndex={-1}
                                onClick={(event) => event.stopPropagation()}>
                <StyledHeader>
                    <div>
                        <h3>{cluster.reservations.length}건 예약</h3>
                        <StyledClusterSubtitle>
                            {`${pad(Math.floor(cluster.startMinutes / 60))}:${pad(cluster.startMinutes % 60)} ~ ${pad(Math.floor(cluster.endMinutes / 60))}:${pad(cluster.endMinutes % 60)}`}
                        </StyledClusterSubtitle>
                    </div>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledClusterBody>
                    <StyledClusterBodyInner>
                        <StyledClusterList>
                            {cluster.reservations
                                .slice()
                                .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))
                                .map((reservation) => {
                                    const customer = customerMap[reservation.customerId];
                                    const designerColor = reservation.designerId
                                        ? (designerColorMap[reservation.designerId] ?? '#8E8E93')
                                        : '#8E8E93';
                                    const isInactive = reservation.status === 'cancelled' || reservation.status === 'noshow';

                                    return (
                                        <StyledClusterItem key={reservation.id}>
                                            <StyledClusterCardButton
                                                type="button"
                                                onClick={() => onReservationClick(reservation)}
                                            >
                                                <ReservationInfoCard
                                                    reservation={reservation}
                                                    serviceColorMap={serviceColorMap}
                                                    designerColor={designerColor}
                                                    designerName={designerNameById(reservation.designerId)}
                                                    customerName={customer?.name ?? '-'}
                                                    today={today}
                                                    isNewCustomer={isNewCustomerVisit(customer?.firstVisitDate, reservation.date)}
                                                    showDate={false}
                                                    showStatus
                                                    timeMode="range"
                                                    accentColor={designerColor}
                                                    accentBar
                                                    className={isInactive ? 'inactive' : undefined}
                                                />
                                            </StyledClusterCardButton>
                                        </StyledClusterItem>
                                    );
                                })}
                        </StyledClusterList>
                    </StyledClusterBodyInner>
                </StyledClusterBody>
            </StyledClusterModal>
        </StyledClusterOverlay>,
        modalRoot
    );
}

const StyledClusterOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.supporting};
`;

const StyledClusterModal = styled(StyledDetail)`
    width: min(440px, 90vw);
`;

const StyledClusterSubtitle = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledClusterBody = styled(StyledBody)``;

const StyledClusterBodyInner = styled(StyledBodyInner)`
    padding: 6px 8px 18px;
`;

const StyledClusterList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledClusterItem = styled.li`
    .inactive {
    }
`;

const StyledClusterCardButton = styled.button`
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
`;
