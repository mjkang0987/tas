import {useEffect, useMemo} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import Head from 'next/head';
import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';
import {buildServiceColorMap} from '../utils/services';
import type {Reservation, ReservationMap, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate, toDateKey} from '../utils/reservations';
import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {CustomerMap} from '../utils/customers';

import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';
import {DesignerManageSection} from '../components/settings/DesignerManageSection';
import {PointManageSection} from '../components/settings/PointManageSection';
import {RevenueSection, type RevenueDesignerKey, type RevenueQuickRange} from '../components/settings/RevenueSection';
import {ServiceManageSection} from '../components/settings/ServiceManageSection';
import {StoreManageSection} from '../components/settings/StoreManageSection';

import customersData from './api/customers.json';

type SettingsProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
};

type SettingsTab = 'revenue' | 'point' | 'service' | 'designer' | 'store';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function isValidDateKey(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00');
    return !Number.isNaN(d.getTime()) && toDateKey(d.getFullYear(), d.getMonth(), d.getDate()) === value;
}

function shiftDateKey(baseDate: Date, days: number): string {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ── Service Manage Section ── */

/* ── Settings Page ── */

const Settings: NextPage<SettingsProps> = ({reservations, customers, history}) => {
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const storeCustomerMap = useCalendarStore((s) => s.customerMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const designers = useCalendarStore((s) => s.designers);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const selectedReservations = useCalendarStore((s) => s.selectedReservations);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const closeReservationDetail = useCalendarStore((s) => s.closeReservationDetail);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
    const storeHistory = useCalendarStore((s) => s.reservationHistory);

    const router = useRouter();
    const target = useCalendarStore((s) => s.target);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const reservationMap = useMemo(() => groupByDate(reservations), [reservations]);
    const initialCustomerMap: CustomerMap = useMemo(() => toCustomerMap(customers), [customers]);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );

    const now = new Date();
    const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStartKey = toDateKey(now.getFullYear(), now.getMonth(), 1);
    const revenue30DaysStartKey = shiftDateKey(now, -30);
    const revenueWeekStartKey = shiftDateKey(now, -7);

    const q = router.query;
    const tab: SettingsTab = q.tab === 'service' || q.tab === 'designer' || q.tab === 'store' || q.tab === 'point' ? q.tab : 'revenue';
    const parsedDesignerId = typeof q.designer === 'string' ? Number(q.designer) : NaN;
    const revenueDesignerKey: RevenueDesignerKey = Number.isInteger(parsedDesignerId) && parsedDesignerId > 0
        ? String(parsedDesignerId) as RevenueDesignerKey
        : 'all';
    const startDateKey = typeof q.start === 'string' && isValidDateKey(q.start) ? q.start : monthStartKey;
    const endDateKey = typeof q.end === 'string' && isValidDateKey(q.end) ? q.end : todayKey;
    const selectedDateKey = typeof q.date === 'string' && isValidDateKey(q.date) ? q.date : endDateKey;
    const quickRange: RevenueQuickRange | null = startDateKey === revenue30DaysStartKey && endDateKey === todayKey
        ? 'month'
        : startDateKey === revenueWeekStartKey && endDateKey === todayKey
            ? 'week'
            : startDateKey === todayKey && endDateKey === todayKey
                ? 'today'
                : null;

    const replaceQuery = (patch: Record<string, string>) => {
        router.replace({pathname: '/settings', query: patch}, undefined, {shallow: true});
    };

    const setTab = (t: SettingsTab) => {
        if (t === 'revenue') {
            replaceQuery({
                tab: 'revenue',
                designer: revenueDesignerKey,
                start: startDateKey,
                end: endDateKey,
                date: selectedDateKey,
            });
        } else {
            replaceQuery({tab: t});
        }
    };

    const setRevenueDesigner = (designer: RevenueDesignerKey) => {
        replaceQuery({
            tab: 'revenue',
            designer,
            start: startDateKey,
            end: endDateKey,
            date: selectedDateKey,
        });
    };

    const setRevenueStartDate = (key: string) => {
        if (!isValidDateKey(key)) return;
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start: key,
            end: endDateKey,
            date: selectedDateKey,
        });
    };

    const setRevenueEndDate = (key: string) => {
        if (!isValidDateKey(key)) return;
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start: startDateKey,
            end: key,
            date: selectedDateKey,
        });
    };

    const setRevenueDateRange = (startKey: string, endKey: string, selectedKey?: string) => {
        if (!isValidDateKey(startKey) || !isValidDateKey(endKey)) return;
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start: startKey,
            end: endKey,
            date: selectedKey ?? endKey,
        });
    };

    const setRevenueSelectedDate = (key: string) => {
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start: startDateKey,
            end: endDateKey,
            date: key,
        });
    };

    const setRevenueQuickRange = (range: RevenueQuickRange) => {
        if (range === 'today') {
            replaceQuery({
                tab: 'revenue',
                designer: revenueDesignerKey,
                start: todayKey,
                end: todayKey,
                date: todayKey,
            });
            return;
        }

        const start = range === 'week' ? revenueWeekStartKey : revenue30DaysStartKey;
        replaceQuery({
            tab: 'revenue',
            designer: revenueDesignerKey,
            start,
            end: todayKey,
            date: todayKey,
        });
    };
    useEffect(() => {
        setCustomerMap(initialCustomerMap);
        setReservationMap(reservationMap);
        setReservationHistory(history);
    }, [initialCustomerMap, reservationMap, history]);

    return (
        <StyledSection>
            <Head>
                <title>Chairtime - 설정</title>
            </Head>
            <StyledHeading>설정</StyledHeading>
            <StyledPageTabs>
                <StyledPageTab type="button" $active={tab === 'revenue'} onClick={() => setTab('revenue')}>매출</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'point'} onClick={() => setTab('point')}>적립금 관리</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'store'} onClick={() => setTab('store')}>매장관리</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'service'} onClick={() => setTab('service')}>서비스 관리</StyledPageTab>
                <StyledPageTab type="button" $active={tab === 'designer'} onClick={() => setTab('designer')}>디자이너 관리</StyledPageTab>
            </StyledPageTabs>
            <StyledContent>
                {tab === 'revenue' && <RevenueSection reservationMap={reservationMap}
                                                      designers={designers}
                                                      customerMap={storeCustomerMap}
                                                      serviceColorMap={serviceColorMap}
                                                      onSelectReservation={openReservationDetail}
                                                      onSelectCustomer={openCustomerDetail}
                                                      designerKey={revenueDesignerKey}
                                                      setDesignerKey={setRevenueDesigner}
                                                      startDateKey={startDateKey}
                                                      setStartDateKey={setRevenueStartDate}
                                                      endDateKey={endDateKey}
                                                      setEndDateKey={setRevenueEndDate}
                                                      setDateRange={setRevenueDateRange}
                                                      selectedDateKey={selectedDateKey}
                                                      setSelectedDateKey={setRevenueSelectedDate}
                                                      quickRange={quickRange}
                                                      setQuickRange={setRevenueQuickRange}/>}
                {tab === 'point' && <PointManageSection />}
                {tab === 'store' && <StoreManageSection formatDateLabel={formatDateLabel}/>}
                {tab === 'service' && <ServiceManageSection/>}
                {tab === 'designer' && <DesignerManageSection/>}
            </StyledContent>
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={storeCustomerMap}
                                   reservationMap={storeReservationMap}
                                   history={storeHistory}
                                   onClose={() => closeReservationDetail(index)}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={updateReservation}
                                   onCancel={cancelReservation}/>
            ))}
            {selectedCustomerId !== null && storeCustomerMap[selectedCustomerId] && (
                <CustomerDetail customer={storeCustomerMap[selectedCustomerId]}
                                reservationMap={storeReservationMap}
                                onReservationClick={openReservationDetailFromCustomer}
                                onClose={() => setSelectedCustomerId(null)}/>
            )}
        </StyledSection>
    );
};

