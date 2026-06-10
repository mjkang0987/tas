import {useEffect, useMemo, useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';
import {buildServiceColorMap} from '../utils/services';
import type {Reservation, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate, toDateKey} from '../utils/reservations';
import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {CustomerMap} from '../utils/customers';

import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';
import {DesignerManageSection} from '../components/settings/DesignerManageSection';
import {MemberSection} from '../components/settings/MemberSection';
import {PointManageSection} from '../components/settings/PointManageSection';
import {RevenueSection, type RevenueDesignerKey, type RevenueQuickRange} from '../components/settings/revenue';
import {ServiceManageSection} from '../components/settings/ServiceManageSection';
import {NaverBookingSection} from '../components/settings/NaverBookingSection';
import {SNSLinkingSection} from '../components/settings/SNSLinkingSection';
import {StoreManageSection} from '../components/settings/StoreManageSection';

import {loadLocalDbSnapshot, subscribeLocalDb, type LocalDbSnapshot} from '../lib/local-db';
import {getPageSession, loadPageData} from '../lib/page-data';
import {SeoHead} from '../components/ui/SeoHead';

type SettingsProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
    storageMode: 'remote' | 'local';
};

type SettingsTab = 'revenue' | 'point' | 'service' | 'designer' | 'store' | 'member' | 'sns' | 'naver';

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

function isSettingsTab(value: string): value is SettingsTab {
    return value === 'revenue' || value === 'point' || value === 'service' || value === 'designer' || value === 'store' || value === 'member' || value === 'sns' || value === 'naver';
}

/* ── Service Manage Section ── */

/* ── Settings Page ── */

