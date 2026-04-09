import React from 'react';

import styled from 'styled-components';

import type {Customer} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {AddressCustomerReservations} from './AddressCustomerReservations';
import {AddressCustomerTags} from './AddressCustomerTags';
import type {AddressTag} from './AddressCustomerTags';

const STATUS_COLORS: Record<string, string> = {
    booked: '#4285F4',
    cancelled: '#999',
    completed: '#34A853',
    noshow: '#EA4335',
};

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
    customerTags: AddressTag[];
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
                <StyledSummary>
                    <strong>{customer.name}</strong>
                    <span>{customer.tel.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</span>
                    <span>{stats?.recentService || '-'}</span>
                    <StyledStatusCounts>
                        <StyledStatusBadge $type="booked">예약({stats?.booked || 0})</StyledStatusBadge>
                        <StyledStatusBadge $type="cancelled">취소({stats?.cancelled || 0})</StyledStatusBadge>
                        <StyledStatusBadge $type="completed">완료({stats?.completed || 0})</StyledStatusBadge>
                        <StyledStatusBadge $type="noshow">노쇼({stats?.noshow || 0})</StyledStatusBadge>
                    </StyledStatusCounts>
                </StyledSummary>
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

const StyledSummary = styled.summary`
    display: grid;
    grid-template-columns: 80px 130px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    list-style: none;
    position: relative;

    &::-webkit-details-marker {
        display: none;
    }

    &::before {
        content: "";
        position: absolute;
        left: 0;
        display: inline-block;
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-left: 5px solid var(--dark-gray-color);
        transition: transform 0.15s ease;
    }

    > strong {
        font-size: var(--font);
        font-weight: 500;
    }

    > span:first-of-type {
        font-size: var(--small-font);
        color: var(--dark-gray-color);
    }

    > span:nth-of-type(2) {
        font-size: var(--small-font);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &:hover > strong {
        color: var(--blue-color);
    }

    @media (max-width: 600px) {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 10px;

        > strong {
            min-width: 60px;
        }

        > span:nth-of-type(2) {
            width: 100%;
        }
    }
`;

const StyledStatusCounts = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const StyledStatusBadge = styled.span<{ $type: string }>`
    font-size: var(--tiny-font);
    font-weight: 500;
    color: ${(props) => STATUS_COLORS[props.$type] || 'var(--gray-color)'};
`;
