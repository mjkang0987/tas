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
    onCustomerClick: (customerId: number) => void;
    onMerge: (sourceIds: number[], targetId: number) => void;
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
    onCustomerClick,
    onMerge,
}: AddressContentProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [mergePreview, setMergePreview] = useState<{customers: Customer[]; targetId: number} | null>(null);

    const handleCheck = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const getEarliest = useCallback((id: number) => {
        const rList = reservationsByCustomer[id] ?? [];
        return rList.length > 0 ? rList.reduce((min, r) => r.date < min ? r.date : min, rList[0].date) : '9999';
    }, [reservationsByCustomer]);

    const openMergePreview = useCallback(() => {
        if (selectedIds.size < 2) return;

        const ids = [...selectedIds];
        const customers = ids.map((id) => filteredCustomers.find((c) => c.id === id)).filter(Boolean) as Customer[];
        if (customers.length !== ids.length) return;

        // 기준 고객 자동 결정
        const realNames = customers.filter((c) => !c.name.includes('*'));
        let target: Customer;

        if (realNames.length === 1) {
            target = realNames[0];
        } else {
            const pool = realNames.length > 0 ? realNames : customers;
            target = pool.reduce((best, c) =>
                getEarliest(c.id) <= getEarliest(best.id) ? c : best
            );
        }

        setMergePreview({customers, targetId: target.id});
    }, [selectedIds, filteredCustomers, getEarliest]);

    const confirmMerge = useCallback(() => {
        if (!mergePreview) return;
        const {customers, targetId} = mergePreview;
        const sourceIds = customers.filter((c) => c.id !== targetId).map((c) => c.id);

        onMerge(sourceIds, targetId);
        setMergePreview(null);
        setSelectedIds(new Set());
    }, [mergePreview, onMerge]);

    return (
        <StyledTable>
            <StyledSticky $expanded={!!mergePreview}>
                <StyledSearchRow>
                    <InputWrap htmlFor="filterSearch">
                        <input
                            className="input-field"
                            type="search"
                            id="filterSearch"
                            value={searchInput}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="고객명, 연락처, 메모 검색"
                        />
                    </InputWrap>
                    {selectedIds.size >= 2 && !mergePreview && (
                        <StyledMergeButton type="button" onClick={openMergePreview}>병합({selectedIds.size}명)</StyledMergeButton>
                    )}
                    {selectedIds.size === 1 && !mergePreview && (
                        <StyledMergeHint>병합할 고객을 더 선택하세요</StyledMergeHint>
                    )}
                </StyledSearchRow>
                {mergePreview && (
                    <StyledMergePreview>
                        <StyledPreviewTitle>기준 고객을 선택하세요</StyledPreviewTitle>
                        <StyledPreviewDesc>기준 고객의 이름·연락처가 유지되고, 나머지 고객의 예약·적립금이 병합됩니다.</StyledPreviewDesc>
                        <StyledPreviewList>
                            {mergePreview.customers.map((c) => (
                                <StyledPreviewItem
                                    key={c.id}
                                    $isTarget={c.id === mergePreview.targetId}
                                    onClick={() => setMergePreview((prev) => prev ? {...prev, targetId: c.id} : null)}
                                >
                                    <StyledPreviewRadio
                                        id={`merge-target-${c.id}`}
                                        type="radio"
                                        name="mergeTarget"
                                        checked={c.id === mergePreview.targetId}
                                        onChange={() => setMergePreview((prev) => prev ? {...prev, targetId: c.id} : null)}
                                    />
                                    <StyledPreviewName>{c.name}</StyledPreviewName>
                                    <StyledPreviewTel>{c.tel.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</StyledPreviewTel>
                                    {c.id === mergePreview.targetId
                                        ? <StyledPreviewBadge $type="target">기준</StyledPreviewBadge>
                                        : <StyledPreviewBadge $type="source">삭제</StyledPreviewBadge>
                                    }
                                </StyledPreviewItem>
                            ))}
                        </StyledPreviewList>
                        <StyledPreviewActions>
                            <StyledPreviewCancel type="button" onClick={() => setMergePreview(null)}>취소</StyledPreviewCancel>
                            <StyledMergeButton type="button" onClick={confirmMerge}>병합 실행</StyledMergeButton>
                        </StyledPreviewActions>
                    </StyledMergePreview>
                )}
                <StyledHeaderRow>
                    <strong>선택</strong>
                    <strong>이름</strong>
                    <strong>연락처</strong>
                    <strong>최근 서비스</strong>
                    <strong>적립금</strong>
                    <strong>예약현황</strong>
                </StyledHeaderRow>
            </StyledSticky>
            {filteredCustomers.length === 0 ? (
                searchInput.trim().length === 0 ? (
                    <StyledEmpty>
                        <StyledEmptyIcon>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                        </StyledEmptyIcon>
                        <StyledEmptyTitle>등록된 고객이 없습니다</StyledEmptyTitle>
                        <StyledEmptyDesc>예약을 생성하면 고객이 자동으로 등록됩니다.</StyledEmptyDesc>
                    </StyledEmpty>
                ) : (
                    <StyledEmpty>
                        <StyledEmptyIcon>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                        </StyledEmptyIcon>
                        <StyledEmptyTitle>검색 결과가 없습니다</StyledEmptyTitle>
                        <StyledEmptyDesc>&apos;{searchInput.trim()}&apos;에 해당하는 고객을 찾을 수 없습니다.</StyledEmptyDesc>
                    </StyledEmpty>
                )
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
                                onCustomerClick={onCustomerClick}
                                checked={selectedIds.has(customer.id)}
                                onCheck={handleCheck}
                            />
                        );
                    })}
                </StyledItems>
            )}
        </StyledTable>
    );
}