const Settings: NextPage<SettingsProps> = ({reservations, customers, history, storageMode}) => {
    const resolveReservationsByIds = (reservationMap: ReturnType<typeof groupByDate>, reservationIds: number[]) => {
        const allReservations = Object.values(reservationMap).flat();
        return reservationIds
            .map((reservationId) => allReservations.find((item) => item.id === reservationId) ?? null)
            .filter((reservation): reservation is Reservation => reservation !== null);
    };
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const storeCustomerMap = useCalendarStore((s) => s.customerMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const designers = useCalendarStore((s) => s.designers);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const restoreReservation = useCalendarStore((s) => s.restoreReservation);
    const selectedReservationIds = useCalendarStore((s) => s.selectedReservations);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const closeReservationDetail = useCalendarStore((s) => s.closeReservationDetail);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
    const storeHistory = useCalendarStore((s) => s.reservationHistory);

    const router = useRouter();
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const [localSnapshot, setLocalSnapshot] = useState<LocalDbSnapshot | null>(() => (
        storageMode === 'local' ? loadLocalDbSnapshot() : null
    ));
    const reservationMap = useMemo(
        () => storageMode === 'local'
            ? storeReservationMap
            : (Object.keys(storeReservationMap).length > 0 ? storeReservationMap : groupByDate(reservations)),
        [storageMode, storeReservationMap, reservations]
    );
    const initialCustomerMap: CustomerMap = useMemo(() => toCustomerMap(customers), [customers]);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const selectedReservations = useMemo(
        () => resolveReservationsByIds(storeReservationMap, selectedReservationIds),
        [selectedReservationIds, storeReservationMap]
    );

    const now = new Date();
    const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStartKey = toDateKey(now.getFullYear(), now.getMonth(), 1);
    const revenue30DaysStartKey = shiftDateKey(now, -30);
    const revenueWeekStartKey = shiftDateKey(now, -7);

    const q = router.query;
    const tabQuery = typeof q.tab === 'string' ? q.tab : '';
    const tab: SettingsTab = isSettingsTab(tabQuery) ? tabQuery : 'revenue';
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

    const replaceQuery = (nextTab: SettingsTab, patch: Record<string, string>) => {
        router.replace({pathname: `/settings/${nextTab}`, query: patch}, undefined, {shallow: true});
    };

    const setRevenueDesigner = (designer: RevenueDesignerKey) => {
        replaceQuery('revenue', {
            designer,
            start: startDateKey,
            end: endDateKey,
            date: selectedDateKey,
        });
    };

    const setRevenueStartDate = (key: string) => {
        if (!isValidDateKey(key)) return;
        replaceQuery('revenue', {
            designer: revenueDesignerKey,
            start: key,
            end: endDateKey,
            date: selectedDateKey,
        });
    };

    const setRevenueEndDate = (key: string) => {
        if (!isValidDateKey(key)) return;
        replaceQuery('revenue', {
            designer: revenueDesignerKey,
            start: startDateKey,
            end: key,
            date: selectedDateKey,
        });
    };

    const setRevenueDateRange = (startKey: string, endKey: string, selectedKey?: string) => {
        if (!isValidDateKey(startKey) || !isValidDateKey(endKey)) return;
        replaceQuery('revenue', {
            designer: revenueDesignerKey,
            start: startKey,
            end: endKey,
            date: selectedKey ?? endKey,
        });
    };

    const setRevenueSelectedDate = (key: string) => {
        replaceQuery('revenue', {
            designer: revenueDesignerKey,
            start: startDateKey,
            end: endDateKey,
            date: key,
        });
    };

    const setRevenueQuickRange = (range: RevenueQuickRange) => {
        if (range === 'today') {
            replaceQuery('revenue', {
                designer: revenueDesignerKey,
                start: todayKey,
                end: todayKey,
                date: todayKey,
            });
            return;
        }

        const start = range === 'week' ? revenueWeekStartKey : revenue30DaysStartKey;
        replaceQuery('revenue', {
            designer: revenueDesignerKey,
            start,
            end: todayKey,
            date: todayKey,
        });
    };

    useEffect(() => {
        if (storageMode !== 'local') {
            return;
        }

        return subscribeLocalDb(setLocalSnapshot);
    }, [storageMode]);

    const remoteReservationMap = useMemo(
        () => storageMode === 'local' ? null : groupByDate(reservations),
        [storageMode, reservations]
    );

    useEffect(() => {
        if (storageMode === 'local' || !remoteReservationMap) {
            return;
        }

        setCustomerMap(initialCustomerMap);
        setReservationMap(remoteReservationMap);
        setReservationHistory(history);
    }, [storageMode, initialCustomerMap, remoteReservationMap, history, setCustomerMap, setReservationMap, setReservationHistory]);

    return (
        <StyledSection>
            <SeoHead title="설정" />
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
                {tab === 'member' && <MemberSection/>}
                {tab === 'sns' && <SNSLinkingSection/>}
                {tab === 'naver' && <NaverBookingSection/>}
                <StyledFooterCs>Take a seat CS: <a href="mailto:takeaseat.cs@gmail.com">takeaseat.cs@gmail.com</a></StyledFooterCs>
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
                                   onCancel={cancelReservation}
                                   onRestore={restoreReservation}/>
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

export const getServerSideProps: GetServerSideProps<SettingsProps> = async (ctx) => {
    const routeTab = typeof ctx.params?.tab === 'string' ? ctx.params.tab : null;
    const legacyTab = typeof ctx.query.tab === 'string' ? ctx.query.tab : null;
    const resolvedTab = routeTab ?? legacyTab;

    if (routeTab === null || !resolvedTab || !isSettingsTab(resolvedTab)) {
        const query = new URLSearchParams();

        Object.entries(ctx.query).forEach(([key, value]) => {
            if (key === 'tab') return;
            if (Array.isArray(value)) {
                value.forEach((entry) => query.append(key, entry));
                return;
            }
            if (typeof value === 'string')
                query.set(key, value);
        });

        const destinationTab = isSettingsTab(resolvedTab ?? '') ? resolvedTab : 'revenue';
        const destination = `/settings/${destinationTab}${query.toString() ? `?${query.toString()}` : ''}`;
        return {
            redirect: {
                destination,
                permanent: false,
            }
        };
    }

    const session = await getPageSession(ctx);
    if (!session) {
        return {
            props: {
                reservations: [],
                customers: [],
                history: [],
                storageMode: 'local',
            }
        };
    }

    const data = await loadPageData(session.storeId);

    return {
        props: {
            reservations: data.reservations,
            customers: data.customers,
            history: data.history,
            storageMode: 'remote',
        }
    };
};

/* ── Page Layout Styles ── */

const StyledSection = styled.section`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-self: flex-start;
    min-height: 100%;
    box-sizing: border-box;
`;

const StyledContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 8px 10px 20px;
    box-sizing: border-box;
`;

const StyledFooterCs = styled.p`
    margin: auto 0 0;
    padding: 24px 0 0;
    text-align: center;
    font-size: 12px;
    color: var(--dark-gray-color2);

    a {
        color: inherit;
        text-decoration: none;
        font-weight: 600;

        @media (hover: hover) and (pointer: fine) {
            &:hover { text-decoration: underline; }
        }
    }
`;
