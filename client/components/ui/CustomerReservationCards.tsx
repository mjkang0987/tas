import styled from 'styled-components';

import type {Reservation} from '../../utils/reservations';
import {ReservationInfoCard} from './ReservationInfoCard';

type CustomerReservationCardsProps = {
    reservations: Reservation[];
    designerColorMap: Record<number, string>;
    designerNameMap: Record<number, string>;
    serviceColorMap: Record<string, string>;
    today: string;
    onReservationClick?: (reservation: Reservation) => void;
    emptyText?: string;
    className?: string;
};

export function CustomerReservationCards({
    reservations,
    designerColorMap,
    designerNameMap,
    serviceColorMap,
    today,
    onReservationClick,
    emptyText = '예약 내역이 없습니다.',
    className,
}: CustomerReservationCardsProps) {
    if (reservations.length === 0) {
        return <StyledEmpty className={className}>{emptyText}</StyledEmpty>;
    }

    return (
        <StyledReservationList className={className}>
            {reservations.map((reservation) => {
                const designerColor = reservation.designerId
                    ? (designerColorMap[reservation.designerId] ?? '#8E8E93')
                    : '#8E8E93';
                const designerName = reservation.designerId
                    ? (designerNameMap[reservation.designerId] ?? '미지정')
                    : '미지정';

                return (
                    <li key={reservation.id}>
                        <ReservationInfoCard
                            reservation={reservation}
                            serviceColorMap={serviceColorMap}
                            designerColor={designerColor}
                            designerName={designerName}
                            today={today}
                            onClick={onReservationClick}
                            showDate
                            showStatus
                            timeMode="range"
                            accentColor={designerColor}
                            accentBar
                        />
                    </li>
                );
            })}
        </StyledReservationList>
    );
}

const StyledReservationList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledEmpty = styled.p`
    padding: 16px 10px;
    font-size: var(--small-font);
    color: var(--gray-color);
    text-align: center;
    background-color: var(--black-color-10);
    border-radius: 4px;
`;
