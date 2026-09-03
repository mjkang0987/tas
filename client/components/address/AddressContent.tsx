import React, {useCallback, useState} from 'react';

import styled from 'styled-components';

import type {Customer, CustomerMemoTag} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {
    selectManualMergeTarget,
    summarizeCustomerReservations,
} from '../../features/customers/merge-suggestion';
import type {MergeSelection} from '../../features/customers/merge-suggestion';
import {CustomerMergeSuggestionModal} from '../modals/CustomerMergeSuggestionModal';
import {AddressCustomerRow} from './AddressCustomerRow';
import {EMPTY_TEXT, StyledEmpty as StyledEmptyBase} from '../settings/settings-styles';
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
    /** 날짜 키 예약 맵. 병합 레이어가 예약 건수·최근 예약을 낼 때 쓴다 */
    reservationMap: Record<string, Reservation[]>;
    editingId: number | null;
    tagColors: string[];
    tagInput: string;
    selectedColor: string;
    serviceColorMap: Record<string, string>;
    assigneeColorMap: Record<number, string>;
    assigneeNameMap: Record<number, string>;
    today: string;
    customerStats: Record<number, CustomerStats>;
    searchInput: string;
    /** 트림된 실제 필터 검색어(디바운스 반영) — 결과 행 이름 하이라이트에 쓴다 */
    searchTerm: string;
    /** 검색어로 매치된 고객별 메모 태그(필터 계산 시 함께 산출) — 매치 근거 노출용 */
    matchedTagsByCustomer: Record<number, CustomerMemoTag[]>;
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
    reservationMap,
    editingId,
    tagColors,
    tagInput,
    selectedColor,
    serviceColorMap,
    assigneeColorMap,
    assigneeNameMap,
    today,
    customerStats,
    searchInput,
    searchTerm,
    matchedTagsByCustomer,
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
    const [mergeSelection, setMergeSelection] = useState<MergeSelection | null>(null);

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

    const openMergeLayer = useCallback(() => {
        if (selectedIds.size < 2) return;

        const ids = [...selectedIds];
        const customers = ids.map((id) => filteredCustomers.find((c) => c.id === id)).filter(Boolean) as Customer[];
        if (customers.length !== ids.length) return;

        // 기준 고객 기본값은 자동 제안과 같은 규칙을 쓴다(`selectManualMergeTarget`).
        // 두 경로가 다른 기본값을 내놓으면 같은 고객을 두고 판단이 갈린다.
        const summary = summarizeCustomerReservations(ids, reservationMap);
        setMergeSelection({
            // `buildMergeGroupKey` 를 쓰지 않는다 — 그 키는 "다시 띄우지 않음"
            // 기록(`customer-merge-reviewed`)의 식별자다. 같은 고객 조합을 수동으로
            // 합치면 자동 제안 그룹과 키가 겹쳐, 나중에 어느 한쪽이 상대의 기록을
            // 건드리게 된다. 여기서 키는 레이어 식별용일 뿐이라 따로 만든다.
            key: `manual-${[...ids].sort((a, b) => a - b).join('-')}`,
            mode: 'manual',
            maskedSource: null,
            targetChoices: customers,
            targetId: selectManualMergeTarget(customers, summary),
        });
    }, [selectedIds, filteredCustomers, reservationMap]);

    const confirmMerge = useCallback((targetId: number) => {
        if (!mergeSelection) return;
        const sourceIds = mergeSelection.targetChoices
            .filter((c) => c.id !== targetId)
            .map((c) => c.id);
        if (sourceIds.length === 0) return;

        onMerge(sourceIds, targetId);
        setMergeSelection(null);
        setSelectedIds(new Set());
    }, [mergeSelection, onMerge]);

    const closeMergeLayer = useCallback(() => setMergeSelection(null), []);

    return (
        <StyledTable>
            <StyledSticky>
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
                    {selectedIds.size >= 2 && (
                        <StyledMergeButton type="button" onClick={openMergeLayer}>병합({selectedIds.size}명)</StyledMergeButton>
                    )}
                    {selectedIds.size === 1 && (
                        <StyledMergeHint>병합할 고객을 더 선택하세요</StyledMergeHint>
                    )}
                </StyledSearchRow>
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
                <StyledEmptyBase>{EMPTY_TEXT}</StyledEmptyBase>
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
                                searchTerm={searchTerm}
                                matchedTags={matchedTagsByCustomer[customer.id] ?? []}
                                isEditing={isEditing}
                                stats={stats}
                                tagColors={tagColors}
                                tagInput={tagInput}
                                selectedColor={selectedColor}
                                serviceColorMap={serviceColorMap}
                                assigneeColorMap={assigneeColorMap}
                                assigneeNameMap={assigneeNameMap}
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
            {mergeSelection && (
                <CustomerMergeSuggestionModal selection={mergeSelection}
                                              reservationMap={reservationMap}
                                              merging={false}
                                              onMerge={confirmMerge}
                                              onSkip={closeMergeLayer}
                                              onDismiss={closeMergeLayer} />
            )}
        </StyledTable>
    );
}

const StyledTable = styled.div`
    display: flex;
    flex-direction: column;
    padding: 0 10px 10px;
`;

const StyledSticky = styled.div`
    position: sticky;
    top: 0;
    padding: 20px 0 0;
    z-index: 2;
    backdrop-filter: var(--sticky-backdrop);
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