export default Settings;

export const getServerSideProps: GetServerSideProps<SettingsProps> = async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.join(process.cwd(), 'pages/api/reservations.json'), 'utf-8');
    const data = JSON.parse(raw);

    return {
        props: {
            reservations: data.reservations,
            customers: customersData.customers,
            history: data.history ?? [],
        }
    };
};

/* ── Page Layout Styles ── */

const StyledSection = styled.section`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-sizing: border-box;
`;

const StyledHeading = styled.h2`
    text-align: center;
    font-size: var(--big-font);
    font-weight: 600;
    padding: 20px 10px 10px;
`;

const StyledPageTabs = styled.div`
    display: flex;
    margin: 0 10px;
    border-bottom: 2px solid var(--light-gray-color);
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--white-color);
`;

const StyledPageTab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 10px;
    border: none;
    border-bottom: 2px solid ${(p) => p.$active ? 'var(--blue-color)' : 'transparent'};
    margin-bottom: -2px;
    background: none;
    font-size: 14px;
    font-weight: ${(p) => p.$active ? '600' : '400'};
    color: ${(p) => p.$active ? 'var(--blue-color)' : 'var(--dark-gray-color)'};
    cursor: pointer;
`;

const StyledContent = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 10px 20px;
    overflow-y: auto;
    overscroll-behavior: auto;
`;
