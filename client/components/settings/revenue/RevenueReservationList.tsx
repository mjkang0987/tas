import styled from 'styled-components';

import {ReservationInfoCard} from '../../ui/ReservationInfoCard';

import type {Designer} from '../../../utils/designers';
import type {Reservation} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import {isNewCustomerVisit} from '../../../utils/customers';
import {
    StyledList,
    StyledRevenueEmpty,
} from './revenue-styles';

type RevenueReservationListProps = {
    reservations: Reservation[];
    designerMap: Record<number, Designer>;
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
    designerMap,
    customerMap,
    serviceColorMap,
    onSelectReservation,
    onSelectCustomer,
    emptyText = '내역이 없습니다.',
    variant = 'default',
    className,
}: RevenueReservationListProps) {
    if (reservations.length === 0) {
        return <StyledRevenueEmpty className={className}>{emptyText}</StyledRevenueEmpty>;
    }

    return (
        <StyledReservationList className={className}>
            {reservations.map((reservation) => {
                const accentColor = reservation.designerId
                    ? (designerMap[reservation.designerId]?.color ?? '#8E8E93')
                    : '#8E8E93';
                const designerName = designerMap[reservation.designerId ?? -1]?.name ?? '미지정';
                const customer = customerMap[reservation.customerId];

                return (
                    <StyledReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        serviceColorMap={serviceColorMap}
                        designerColor={accentColor}
                        designerName={designerName}
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
