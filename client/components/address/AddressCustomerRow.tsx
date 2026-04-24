import React from 'react';

import styled from 'styled-components';

import type {Customer} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {AddressCustomerRecharge} from './AddressCustomerRecharge';
import {AddressCustomerReservations} from './AddressCustomerReservations';
import {AddressCustomerSummary} from './AddressCustomerSummary';
import {AddressCustomerTags} from './AddressCustomerTags';
import type {CustomerMemoTag} from '../../utils/customers';

type CustomerStats = {
    recentService: string;
    booked: number;
    cancelled: number;
    completed: number;
    noshow: number;
};

type AddressCustomerRowProps = {
    customer: Customer;
    customerReservations: Reservation[];
    customerTags: CustomerMemoTag[];
    isEditing: boolean;
    stats?: CustomerStats;
    tagColors: string[];
    tagInput: string;
    selectedColor: string;
    serviceColorMap: Record<string, string>;
    designerColorMap: Record<number, string>;
    designerNameMap: Record<number, string>;
    today: string;
    onTagInputChange: (value: string) => void;
    onSelectColor: (color: string) => void;
    onAddTag: (customerId: number) => void;
    onRemoveTag: (customerId: number, text: string) => void;
    onStartEditing: (customerId: number) => void;
    onFinishEditing: () => void;
    onReservationClick: (reservation: Reservation) => void;
};

export function AddressCustomerRow({
    customer,
    customerReservations,
    customerTags,
    isEditing,
    stats,
    tagColors,
    tagInput,
    selectedColor,
    serviceColorMap,
    designerColorMap,
    designerNameMap,
    today,
    onTagInputChange,
    onSelectColor,
    onAddTag,
    onRemoveTag,
    onStartEditing,
    onFinishEditing,
    onReservationClick,
}: AddressCustomerRowProps) {
    return (
        <StyledItem>
            <StyledDetails>
                <AddressCustomerSummary customer={customer} stats={stats} />
                <AddressCustomerTags
                    customerId={customer.id}
                    customerTags={customerTags}
                    isEditing={isEditing}
                    tagColors={tagColors}
                    tagInput={tagInput}
                    selectedColor={selectedColor}
                    onTagInputChange={onTagInputChange}
                    onSelectColor={onSelectColor}
                    onAddTag={onAddTag}
                    onRemoveTag={onRemoveTag}
                    onStartEditing={onStartEditing}
                    onFinishEditing={onFinishEditing}
                />
                <AddressCustomerRecharge customer={customer} />
                <AddressCustomerReservations
                    customerReservations={customerReservations}
                    designerColorMap={designerColorMap}
                    designerNameMap={designerNameMap}
                    serviceColorMap={serviceColorMap}
                    today={today}
                    onReservationClick={onReservationClick}
                />
            </StyledDetails>
        </StyledItem>
    );
}

const StyledItem = styled.li`
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledDetails = styled.details`
    padding-right: 20px;

    > summary {
        position: relative;

        &::before {
            left: auto;
            right: -10px;
            transform: rotate(90deg);
        }
    }

    &[open] {
        background-color: #fff9f2;
        border-bottom: 2px solid var(--black-color);

        > summary::before {
            transform: rotate(-90deg);
        }
    }
`;
