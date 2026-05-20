import React, {useCallback, useState} from 'react';

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
    onMerge: (sourceId: number, targetId: number) => void;
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
    onMerge,
}: AddressContentProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const handleCheck = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < 2) {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleMerge = useCallback(() => {
        if (selectedIds.size !== 2) return;
        const [idA, idB] = [...selectedIds];
        const customerA = filteredCustomers.find((c) => c.id === idA);
        const customerB = filteredCustomers.find((c) => c.id === idB);
        if (!customerA || !customerB) return;

        const aIsMasked = customerA.name.includes('*');
        const bIsMasked = customerB.name.includes('*');

        let sourceId: number;
        let targetId: number;

        if (aIsMasked && !bIsMasked) {
            sourceId = idA; targetId = idB;
        } else if (!aIsMasked && bIsMasked) {
            sourceId = idB; targetId = idA;
        } else {
            // 둘 다 같은 경우: 예약이 빠른 고객이 기준(target)
            const aReservations = reservationsByCustomer[idA] ?? [];
            const bReservations = reservationsByCustomer[idB] ?? [];
            const aEarliest = aReservations.length > 0 ? aReservations.reduce((min, r) => r.date < min ? r.date : min, aReservations[0].date) : '9999';
            const bEarliest = bReservations.length > 0 ? bReservations.reduce((min, r) => r.date < min ? r.date : min, bReservations[0].date) : '9999';
            if (aEarliest <= bEarliest) {
                targetId = idA; sourceId = idB;
            } else {
                targetId = idB; sourceId = idA;
            }
        }

        const targetCustomer = filteredCustomers.find((c) => c.id === targetId);
        const sourceCustomer = filteredCustomers.find((c) => c.id === sourceId);
        if (!targetCustomer || !sourceCustomer) return;

        const ok = window.confirm(
            `"${sourceCustomer.name}"의 예약·적립금을 "${targetCustomer.name}"에게 병합합니다.\n\n"${sourceCustomer.name}" 고객은 삭제됩니다.\n\n계속하시겠습니까?`
        );
        if (!ok) return;

        onMerge(sourceId, targetId);
        setSelectedIds(new Set());
    }, [selectedIds, filteredCustomers, reservationsByCustomer, onMerge]);

    return (
        <>
            <StyledSticky>
                <StyledSearchRow>
                    <InputWrap htmlFor="filterSearch">
                        <input
                            type="search"
                            id="filterSearch"
                            value={searchInput}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="고객명, 연락처, 메모 검색"
                        />
                    </InputWrap>
                    {selectedIds.size === 2 && (
                        <StyledMergeButton type="button" onClick={handleMerge}>병합</StyledMergeButton>
                    )}
                    {selectedIds.size === 1 && (
                        <StyledMergeHint>병합할 고객 1명을 더 선택하세요</StyledMergeHint>
                    )}
                </StyledSearchRow>
            </StyledSticky>
            <StyledGrid>
                <StyledHeaderRow>
                    <span></span>
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
                                    checked={selectedIds.has(customer.id)}
                                    onCheck={handleCheck}
                                />
                            );
                        })}
                    </StyledItems>
                )}
            </StyledGrid>
        </>
    );
}

const StyledSticky = styled.div`
    position: sticky;
    top: 0;
    padding: 20px 10px;
    z-index: 1;
    background: rgba(255, 255, 255, .1);
    backdrop-filter: blur(.8px) saturate(180%);
`;

const StyledSearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    > label {
        flex: 1;
    }
`;

const StyledMergeButton = styled.button`
    flex-shrink: 0;
    height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--blue-color);
    color: #fff;
    font-size: var(--small-font);
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

const StyledMergeHint = styled.span`
    flex-shrink: 0;
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    white-space: nowrap;
`;

const StyledGrid = styled.div`
    flex: 1;
    padding: 0 10px 10px;
`;

const StyledHeaderRow = styled.div`
    display: grid;
    grid-template-columns: 24px 80px 130px 1fr auto;
    gap: 12px;
    position: sticky;
    top: 95px;
    padding: 0 10px 10px;
    border-bottom: 2px solid var(--black-color);
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    z-index: 1;
    background: rgba(255, 255, 255, .1); /* 살짝만 흰색 */
    backdrop-filter: blur(.8px) saturate(180%);

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
