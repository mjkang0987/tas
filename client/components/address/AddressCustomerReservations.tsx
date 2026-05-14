import React from 'react';

import type {Reservation} from '../../utils/reservations';
import {CustomerReservationCards} from '../ui/CustomerReservationCards';

type AddressCustomerReservationsProps = {
    customerReservations: Reservation[];
    designerColorMap: Record<number, string>;
    designerNameMap: Record<number, string>;
    serviceColorMap: Record<string, string>;
    today: string;
    onReservationClick: (reservation: Reservation) => void;
};

export function AddressCustomerReservations({
    customerReservations,
    designerColorMap,
    designerNameMap,
    serviceColorMap,
    today,
    onReservationClick,
}: AddressCustomerReservationsProps) {
    return <CustomerReservationCards reservations={customerReservations}
                                     designerColorMap={designerColorMap}
                                     designerNameMap={designerNameMap}
                                     serviceColorMap={serviceColorMap}
                                     today={today}
                                     onReservationClick={onReservationClick} />;
}
