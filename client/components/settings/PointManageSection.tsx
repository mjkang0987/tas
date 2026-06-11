import {useEffect, useMemo, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {PointHistoryEntry} from '../../utils/customers';
import type {Reservation} from '../../utils/reservations';
import {formatPrice} from '../../utils/services';
import {PageHero} from '../ui/PageHero';
import {actionButtonStyle} from './settings-styles';
import {PointHistoryTab} from './PointHistoryTab';
import {PointAdjustTab} from './PointAdjustTab';
import {PointSettingsTab} from './PointSettingsTab';

type PointManageTab = 'history' | 'adjust' | 'settings';

export const PointManageSection = () => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const updateStorePointSettings = useCalendarStore((s) => s.updateStorePointSettings);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const reservationMap = useCalendarStore((s) => s.reservationMap);

    const [search, setSearch] = useState('');
    const [amountByCustomer, setAmountByCustomer] = useState<Record<number, string>>({});
    const [isEditingPolicy, setIsEditingPolicy] = useState(false);
    const [pointSettingsDraft, setPointSettingsDraft] = useState(storeSettings.pointSettings);
    const [activeTab, setActiveTab] = useState<PointManageTab>('history');

    const customers = useMemo(
        () => Object.values(customerMap).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
        [customerMap]
    );

    const filteredCustomers = useMemo(() => {
        const keyword = search.trim();
        if (!keyword) return customers;
        return customers.filter((c) => c.name.includes(keyword) || c.tel.includes(keyword));
    }, [customers, search]);

    const totalPoints = useMemo(
        () => customers.reduce((sum, c) => sum + (c.points ?? 0), 0),
        [customers]
    );

    const customersWithPoints = useMemo(
        () => customers
            .filter((c) => (c.points ?? 0) > 0)
            .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name, 'ko')),
        [customers]
    );

    useEffect(() => {
        if (!isEditingPolicy) {
            setPointSettingsDraft(storeSettings.pointSettings);
        }
    }, [storeSettings.pointSettings, isEditingPolicy]);

    const isPolicyDirty = JSON.stringify(pointSettingsDraft) !== JSON.stringify(storeSettings.pointSettings);

    const allReservations = useMemo<Reservation[]>(
        () => Object.values(reservationMap).flat(),
        [reservationMap]
    );

    const handlePointHistoryClick = (entry: PointHistoryEntry) => {
        console.log('[point-click] entry:', entry.type, 'relatedReservationId:', entry.relatedReservationId);
        if (!entry.relatedReservationId) return;
        const reservation = allReservations.find((r) => r.id === entry.relatedReservationId);
        console.log('[point-click] found reservation:', reservation?.id, reservation?.date);
        if (reservation) openReservationDetailFromCustomer(reservation);
    };

    const applyPoints = (customerId: number, direction: 'add' | 'subtract') => {
        const raw = amountByCustomer[customerId] ?? '';
        const amount = Number(raw.replace(/[^0-9]/g, '')) || 0;
        if (amount <= 0) return;

        const customer = customerMap[customerId];
        if (!customer) return;

        const currentPoints = customer.points ?? 0;
        const nextPoints = direction === 'add'
            ? currentPoints + amount
            : Math.max(currentPoints - amount, 0);

        updateCustomer(customerId, {points: nextPoints}, {
            type: direction === 'add' ? 'manual_add' : 'manual_subtract',
            delta: direction === 'add' ? amount : -amount,
            description: direction === 'add' ? '수동 적립' : '수동 차감',
        });
        setAmountByCustomer((prev) => ({...prev, [customerId]: ''}));
    };

    return (
        <StyledWrap>
            <PageHero eyebrow="POINT" title="적립금 관리" subtitle="고객 적립금 내역 조회, 수동 적립/차감, 적립 정책을 설정합니다." />
            <StyledStickyHeader>
                <StyledTopBar>
                    <StyledTabRow>
                        <StyledTabButton type="button" $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>내역</StyledTabButton>
                        <StyledTabButton type="button" $active={activeTab === 'adjust'} onClick={() => setActiveTab('adjust')}>적립</StyledTabButton>
                        <StyledTabButton type="button" $active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>설정</StyledTabButton>
                    </StyledTabRow>
                    <StyledTotalBadge>
                        <span>전체 잔액</span>
                        <strong>{formatPrice(totalPoints)}</strong>
                    </StyledTotalBadge>
                </StyledTopBar>
            </StyledStickyHeader>

            {activeTab === 'history' && (
                <PointHistoryTab
                    customersWithPoints={customersWithPoints}
                    handlePointHistoryClick={handlePointHistoryClick}
                    openCustomerDetail={openCustomerDetail}
                />
            )}

            {activeTab === 'adjust' && (
                <PointAdjustTab
                    filteredCustomers={filteredCustomers}
                    search={search}
                    setSearch={setSearch}
                    amountByCustomer={amountByCustomer}
                    setAmountByCustomer={setAmountByCustomer}
                    applyPoints={applyPoints}
                    openCustomerDetail={openCustomerDetail}
                />
            )}

            {activeTab === 'settings' && (
                <PointSettingsTab
                    pointSettingsDraft={pointSettingsDraft}
                    setPointSettingsDraft={setPointSettingsDraft}
                    isEditingPolicy={isEditingPolicy}
                    setIsEditingPolicy={setIsEditingPolicy}
                    storeSettings={storeSettings}
                    updateStorePointSettings={updateStorePointSettings}
                    isPolicyDirty={isPolicyDirty}
                />
            )}
        </StyledWrap>
    );
};

const StyledWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StyledStickyHeader = styled.div`
    position: sticky;
    top: 0;
    z-index: 12;
    margin: 0 -10px;
    padding: 10px 10px;
    border-bottom: 1px solid var(--light-gray-color);
    backdrop-filter: var(--sticky-backdrop);
`;

const StyledTopBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledTotalBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 14px;
    }
`;

const StyledTabRow = styled.div`
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overscroll-behavior: auto;

    @media (max-width: 640px) {
        flex-wrap: wrap;
        overflow-x: visible;
    }
`;

const StyledTabButton = styled.button<{ $active: boolean }>`
    ${actionButtonStyle};
    flex-shrink: 0;
    min-width: 72px;
    border: 1px solid ${(props) => props.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    background: ${(props) => props.$active ? 'var(--info-bg)' : 'var(--white-color)'};
    color: ${(props) => props.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    font-weight: ${(props) => props.$active ? 700 : 500};
`;
