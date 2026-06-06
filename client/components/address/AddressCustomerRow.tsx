import React, {useState} from 'react';

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
    onCustomerClick?: (customerId: number) => void;
    checked?: boolean;
    onCheck?: (id: number) => void;
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
    onCustomerClick,
    checked,
    onCheck,
}: AddressCustomerRowProps) {
    const [open, setOpen] = useState(false);

    return (
        <StyledItem $open={open}>
            <AddressCustomerSummary
                customer={customer}
                stats={stats}
                serviceColorMap={serviceColorMap}
                checked={checked}
                onCheck={onCheck}
                onCustomerClick={onCustomerClick}
                onToggle={() => setOpen((prev) => !prev)}
                open={open}
            />
            {open && (
                <StyledExpandedContent>
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
                    <AddressCustomerRecharge
                        customer={customer}
                        customerReservations={customerReservations}
                        onReservationClick={onReservationClick}
                    />
                    <AddressCustomerReservations
                        customerReservations={customerReservations}
                        designerColorMap={designerColorMap}
                        designerNameMap={designerNameMap}
                        serviceColorMap={serviceColorMap}
                        today={today}
                        onReservationClick={onReservationClick}
                    />
                </StyledExpandedContent>
            )}
        </StyledItem>
    );
}

const StyledItem = styled.li<{ $open: boolean }>`
    border-bottom: 1px solid var(--light-gray-color);
    ${(p) => p.$open && `
        border-bottom: 2px solid var(--black-color);
    `}
`;

const StyledExpandedContent = styled.div`
    padding: 0 0 12px;
`;
