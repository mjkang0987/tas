import styled from 'styled-components';

import type {Reservation} from '../../utils/reservations';
import {EMPTY_TEXT, StyledEmptyCard} from '../settings/settings-styles';
import {ReservationInfoCard} from './ReservationInfoCard';

type CustomerReservationCardsProps = {
    reservations: Reservation[];
    assigneeColorMap: Record<number, string>;
    assigneeNameMap: Record<number, string>;
    serviceColorMap: Record<string, string>;
    today: string;
    onReservationClick?: (reservation: Reservation) => void;
    emptyText?: string;
    className?: string;
};

export function CustomerReservationCards({
    reservations,
    assigneeColorMap,
    assigneeNameMap,
    serviceColorMap,
    today,
    onReservationClick,
    emptyText = EMPTY_TEXT,
    className,
}: CustomerReservationCardsProps) {
    if (reservations.length === 0) {
        return <StyledEmptyCard className={className}>{emptyText}</StyledEmptyCard>;
    }

    return (
        <StyledReservationList className={className}>
            {reservations.map((reservation) => {
                const assigneeColor = reservation.assigneeId
                    ? (assigneeColorMap[reservation.assigneeId] ?? '#8E8E93')
                    : '#8E8E93';
                const assigneeName = reservation.assigneeId
                    ? (assigneeNameMap[reservation.assigneeId] ?? '미지정')
                    : '미지정';

                return (
                    <li key={reservation.id}>
                        <ReservationInfoCard
                            reservation={reservation}
                            serviceColorMap={serviceColorMap}
                            assigneeColor={assigneeColor}
                            assigneeName={assigneeName}
                            today={today}
                            onClick={onReservationClick}
                            showDate
                            showStatus
                            showPrice
                            timeMode="range"
                            accentColor={assigneeColor}
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

