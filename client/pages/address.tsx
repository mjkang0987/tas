import React, {useState, useMemo, useRef, useEffect, useCallback} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import Head from 'next/head';

import styled from 'styled-components';

import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {Reservation, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate} from '../utils/reservations';
import {getDesignerColor} from '../utils/designers';
import {buildServiceColorMap} from '../utils/services';

import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';
import {AddressContent} from '../components/address/AddressContent';

import {useCalendarStore} from '../store/calendarStore';

import {getPageSession, loadPageData} from '../lib/page-data';

type AddressProps = {
    customers: Customer[];
    reservations: Reservation[];
    history: ReservationHistoryEntry[];
};

const TAG_COLORS = [
    '#4285F4',
    '#34A853',
    '#EA4335',
    '#FBBC04',
    '#FF6D01',
    '#46BDC6',
    '#9334E6',
    '#E91E8C',
];

const Address: NextPage<AddressProps> = ({customers, reservations, history}) => {
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const storeCustomerMap = useCalendarStore((s) => s.customerMap);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const designers = useCalendarStore((s) => s.designers);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
    const [selectedReservations, setSelectedReservations] = useState<Reservation[]>([]);

    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestInput = useRef('');

    useEffect(() => {
        return () => {
            if (throttleRef.current) clearTimeout(throttleRef.current);
        };
    }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        latestInput.current = value;

        if (!throttleRef.current) {
            setSearchTerm(value);
            throttleRef.current = setTimeout(() => {
                setSearchTerm(latestInput.current);
                throttleRef.current = null;
            }, 300);
        }
    }, []);

    const customerMap = useMemo(() => toCustomerMap(customers), [customers]);
    const customerList = useMemo(
        () => customers.map((customer) => storeCustomerMap[customer.id] ?? customer),
        [customers, storeCustomerMap]
    );
    const reservationMap = useMemo(() => groupByDate(reservations), [reservations]);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerColorMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = getDesignerColor(designer);
            return acc;
        }, {}),
        [designers]
    );
    const designerNameMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = designer.name;
            return acc;
        }, {}),
        [designers]
    );

    const reservationsByCustomer = useMemo(() => {
        const map: Record<number, Reservation[]> = {};

        for (const r of reservations) {
            if (!map[r.customerId]) map[r.customerId] = [];
            map[r.customerId].push(r);
        }

        return map;
    }, [reservations]);

    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const customerStats = useMemo(() => {
        const stats: Record<number, {
            recentService: string;
            booked: number;
            cancelled: number;
            completed: number;
            noshow: number;
        }> = {};

        for (const [customerId, rList] of Object.entries(reservationsByCustomer)) {
            const id = Number(customerId);
            let booked = 0, cancelled = 0, completed = 0, noshow = 0;

            for (const r of rList) {
                if (r.status === 'cancelled') cancelled++;
                else if (r.status === 'noshow') noshow++;
                else if (r.status === 'completed') completed++;
                else if (r.date < today) completed++;
                else booked++;
            }

            const valid = rList
                .filter((r) => r.status !== 'cancelled' && r.status !== 'noshow')
                .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

            stats[id] = {
                recentService: valid.length > 0 ? valid[0].service : '-',
                booked,
                cancelled,
                completed,
                noshow,
            };
        }

        return stats;
    }, [reservationsByCustomer, today]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customerList;

        const term = searchTerm.trim().toLowerCase();
        const telTerm = term.replace(/-/g, '');

        return customerList.filter((c) =>
            c.name.toLowerCase().includes(term) ||
            c.tel.includes(telTerm) ||
            (c.memoTags ?? []).some((t) => t.text.toLowerCase().includes(term))
        );
    }, [customerList, searchTerm]);

    useEffect(() => {
        setCustomerMap(customerMap);
    }, [customerMap, setCustomerMap]);

    const addTag = (id: number) => {
        const value = tagInput.trim();
        if (!value) return;
        const customer = storeCustomerMap[id];
        if (!customer) return;

        const existing = customer.memoTags ?? [];
        if (existing.some((tag) => tag.text === value)) return;

        updateCustomer(id, {
            memoTags: [...existing, {text: value, color: selectedColor}],
        });
        setTagInput('');
    };

    const removeTag = (id: number, text: string) => {
        const customer = storeCustomerMap[id];
        if (!customer) return;

        updateCustomer(id, {
            memoTags: (customer.memoTags ?? []).filter((tag) => tag.text !== text),
        });
    };

    return (
        <StyledSection>
            <Head>
                <title>RESERVATION - 고객명단</title>
            </Head>
            <AddressContent
                filteredCustomers={filteredCustomers}
                reservationsByCustomer={reservationsByCustomer}
                editingId={editingId}
                tagColors={TAG_COLORS}
                tagInput={tagInput}
                selectedColor={selectedColor}
                serviceColorMap={serviceColorMap}
                designerColorMap={designerColorMap}
                designerNameMap={designerNameMap}
                today={today}
                customerStats={customerStats}
                searchInput={searchInput}
                onSearchChange={handleSearchChange}
                onTagInputChange={setTagInput}
                onSelectColor={setSelectedColor}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onStartEditing={(customerId) => {
                    setEditingId(customerId);
                    setTagInput('');
                }}
                onFinishEditing={() => {
                    setEditingId(null);
                    setTagInput('');
                }}
                onReservationClick={(reservation) => {
                    setSelectedReservations((prev) => [...prev, reservation]);
                }}
            />
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={storeCustomerMap}
                                   reservationMap={reservationMap}
                                   history={history}
                                   onClose={() => setSelectedReservations((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={(prev, updated) => {
                                       setSelectedReservations((current) => current.map((item) => item.id === prev.id ? updated : item));
                                   }}
                                   onCancel={(targetReservation) => {
                                       setSelectedReservations((prev) => prev.filter((item) => item.id !== targetReservation.id));
                                   }}/>
            ))}
            {selectedCustomerId !== null && storeCustomerMap[selectedCustomerId] && (
                <CustomerDetail customer={storeCustomerMap[selectedCustomerId]}
                                reservationMap={reservationMap}
                                onReservationClick={openReservationDetailFromCustomer}
                                onClose={() => setSelectedCustomerId(null)}/>
            )}
        </StyledSection>
    );
};

export default Address;

export const getServerSideProps: GetServerSideProps<AddressProps> = async (ctx) => {
    const session = await getPageSession(ctx);
    if (!session) {
        return {redirect: {destination: '/login', permanent: false}};
    }

    const data = await loadPageData(session.storeId);

    return {
        props: {
            customers: data.customers,
            reservations: data.reservations,
            history: data.history,
        }
    };
};

const StyledSection = styled.section`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    overflow-y: auto;
    overscroll-behavior: auto;
    box-sizing: border-box;
`;