const StyledTable = styled.div`
    display: flex;
    flex-direction: column;
    padding: 0 10px 10px;
`;

const StyledSticky = styled.div<{ $expanded?: boolean }>`
    position: sticky;
    top: 0;
    padding: 20px 0 0;
    z-index: 2;
    backdrop-filter: var(--sticky-backdrop);
    ${(p) => p.$expanded && 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);'}
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

const StyledHeaderRow = styled.div`
    display: none;
`;

const StyledItems = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const StyledEmpty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px 56px;
    text-align: center;
    background-color: var(--black-color-10);
    border-radius: 8px;
    margin-top: 8px;
`;

const StyledEmptyIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background-color: var(--white-color);
    border: 1px solid var(--light-gray-color);
    color: var(--dark-gray-color);
    margin-bottom: 16px;
`;

const StyledEmptyTitle = styled.p`
    font-size: var(--font);
    font-weight: 600;
    color: var(--black-color);
    margin-bottom: 6px;
`;

const StyledEmptyDesc = styled.p`
    font-size: var(--small-font);
    color: var(--gray-color);
    line-height: 1.5;
`;

const StyledMergePreview = styled.div`
    margin: 12px 0 0;
    padding: 16px;
    background-color: #fff;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const StyledPreviewTitle = styled.p`
    font-size: var(--font);
    font-weight: 600;
    margin-bottom: 4px;
`;

const StyledPreviewDesc = styled.p`
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    margin-bottom: 12px;
`;

const StyledPreviewList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    max-height: 200px;
    overflow-y: auto;
`;

const StyledPreviewItem = styled.li<{ $isTarget: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    border: 1.5px solid ${(p) => p.$isTarget ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    background-color: ${(p) => p.$isTarget ? '#f0f6ff' : '#fff'};
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
`;

const StyledPreviewRadio = styled.input`
    flex-shrink: 0;
    width: 16px;
    height: 16px;
`;

const StyledPreviewName = styled.strong`
    font-size: var(--font);
    font-weight: 500;
`;

const StyledPreviewTel = styled.span`
    font-size: var(--small-font);
    color: var(--dark-gray-color);
`;

const StyledPreviewBadge = styled.span<{ $type: 'target' | 'source' }>`
    margin-left: auto;
    padding: 2px 8px;
    border-radius: var(--radius-md);
    font-size: var(--tiny-font);
    font-weight: 600;
    background-color: ${(p) => p.$type === 'target' ? 'var(--blue-color)' : '#eee'};
    color: ${(p) => p.$type === 'target' ? '#fff' : 'var(--dark-gray-color)'};
`;

const StyledPreviewActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const StyledPreviewCancel = styled.button`
    height: 32px;
    padding: 0 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background-color: #fff;
    font-size: var(--small-font);
`;
