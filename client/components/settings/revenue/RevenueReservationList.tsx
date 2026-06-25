import styled from 'styled-components';

import {ReservationInfoCard} from '../../ui/ReservationInfoCard';

import type {Assignee} from '../../../utils/assignees';
import type {Reservation} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import {isNewCustomerVisit} from '../../../utils/customers';
import {EMPTY_TEXT} from '../settings-styles';
import {
    StyledList,
    StyledRevenueEmpty,
} from './revenue-styles';

type RevenueReservationListProps = {
    reservations: Reservation[];
    assigneeMap: Record<number, Assignee>;
    customerMap: CustomerMap;
    serviceColorMap: Record<string, string>;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectCustomer: (customerId: number) => void;
    emptyText?: string;
    variant?: 'default' | 'compact';
    className?: string;
};

export function RevenueReservationList({
    reservations,
    assigneeMap,
    customerMap,
    serviceColorMap,
    onSelectReservation,
    onSelectCustomer,
    emptyText = EMPTY_TEXT,
    variant = 'default',
    className,
}: RevenueReservationListProps) {
    if (reservations.length === 0) {
        return <StyledRevenueEmpty className={className}>{emptyText}</StyledRevenueEmpty>;
    }

    return (
        <StyledReservationList className={className}>
            {reservations.map((reservation) => {
                const accentColor = reservation.assigneeId
                    ? (assigneeMap[reservation.assigneeId]?.color ?? '#8E8E93')
                    : '#8E8E93';
                const assigneeName = assigneeMap[reservation.assigneeId ?? -1]?.name ?? '미지정';
                const customer = customerMap[reservation.customerId];

                return (
                    <StyledReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        serviceColorMap={serviceColorMap}
                        assigneeColor={accentColor}
                        assigneeName={assigneeName}
                        customerName={customer?.name ?? '고객 미지정'}
                        isNewCustomer={isNewCustomerVisit(customer?.firstVisitDate, reservation.date)}
                        onClick={onSelectReservation}
                        onCustomerClick={onSelectCustomer}
                        showDate={variant === 'default'}
                        showPrice
                        showStatus
                        timeMode="range"
                        compactDate={variant === 'compact'}
                        accentColor={accentColor}
                        accentBar
                    />
                );
            })}
        </StyledReservationList>
    );
}

const StyledReservationList = styled(StyledList)``;
const StyledReservationCard = styled(ReservationInfoCard)``;
