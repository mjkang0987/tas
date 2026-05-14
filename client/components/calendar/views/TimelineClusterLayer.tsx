import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
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
import {DesignerLabel, StyledDesignerLabel} from '../../ui/DesignerLabel';
import {ServiceChipList} from '../../ui/ServiceChip';

type TimelineClusterReservation = Reservation;

export type TimelineClusterData = {
    id: string;
    startMinutes: number;
    endMinutes: number;
    reservations: TimelineClusterReservation[];
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

                                    return (
                                        <StyledClusterItem
                                            data-timeline-interactive="true"
                                            key={reservation.id}
                                            type="button"
                                            $color={designerColor}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onReservationClick(reservation);
                                            }}
                                            onKeyDown={(event) => {
                                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                                event.preventDefault();
                                                onReservationClick(reservation);
                                            }}
                                        >
                                            <span className="time">{reservation.startTime}~{reservation.endTime}</span>
                                            <StyledClusterService service={reservation.service}
                                                                  serviceColorMap={serviceColorMap}
                                                                  keyPrefix={reservation.id}>
                                                {reservation.status === 'cancelled' && (
                                                    <StyledStatusText $variant="cancelled">취소</StyledStatusText>
                                                )}
                                                {reservation.status === 'noshow' && (
                                                    <StyledStatusText $variant="noshow">노쇼</StyledStatusText>
                                                )}
                                                {reservation.status === 'completed' && (
                                                    <StyledStatusText $variant="completed">완료</StyledStatusText>
                                                )}
                                            </StyledClusterService>
                                            {customer && (
                                                <span className="detail">
                                                    {isNewCustomerVisit(customer.firstVisitDate, reservation.date) &&
                                                        <NewCustomerBadge>N</NewCustomerBadge>}
                                                    <span>{customer.name}</span>
                                                </span>
                                            )}
                                            <StyledClusterItemTop>
                                                <StyledClusterDesigner>
                                                    <DesignerLabel color={designerColor}
                                                                   name={designerNameById(reservation.designerId)} />
                                                </StyledClusterDesigner>
                                            </StyledClusterItemTop>
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
    width: 360px;
`;

const StyledClusterSubtitle = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledClusterBody = styled(StyledBody)``;

const StyledClusterBodyInner = styled(StyledBodyInner)`
    padding: 12px 12px 30px;
`;

const StyledClusterList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledClusterItem = styled.button<{ $color: string }>`
    display: flex;
    gap: 4px;
    width: 100%;
    padding: 4px 8px;
    border: 1px solid ${(props) => props.$color};
    border-left-width: 4px;
    border-radius: 8px;
    background: ${(props) => `${props.$color}12`};
    text-align: left;
    color: var(--dark-gray-color);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background: ${(props) => `${props.$color}1d`};
    }
    }

    .detail {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--tiny-font);
        color: var(--dark-gray-color);
    }

    .dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        margin-right: 4px;
        border-radius: 50%;
        vertical-align: middle;
    }

    .time {
        display: inline-flex;
        align-items: center;
        font-size: var(--tiny-font);
        color: var(--dark-gray-color);
    }
`;

const StyledClusterItemTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--tiny-font);

    > span:last-child {
        font-weight: 600;
        color: var(--dark-gray-color2);
    }
`;

const StyledClusterDesigner = styled.span`
    display: inline-flex;
    align-items: center;
    font-weight: 600;

    ${StyledDesignerLabel} {
        gap: 4px;
    }
`;

const StyledClusterService = styled(ServiceChipList)`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-size: var(--small-font);
    font-weight: 600;

    .service-chip-text {
        padding: 2px 0;
        font-size: 11px;
    }
`;

const StyledStatusText = styled.span<{ $variant: 'cancelled' | 'noshow' | 'completed' }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: ${({$variant}) => (
        $variant === 'cancelled' ? '#FDE8E6' : $variant === 'noshow' ? '#FFF7DB' : '#EFF6FF'
    )};
    color: ${({$variant}) => (
        $variant === 'cancelled' ? '#B42318' : $variant === 'noshow' ? '#9A6700' : '#1D4ED8'
    )};
`;
