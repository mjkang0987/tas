import React, {useState, useMemo, useRef, useEffect, useCallback} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import styled from 'styled-components';

import type {Customer} from '../utils/customers';
import {toCustomerMap} from '../utils/customers';
import type {Reservation, ReservationHistoryEntry} from '../utils/reservations';
import {groupByDate} from '../utils/reservations';
import {buildDesignerColorMap, buildDesignerNameMap} from '../utils/designers';
import {buildServiceColorMap} from '../utils/services';

import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';
import {AddressContent} from '../components/address/AddressContent';
import {PageHero} from '../components/ui/PageHero';

import {useCalendarStore} from '../store/calendarStore';

import {loadLocalDbSnapshot, subscribeLocalDb, type LocalDbSnapshot} from '../lib/local-db';
import {getPageSession, loadPageData} from '../lib/page-data';
import {SeoHead} from '../components/ui/SeoHead';

type AddressProps = {
    customers: Customer[];
    reservations: Reservation[];
    history: ReservationHistoryEntry[];
    storageMode: 'remote' | 'local';
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

const Address: NextPage<AddressProps> = ({customers, reservations, history, storageMode}) => {
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const storeCustomerMap = useCalendarStore((s) => s.customerMap);
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
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
    const [lastMerge, setLastMerge] = useState<{mergeHistoryIds: string[]; sourceNames: string[]; targetName: string} | null>(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem('lastMerge');
        if (saved) {
            sessionStorage.removeItem('lastMerge');
            try { return JSON.parse(saved); } catch { return null; }
        }
        return null;
    });

    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [localSnapshot, setLocalSnapshot] = useState<LocalDbSnapshot | null>(() => (
        storageMode === 'local' ? loadLocalDbSnapshot() : null
    ));
    const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestInput = useRef('');

    useEffect(() => {
        if (storageMode !== 'local') {
            return;
        }

        return subscribeLocalDb(setLocalSnapshot);
    }, [storageMode]);

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

    const effectiveCustomers = storageMode === 'local'
        ? (localSnapshot?.customers ?? Object.values(storeCustomerMap))
        : customers;
    const effectiveReservations = useMemo(() => {
        if (storageMode === 'local') {
            return localSnapshot?.reservations ?? Object.values(storeReservationMap).flat();
        }
        const storeFlat = Object.values(storeReservationMap).flat();
        return storeFlat.length > 0 ? storeFlat : reservations;
    }, [storageMode, localSnapshot, storeReservationMap, reservations]);
    const effectiveHistory = storageMode === 'local'
        ? (localSnapshot?.history ?? history)
        : history;

    const customerMap = useMemo(() => toCustomerMap(effectiveCustomers), [effectiveCustomers]);
    const customerList = useMemo(
        () => storageMode === 'local'
            ? Object.values(storeCustomerMap)
            : Object.keys(storeCustomerMap).length > 0
                ? Object.values(storeCustomerMap)
                : effectiveCustomers,
        [storageMode, effectiveCustomers, storeCustomerMap]
    );
    const reservationMap = useMemo(() => groupByDate(effectiveReservations), [effectiveReservations]);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerColorMap = useMemo(() => buildDesignerColorMap(designers), [designers]);
    const designerNameMap = useMemo(() => buildDesignerNameMap(designers), [designers]);

    const reservationsByCustomer = useMemo(() => {
        const map: Record<number, Reservation[]> = {};

        for (const r of effectiveReservations) {
            if (!map[r.customerId]) map[r.customerId] = [];
            map[r.customerId].push(r);
        }

        return map;
    }, [effectiveReservations]);

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

    const sortedCustomerList = useMemo(() => {
        const isKorean = (s: string) => /^[가-힣]/.test(s);
        return [...customerList].sort((a, b) => {
            const aKo = isKorean(a.name);
            const bKo = isKorean(b.name);
            if (aKo !== bKo) return aKo ? 1 : -1;
            return a.name.localeCompare(b.name, aKo ? 'ko' : 'en');
        });
    }, [customerList]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return sortedCustomerList;

        const term = searchTerm.trim().toLowerCase();
        const telTerm = term.replace(/-/g, '');

        return sortedCustomerList.filter((c) =>
            c.name.toLowerCase().includes(term) ||
            c.tel.includes(telTerm) ||
            (c.memoTags ?? []).some((t) => t.text.toLowerCase().includes(term))
        );
    }, [sortedCustomerList, searchTerm]);

    useEffect(() => {
        if (storageMode === 'local') {
            return;
        }

        setCustomerMap(customerMap);
    }, [storageMode, customerMap, setCustomerMap]);

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

    const handleMerge = useCallback(async (sourceIds: number[], targetId: number) => {
        const sourceCustomers = sourceIds.map((id) => customerList.find((c) => c.id === id));
        const targetCustomer = customerList.find((c) => c.id === targetId);

        try {
            const resp = await fetch('/api/customers/merge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sourceIds, targetId}),
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => null);
                alert(err?.error || '병합에 실패했습니다.');
                return;
            }

            const data = await resp.json();
            const mergeInfo = {
                mergeHistoryIds: data.mergeHistoryIds as string[],
                sourceNames: sourceCustomers.map((c) => c?.name ?? '?'),
                targetName: targetCustomer?.name ?? String(targetId),
            };
            sessionStorage.setItem('lastMerge', JSON.stringify(mergeInfo));

            window.location.reload();
        } catch {
            alert('병합 중 오류가 발생했습니다.');
        }
    }, [customerList]);

    const handleUnmerge = useCallback(async () => {
        if (!lastMerge) return;

        try {
            const resp = await fetch('/api/customers/unmerge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({mergeHistoryIds: lastMerge.mergeHistoryIds}),
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => null);
                alert(err?.error || '병합 분리에 실패했습니다.');
                return;
            }

            setLastMerge(null);
            window.location.reload();
        } catch {
            alert('병합 분리 중 오류가 발생했습니다.');
        }
    }, [lastMerge]);

    return (
        <StyledSection>
            <SeoHead title="고객명단" />
            <PageHero eyebrow="CUSTOMER" title="고객 명단" subtitle="고객 정보, 예약 이력, 메모 태그를 관리합니다." />
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
                onCustomerClick={openCustomerDetail}
                onMerge={handleMerge}
            />
            {lastMerge && (
                <StyledUndoToast>
                    <span>{lastMerge.sourceNames.length}명 → &quot;{lastMerge.targetName}&quot; 병합 완료</span>
                    <button type="button" onClick={handleUnmerge}>되돌리기</button>
                    <button type="button" onClick={() => setLastMerge(null)}>✕</button>
                </StyledUndoToast>
            )}
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={storeCustomerMap}
                                   reservationMap={reservationMap}
                                   history={effectiveHistory}
                                   onClose={() => setSelectedReservations((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={(prev, updated) => {
                                       setSelectedReservations((current) => current.map((item) => item.id === prev.id ? updated : item));
                                   }}
                                   onCancel={(targetReservation) => {
                                       setSelectedReservations((prev) => prev.filter((item) => item.id !== targetReservation.id));
                                   }}
                                   onRestore={useCalendarStore.getState().restoreReservation}/>
            ))}
            {selectedCustomerId !== null && storeCustomerMap[selectedCustomerId] && (
                <CustomerDetail customer={storeCustomerMap[selectedCustomerId]}
                                reservationMap={reservationMap}
                                onReservationClick={(reservation) => {
                                    setSelectedReservations((prev) => [...prev, reservation]);
                                }}
                                onClose={() => setSelectedCustomerId(null)}/>
            )}
        </StyledSection>
    );
};

export default Address;

export const getServerSideProps: GetServerSideProps<AddressProps> = async (ctx) => {
    const session = await getPageSession(ctx);
    if (!session) {
        return {
            props: {
                customers: [],
                reservations: [],
                history: [],
                storageMode: 'local',
            }
        };
    }

    const data = await loadPageData(session.storeId);

    return {
        props: {
            customers: data.customers,
            reservations: data.reservations,
            history: data.history,
            storageMode: 'remote',
        }
    };
};

const StyledSection = styled.section`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-self: flex-start;
    min-height: 100%;
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 8px 10px 0;
`;

const StyledUndoToast = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background-color: var(--black-color);
    color: #fff;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    white-space: nowrap;

    > button:first-of-type {
        padding: 4px 12px;
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: var(--radius-md);
        background: transparent;
        color: var(--blue-color);
        font-size: var(--small-font);
        font-weight: 600;
        cursor: pointer;
    }

    > button:last-of-type {
        padding: 2px 6px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.6);
        font-size: var(--font);
        cursor: pointer;
    }
`;
