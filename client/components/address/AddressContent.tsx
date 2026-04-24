import React from 'react';

import styled from 'styled-components';

import type {Customer} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {AddressCustomerRow} from './AddressCustomerRow';
import {InputWrap} from '../ui/Input';

type CustomerStats = {
    recentService: string;
    booked: number;
    cancelled: number;
    completed: number;
    noshow: number;
};

type AddressContentProps = {
    filteredCustomers: Customer[];
    reservationsByCustomer: Record<number, Reservation[]>;
    editingId: number | null;
    tagColors: string[];
    tagInput: string;
    selectedColor: string;
    serviceColorMap: Record<string, string>;
    designerColorMap: Record<number, string>;
    designerNameMap: Record<number, string>;
    today: string;
    customerStats: Record<number, CustomerStats>;
    searchInput: string;
    onSearchChange: (value: string) => void;
    onTagInputChange: (value: string) => void;
    onSelectColor: (color: string) => void;
    onAddTag: (customerId: number) => void;
    onRemoveTag: (customerId: number, text: string) => void;
    onStartEditing: (customerId: number) => void;
    onFinishEditing: () => void;
    onReservationClick: (reservation: Reservation) => void;
};

export function AddressContent({
    filteredCustomers,
    reservationsByCustomer,
    editingId,
    tagColors,
    tagInput,
    selectedColor,
    serviceColorMap,
    designerColorMap,
    designerNameMap,
    today,
    customerStats,
    searchInput,
    onSearchChange,
    onTagInputChange,
    onSelectColor,
    onAddTag,
    onRemoveTag,
    onStartEditing,
    onFinishEditing,
    onReservationClick,
}: AddressContentProps) {
    return (
        <>
            <StyledSticky>
                <StyledHeading>고객명단</StyledHeading>
                <InputWrap htmlFor="filterSearch">
                    <input
                        type="search"
                        id="filterSearch"
                        value={searchInput}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="고객명, 연락처, 메모 검색"
                    />
                </InputWrap>
            </StyledSticky>
            <StyledGrid>
                <StyledHeaderRow>
                    <span>이름</span>
                    <span>연락처</span>
                    <span>최근 시술</span>
                    <span>예약현황</span>
                </StyledHeaderRow>
                {filteredCustomers.length === 0 ? (
                    <StyledEmpty>검색 결과가 없습니다.</StyledEmpty>
                ) : (
                    <StyledItems>
                        {filteredCustomers.map((customer) => {
                            const customerReservations = reservationsByCustomer[customer.id] || [];
                            const isEditing = editingId === customer.id;
                            const customerTags = customer.memoTags ?? [];
                            const stats = customerStats[customer.id];

                            return (
                                <AddressCustomerRow
                                    key={customer.id}
                                    customer={customer}
                                    customerReservations={customerReservations}
                                    customerTags={customerTags}
                                    isEditing={isEditing}
                                    stats={stats}
                                    tagColors={tagColors}
                                    tagInput={tagInput}
                                    selectedColor={selectedColor}
                                    serviceColorMap={serviceColorMap}
                                    designerColorMap={designerColorMap}
                                    designerNameMap={designerNameMap}
                                    today={today}
                                    onTagInputChange={onTagInputChange}
                                    onSelectColor={onSelectColor}
                                    onAddTag={onAddTag}
                                    onRemoveTag={onRemoveTag}
                                    onStartEditing={onStartEditing}
                                    onFinishEditing={onFinishEditing}
                                    onReservationClick={onReservationClick}
                                />
                            );
                        })}
                    </StyledItems>
                )}
            </StyledGrid>
        </>
    );
}

const StyledHeading = styled.h2`
    text-align: center;
    font-size: var(--big-font);
    font-weight: 600;
    margin-bottom: 5px;
`;

const StyledSticky = styled.div`
    position: sticky;
    top: 0;
    background-color: var(--white-color);
    padding: 20px 10px;
    z-index: 1;
`;

const StyledGrid = styled.div`
    flex: 1;
    padding: 0 10px 10px;
`;

const StyledHeaderRow = styled.div`
    display: grid;
    grid-template-columns: 80px 130px 1fr auto;
    gap: 12px;
    position: sticky;
    top: 95px;
    padding: 0 10px 10px;
    border-bottom: 2px solid var(--black-color);
    background-color: var(--white-color);
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    z-index: 1;

    @media (max-width: 600px) {
        display: none;
    }
`;

const StyledItems = styled.ul`
    position: relative;
    z-index: 0;
`;

const StyledEmpty = styled.p`
    padding: 16px 10px;
    font-size: var(--small-font);
    color: var(--gray-color);
    text-align: center;
    background-color: var(--black-color-10);
    border-radius: 4px;
`;
