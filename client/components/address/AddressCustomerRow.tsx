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
    /** 트림된 실제 필터 검색어 — 요약 행의 이름 하이라이트에 쓴다 */
    searchTerm: string;
    /** 검색어로 매치된 메모 태그(호출부가 필터 계산 시 함께 산출) — 매치 근거 노출용 */
    matchedTags: CustomerMemoTag[];
    isEditing: boolean;
    stats?: CustomerStats;
    tagColors: string[];
    tagInput: string;
    selectedColor: string;
    serviceColorMap: Record<string, string>;
    assigneeColorMap: Record<number, string>;
    assigneeNameMap: Record<number, string>;
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
    searchTerm,
    matchedTags,
    isEditing,
    stats,
    tagColors,
    tagInput,
    selectedColor,
    serviceColorMap,
    assigneeColorMap,
    assigneeNameMap,
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
                searchTerm={searchTerm}
                matchedTags={matchedTags}
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
                        assigneeColorMap={assigneeColorMap}
                        assigneeNameMap={assigneeNameMap}
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
