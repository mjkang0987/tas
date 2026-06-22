import {create} from 'zustand';

import type {Reservation, ReservationMap, ReservationHistoryEntry, ReservationStatus} from '../utils/reservations';
import {hasCompletedPayment} from '../utils/reservations';
import type {Customer, CustomerMap} from '../utils/customers';
import type {PointHistoryEntry} from '../utils/customers';
import {appendPointHistories, syncCustomerFirstVisitDates} from '../utils/customers';
import type {ServiceItem} from '../utils/services';
import {CATEGORY_BASE_COLOR_MAP} from '../utils/services';
import type {DaySchedule, Designer, DesignerStatus} from '../utils/designers';
import type {StoreSettings} from '../utils/storeSettings';
import type {SyncNotification} from '../hooks/useNaverBookingSync';
import {DEFAULT_STORE_SETTINGS} from '../utils/storeSettings';
import {
    buildAddedDesignerState,
    buildDeletedDesignerState,
    buildUpdatedDesignerDayState,
    buildUpdatedDesignerState,
} from './calendarStoreDesignerHelpers';
import {
    syncCustomerSettings,
    syncDesignerSettings,
    syncReservationState,
    syncServiceSettings,
    syncStoreInfo,
    syncStoreSettings,
} from './calendarStoreHelpers';
import {
    buildClosedReservationState,
    buildOpenedReservationState,
} from './calendarStoreOverlayHelpers';
import {
    buildAddedReservationMap,
    buildCancelledReservationState,
    buildUpdatedReservationState,
} from './calendarStoreReservationHelpers';
import {
    buildAddedServiceState,
    buildDeletedServiceState,
    buildMovedCategoryState,
    buildMovedServiceInCategoryState,
    buildRenamedCategoryState,
    buildServiceCatalogReservationUpdates,
    buildUpdatedServiceState,
} from './calendarStoreServiceHelpers';
import {
    buildAddedStoreClosedDateState,
    buildRemovedStoreClosedDateState,
    buildUpdatedStoreBusinessHoursState,
    buildUpdatedStoreClosedDatesState,
    buildUpdatedStorePointSettingsState,
} from './calendarStoreStoreSettingsHelpers';
import {shouldUseLocalDb} from '../lib/local-db';

// ── Notification localStorage persistence ──

const SYNC_NOTIFICATIONS_KEY = 'sync-notifications';

function loadSyncNotifications(): SyncNotification[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(SYNC_NOTIFICATIONS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Array<SyncNotification & {timestamp: string}>;
        const seenIds = new Set<string>();
        const deduped: SyncNotification[] = [];
        for (const n of parsed) {
            if (seenIds.has(n.id)) continue;
            seenIds.add(n.id);
            deduped.push({...n, timestamp: new Date(n.timestamp)});
        }
        return deduped;
    } catch {
        return [];
    }
}

function saveSyncNotifications(notifications: SyncNotification[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(SYNC_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch {
        // Silently ignore storage errors
    }
}

export type FullType = Date | null;

export interface DateType {
    full: FullType;
    fullYear: number;
    month: number;
    date: number;
    day: number;
}

export interface AsideSlice {
    isVisible: boolean;
}

export interface ViewSlice {
    type: string;
}

export interface TimeSlice {
    start: number;
    end: number;
    is12Hour: boolean;
}

export interface RouterSlice {
    arrayRouter: Array<string | number>;
    isRootPath: boolean;
    isCalendarPath: boolean;
}

export interface CreateReservationInitial {
    date: string;
    startTime: string;
}

export interface CalendarState {
    today: FullType;
    target: DateType;
    aside: AsideSlice;
    view: ViewSlice;
    time: TimeSlice;
    router: RouterSlice;
    reservationMap: ReservationMap;
    customerMap: CustomerMap;
    selectedReservation: number | null;
    selectedReservations: number[];
    reservationHistory: ReservationHistoryEntry[];
    reservationListFilter: { type: 'month'; year: number; month: number } | { type: 'date'; dateKey: string } | null;
    createReservationInitial: CreateReservationInitial | null;
    selectedCustomerId: number | null;
    calendarDesignerId: number | null;
    serviceCatalog: ServiceItem[];
    categoryBaseColorMap: Record<string, string>;
    designers: Designer[];
    storeName: string;
    shopType: string | null;
    storeSettings: StoreSettings;
    syncNotifications: SyncNotification[];

    setToday: (v: FullType) => void;
    setTarget: (partial: Partial<DateType>) => void;
    setTargetFromDate: (value: Date | string | number) => void;
    setAside: (v: AsideSlice | ((prev: AsideSlice) => AsideSlice)) => void;
    setView: (v: ViewSlice | ((prev: ViewSlice) => ViewSlice)) => void;
    setTime: (v: TimeSlice | ((prev: TimeSlice) => TimeSlice)) => void;
    setRouterSlice: (v: RouterSlice | ((prev: RouterSlice) => RouterSlice)) => void;
    setReservationMap: (map: ReservationMap) => void;
    setCustomerMap: (map: CustomerMap) => void;
    addCustomer: (customer: Customer) => void;
    updateCustomer: (
        customerId: number,
        patch: Partial<Customer>,
        pointHistory?: Array<Omit<PointHistoryEntry, 'id' | 'balance' | 'createdAt'>> | Omit<PointHistoryEntry, 'id' | 'balance' | 'createdAt'>
    ) => void;
    setSelectedReservation: (v: number | null) => void;
    setSelectedReservations: (v: number[]) => void;
    openReservationDetail: (reservation: Reservation) => void;
    openReservationDetailFromCustomer: (reservation: Reservation) => void;
    closeReservationDetail: (layerIndex: number) => void;
    setReservationHistory: (history: ReservationHistoryEntry[]) => void;
    setReservationListFilter: (v: CalendarState['reservationListFilter']) => void;
    setCreateReservationInitial: (v: CreateReservationInitial | null) => void;
    setSelectedCustomerId: (v: number | null) => void;
    openCustomerDetail: (customerId: number) => void;
    setCalendarDesignerId: (v: number | null) => void;
    setServiceCatalog: (catalog: ServiceItem[]) => void;
    setCategoryBaseColorMap: (colorMap: Record<string, string>) => void;
    setDesigners: (designers: Designer[]) => void;
    setStoreInfo: (name: string, type: string | null) => void;
    updateStoreInfo: (name: string, type: string | null) => void;
    setStoreSettings: (storeSettings: StoreSettings) => void;
    updateStoreBusinessHours: (hours: Partial<StoreSettings['businessHours']>) => void;
    updateStorePointSettings: (pointSettings: Partial<StoreSettings['pointSettings']>) => void;
    updateStoreClosedDates: (dates: string[]) => void;
    addStoreClosedDate: (date: string) => void;
    removeStoreClosedDate: (date: string) => void;
    addDesigner: (name: string, status?: DesignerStatus, phone?: string, note?: string, color?: string) => void;
    updateDesigner: (designerId: number, patch: Partial<Pick<Designer, 'name' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    updateDesignerDay: (designerId: number, dayIndex: number, patch: Partial<DaySchedule>) => void;
    deleteDesigner: (designerId: number) => void;
    updateCategoryBaseColor: (category: string, color: string) => void;
    addService: (item: ServiceItem) => void;
    updateService: (name: string, updated: ServiceItem) => number;
    deleteService: (name: string) => void;
    renameCategory: (prevCategory: string, nextCategory: string) => void;
    moveCategory: (dragCategory: string, targetCategory: string) => void;
    moveServiceInCategory: (dragName: string, targetName: string) => void;
    addReservation: (reservation: Reservation) => void;
    updateReservation: (prev: Reservation, updated: Reservation) => void;
    cancelReservation: (reservation: Reservation, status?: ReservationStatus) => void;
    restoreReservation: (reservation: Reservation) => void;
    deleteReservation: (reservation: Reservation) => void;
    addSyncNotifications: (items: SyncNotification[]) => void;
    markSyncNotificationRead: (id: string) => void;
    markSyncNotificationsRead: () => void;
    updateConflictNotificationStatus: (conflictKey: string, status: 'pending' | 'deferred' | 'confirmed') => void;
    replaceMockConflictNotifications: (items: SyncNotification[]) => void;
    clearSyncNotifications: () => void;
    initSyncNotifications: () => void;
    patchNotificationNames: () => void;
}

type ServiceSettingsState = Pick<CalendarState, 'serviceCatalog' | 'categoryBaseColorMap'>;

function withSyncedCatalog(state: ServiceSettingsState, nextCatalog: ServiceItem[]) {
    syncServiceSettings(nextCatalog, state.categoryBaseColorMap);
    return {serviceCatalog: nextCatalog};
}

function withSyncedCategoryColors(state: ServiceSettingsState, nextCategoryBaseColorMap: Record<string, string>) {
    syncServiceSettings(state.serviceCatalog, nextCategoryBaseColorMap);
    return {categoryBaseColorMap: nextCategoryBaseColorMap};
}

function resolveLatestReservation(reservationMap: ReservationMap, reservation: Reservation): Reservation {
    const dateReservations = reservationMap[reservation.date] ?? [];
    return dateReservations.find((item) => item.id === reservation.id) ?? reservation;
}

export const useCalendarStore = create<CalendarState>((set) => ({
    today: null,
    target: {
        full    : null,
        fullYear: 0,
        month   : 0,
        date    : 0,
        day     : 0
    },
    aside: {
        isVisible: false,
    },
    view: {
        type: 'week'
    },
    time: {
        start   : 10,
        end     : 20,
        is12Hour: false
    },
    router: {
        arrayRouter   : [],
        isRootPath    : false,
        isCalendarPath: false
    },
    reservationMap: {},
    customerMap: {},
    selectedReservation: null,
    selectedReservations: [],
    reservationHistory: [],
    reservationListFilter: null,
    createReservationInitial: null,
    selectedCustomerId: null,
    calendarDesignerId: null,
    serviceCatalog: [],
    categoryBaseColorMap: CATEGORY_BASE_COLOR_MAP,
    designers: [],
    storeName: '',
    shopType: null,
    storeSettings: DEFAULT_STORE_SETTINGS,
    syncNotifications: [],

    setToday: (today) => set({today}),

    setTarget: (partial) =>
        set((state) => ({
            target: {...state.target, ...partial}
        })),

    setTargetFromDate: (value) => {
        const target = new Date(value);
        set({
            target: {
                full    : target,
                fullYear: target.getFullYear(),
                month   : target.getMonth(),
                date    : target.getDate(),
                day     : target.getDay()
            }
        });
    },

    setAside: (v) =>
        set((state) => {
            const next = typeof v === 'function' ? v(state.aside) : v;
            if (typeof window !== 'undefined') {
                localStorage.setItem('aside-visible', String(next.isVisible));
            }
            return {aside: next};
        }),

    setView: (v) =>
        set((state) => ({
            view: typeof v === 'function' ? v(state.view) : v
        })),

    setTime: (v) =>
        set((state) => ({
            time: typeof v === 'function' ? v(state.time) : v
        })),

    setRouterSlice: (v) =>
        set((state) => ({
            router: typeof v === 'function' ? v(state.router) : v
        })),

    setReservationMap: (reservationMap) =>
        set((state) => {
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, reservationMap);
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {reservationMap, customerMap: nextCustomerMap};
        }),

    setCustomerMap: (customerMap) =>
        set((state) => {
            const nextCustomerMap = syncCustomerFirstVisitDates(customerMap, state.reservationMap);
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {customerMap: nextCustomerMap};
        }),

    addCustomer: (customer) =>
        set((state) => {
            const nextCustomerMap = {
                ...state.customerMap,
                [customer.id]: customer
            };
            const normalizedCustomerMap = syncCustomerFirstVisitDates(nextCustomerMap, state.reservationMap);
            if (Object.keys(normalizedCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(normalizedCustomerMap));
            }
            return {customerMap: normalizedCustomerMap};
        }),

    updateCustomer: (customerId, patch, pointHistory) =>
        set((state) => {
            const currentCustomer = state.customerMap[customerId];
            if (!currentCustomer) return state;

            const pointHistories = Array.isArray(pointHistory)
                ? pointHistory
                : pointHistory
                    ? [pointHistory]
                    : [];
            const customerWithHistory = pointHistories.length > 0
                ? appendPointHistories(currentCustomer, pointHistories)
                : currentCustomer;
            const nextCustomer = {
                ...customerWithHistory,
                ...patch,
            };

            const nextCustomerMap = {
                ...state.customerMap,
                [customerId]: nextCustomer,
            };
            const normalizedCustomerMap = syncCustomerFirstVisitDates(nextCustomerMap, state.reservationMap);
            if (Object.keys(normalizedCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(normalizedCustomerMap));
            }
            return {customerMap: normalizedCustomerMap};
        }),

    setSelectedReservation: (selectedReservation) => set({selectedReservation}),

    setSelectedReservations: (selectedReservations) => set({
        selectedReservations,
        selectedReservation: selectedReservations[selectedReservations.length - 1] ?? null,
    }),

    openReservationDetail: (selectedReservation) =>
        set((state) => buildOpenedReservationState(
            state,
            resolveLatestReservation(state.reservationMap, selectedReservation).id
        )),

    openReservationDetailFromCustomer: (selectedReservation) =>
        set((state) => buildOpenedReservationState(
            state,
            resolveLatestReservation(state.reservationMap, selectedReservation).id
        )),

    closeReservationDetail: (layerIndex) =>
        set((state) => buildClosedReservationState(state, layerIndex)),

    setReservationHistory: (reservationHistory) => set({reservationHistory}),

    setReservationListFilter: (reservationListFilter) => set({reservationListFilter}),

    setCreateReservationInitial: (createReservationInitial) => set({createReservationInitial}),

    setSelectedCustomerId: (selectedCustomerId) => set({selectedCustomerId}),

    openCustomerDetail: (selectedCustomerId) =>
        set({
            selectedCustomerId,
            createReservationInitial: null,
        }),

    setCalendarDesignerId: (calendarDesignerId) => set({calendarDesignerId}),

    setServiceCatalog: (serviceCatalog) => set({serviceCatalog}),
    setCategoryBaseColorMap: (categoryBaseColorMap) => set({categoryBaseColorMap}),
    setDesigners: (designers) => set({designers}),
    setStoreInfo: (storeName, shopType) => set({storeName, shopType}),
    updateStoreInfo: (storeName, shopType) => {
        set({storeName, shopType});
        syncStoreInfo(storeName, shopType);
    },
    setStoreSettings: (storeSettings) => set({storeSettings}),

    updateStoreBusinessHours: (hours) =>
        set((state) => {
            const nextStoreSettings = buildUpdatedStoreBusinessHoursState(state.storeSettings, hours);
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    updateStorePointSettings: (pointSettings) =>
        set((state) => {
            const nextStoreSettings = buildUpdatedStorePointSettingsState(state.storeSettings, pointSettings);
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    updateStoreClosedDates: (dates) =>
        set((state) => {
            const nextStoreSettings = buildUpdatedStoreClosedDatesState(state.storeSettings, dates);
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    addStoreClosedDate: (date) =>
        set((state) => {
            const nextStoreSettings = buildAddedStoreClosedDateState(state.storeSettings, date);
            if (!nextStoreSettings) return state;
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    removeStoreClosedDate: (date) =>
        set((state) => {
            const nextStoreSettings = buildRemovedStoreClosedDateState(state.storeSettings, date);
            if (!nextStoreSettings) return state;
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    addDesigner: (name, status = '재직', phone = '', note = '', color) =>
        set((state) => {
            const nextDesigners = buildAddedDesignerState(state.designers, name, status, phone, note, color);
            if (!nextDesigners) return state;

            syncDesignerSettings(nextDesigners);
            return {designers: nextDesigners};
        }),

    updateDesigner: (designerId, patch) =>
        set((state) => {
            const nextDesigners = buildUpdatedDesignerState(state.designers, designerId, patch);
            syncDesignerSettings(nextDesigners);
            return {designers: nextDesigners};
        }),

    updateDesignerDay: (designerId, dayIndex, patch) =>
        set((state) => {
            const nextDesigners = buildUpdatedDesignerDayState(state.designers, designerId, dayIndex, patch);
            if (!nextDesigners) return state;
            syncDesignerSettings(nextDesigners);
            return {designers: nextDesigners};
        }),

    deleteDesigner: (designerId) =>
        set((state) => {
            const nextDesigners = buildDeletedDesignerState(state.designers, designerId);
            syncDesignerSettings(nextDesigners);
            return {designers: nextDesigners};
        }),

    updateCategoryBaseColor: (category, color) =>
        set((state) => {
            if (state.categoryBaseColorMap[category] === color) return state;

            const nextCategoryBaseColorMap = {
                ...state.categoryBaseColorMap,
                [category]: color
            };
            return withSyncedCategoryColors(state, nextCategoryBaseColorMap);
        }),

    addService: (item) =>
        set((state) => {
            const nextCatalog = buildAddedServiceState(state.serviceCatalog, item);
            return withSyncedCatalog(state, nextCatalog);
        }),

    updateService: (name, updated) => {
        const {serviceCatalog: prevCatalog, reservationMap, reservationHistory} = useCalendarStore.getState();
        const nextCatalog = buildUpdatedServiceState(prevCatalog, name, updated);
        const {nextReservationMap, updates} = buildServiceCatalogReservationUpdates(
            reservationMap, name, updated.name, prevCatalog, nextCatalog,
        );

        set((state) => {
            const synced = withSyncedCatalog(state, nextCatalog);
            return updates.length > 0
                ? {...synced, reservationMap: nextReservationMap}
                : synced;
        });

        // 변경된 예약 영속화: 로컬 모드는 스냅샷, 원격은 변경 건마다 PUT (전체 예약이 메모리에 있음)
        if (updates.length > 0) {
            syncReservationState(nextReservationMap, reservationHistory);
            if (!shouldUseLocalDb()) {
                for (const change of updates) {
                    fetch('/api/reservations', {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(change),
                    }).catch(() => {});
                }
            }
        }

        return updates.length;
    },

    deleteService: (name) =>
        set((state) => {
            const nextCatalog = buildDeletedServiceState(state.serviceCatalog, name);
            return withSyncedCatalog(state, nextCatalog);
        }),

    renameCategory: (prevCategory, nextCategory) =>
        set((state) => {
            const nextState = buildRenamedCategoryState(
                state.serviceCatalog,
                state.categoryBaseColorMap,
                prevCategory,
                nextCategory
            );
            if (!nextState) return state;

            syncServiceSettings(nextState.serviceCatalog, nextState.categoryBaseColorMap);
            return nextState;
        }),

    moveCategory: (dragCategory, targetCategory) =>
        set((state) => {
            const nextCatalog = buildMovedCategoryState(state.serviceCatalog, dragCategory, targetCategory);
            if (!nextCatalog) return state;
            return withSyncedCatalog(state, nextCatalog);
        }),

    moveServiceInCategory: (dragName, targetName) =>
        set((state) => {
            const nextCatalog = buildMovedServiceInCategoryState(state.serviceCatalog, dragName, targetName);
            if (!nextCatalog) return state;
            return withSyncedCatalog(state, nextCatalog);
        }),

    addReservation: (reservation) => {
        let nextReservationMap: ReservationMap | null = null;

        set((state) => {
            const nextMap = buildAddedReservationMap(state.reservationMap, reservation);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            nextReservationMap = nextMap;
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {reservationMap: nextMap, customerMap: nextCustomerMap, createReservationInitial: null};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, useCalendarStore.getState().reservationHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        fetch('/api/reservations', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(reservation)
        });
    },

    updateReservation: (prev, updated) => {
        if (updated.status === 'completed' && !hasCompletedPayment(updated)) {
            return;
        }

        let nextReservationMap: ReservationMap | null = null;
        let nextHistory: ReservationHistoryEntry[] = [];

        set((state) => {
            const nextState = buildUpdatedReservationState(state, prev, updated);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextState.reservationMap);
            nextReservationMap = nextState.reservationMap;
            nextHistory = nextState.reservationHistory;
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {...nextState, customerMap: nextCustomerMap};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, nextHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        fetch('/api/reservations', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prev, updated})
        })
            .then(async (response) => {
                if (!response.ok) return null;
                return response.json() as Promise<{reservation?: Reservation}>;
            })
            .then((data) => {
                const savedReservation = data?.reservation;
                if (!savedReservation) return;

                set((state) => {
                    const nextMap = {...state.reservationMap};
                    const oldKey = prev.date;
                    const newKey = savedReservation.date;

                    if (nextMap[oldKey]) {
                        nextMap[oldKey] = nextMap[oldKey].filter((reservation) => reservation.id !== prev.id);
                        if (nextMap[oldKey].length === 0) delete nextMap[oldKey];
                    }

                    if (!nextMap[newKey]) nextMap[newKey] = [];
                    const existingIndex = nextMap[newKey].findIndex((reservation) => reservation.id === savedReservation.id);
                    if (existingIndex > -1) {
                        nextMap[newKey][existingIndex] = savedReservation;
                    } else {
                        nextMap[newKey].push(savedReservation);
                    }

                    return {
                        reservationMap: nextMap,
                        selectedReservation: state.selectedReservation === savedReservation.id
                            ? savedReservation.id
                            : state.selectedReservation,
                        selectedReservations: state.selectedReservations,
                    };
                });
            })
            .catch(() => {
                // Preserve optimistic local UX if the sync request fails.
            });
    },

    cancelReservation: (reservation, status = 'cancelled') => {
        const updated: Reservation = {...reservation, status};

        let nextReservationMap: ReservationMap | null = null;
        let nextHistory: ReservationHistoryEntry[] = [];

        set((state) => {
            const nextState = buildCancelledReservationState(state, reservation, updated);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextState.reservationMap);
            nextReservationMap = nextState.reservationMap;
            nextHistory = nextState.reservationHistory;
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {...nextState, customerMap: nextCustomerMap};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, nextHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        fetch('/api/reservations', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id, status})
        });
    },

    restoreReservation: (reservation) => {
        const updated: Reservation = {...reservation, status: 'active'};

        let nextReservationMap: ReservationMap | null = null;
        let nextHistory: ReservationHistoryEntry[] = [];

        set((state) => {
            const reservations = state.reservationMap[reservation.date] ?? [];
            const nextDateReservations = reservations.map((r) =>
                r.id === reservation.id ? updated : r
            );
            const nextMap = {...state.reservationMap, [reservation.date]: nextDateReservations};
            const historyEntry: ReservationHistoryEntry = {
                reservationId: reservation.id,
                before: reservation,
                after: updated,
                timestamp: new Date().toISOString(),
            };
            nextHistory = [...state.reservationHistory, historyEntry];
            nextReservationMap = nextMap;
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {
                reservationMap: nextMap,
                reservationHistory: nextHistory,
                customerMap: nextCustomerMap,
            };
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, nextHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        fetch('/api/reservations', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id, status: 'active'})
        });
    },

    deleteReservation: (reservation) => {
        let nextReservationMap: ReservationMap | null = null;

        set((state) => {
            const dateReservations = state.reservationMap[reservation.date] ?? [];
            const nextDateReservations = dateReservations.filter((r) => r.id !== reservation.id);
            const nextMap = {...state.reservationMap, [reservation.date]: nextDateReservations};
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            nextReservationMap = nextMap;
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {reservationMap: nextMap, customerMap: nextCustomerMap};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, useCalendarStore.getState().reservationHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        fetch('/api/reservations', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id})
        });
    },

    addSyncNotifications: (items) =>
        set((state) => {
            const existingIds = new Set(state.syncNotifications.map((n) => n.id));
            const existingConflictKeys = new Set(
                state.syncNotifications.filter((n) => n.conflictKey).map((n) => n.conflictKey)
            );
            const newItems = items.filter((item) => {
                if (existingIds.has(item.id)) return false;
                if (item.conflictKey && existingConflictKeys.has(item.conflictKey)) return false;
                return true;
            });
            if (newItems.length === 0) return {};

            // 취소 알림이 추가될 때, 같은 bookingId의 기존 확정 알림을 읽음 처리
            const cancelledBookingIds = new Set(
                newItems.filter((n) => n.type === 'cancel').map((n) => n.bookingId)
            );
            const existing = cancelledBookingIds.size > 0
                ? state.syncNotifications.map((n) =>
                    !n.type && cancelledBookingIds.has(n.bookingId) ? {...n, read: true} : n
                )
                : state.syncNotifications;

            const next = [...newItems, ...existing].slice(0, 50);
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    markSyncNotificationRead: (id) =>
        set((state) => {
            const next = state.syncNotifications.map((n) => n.id === id ? {...n, read: true} : n);
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    markSyncNotificationsRead: () =>
        set((state) => {
            const next = state.syncNotifications.map((n) =>
                n.type === 'conflict' && n.conflictStatus === 'deferred' ? n : {...n, read: true}
            );
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    updateConflictNotificationStatus: (conflictKey, status) =>
        set((state) => {
            const next = state.syncNotifications.map((notification) => {
                if (notification.conflictKey !== conflictKey) return notification;
                return {
                    ...notification,
                    conflictStatus: status,
                    ...(status === 'confirmed' ? {read: true} : {}),
                };
            });
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    replaceMockConflictNotifications: (items) =>
        set((state) => {
            const preserved = state.syncNotifications.filter((notification) => notification.type !== 'conflict');
            const next = [...items, ...preserved].slice(0, 50);
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    clearSyncNotifications: () => {
        saveSyncNotifications([]);
        set({syncNotifications: []});
    },

    initSyncNotifications: () => {
        set({syncNotifications: loadSyncNotifications()});
    },

    patchNotificationNames: () =>
        set((state) => {
            const designerById = new Map(state.designers.map((d) => [d.id, d.name]));
            const allReservations = Object.values(state.reservationMap).flat();

            const needsPatch = state.syncNotifications.some((n) => {
                if (!n.customerName || !n.appointmentDate || !n.appointmentTime) return true;
                if (!n.designerName || n.designerName === '미지정') {
                    const reservation = allReservations.find((r) => r.id === n.reservationId);
                    if (reservation?.designerId && designerById.has(reservation.designerId)) return true;
                }
                return false;
            });
            if (!needsPatch) return {};

            let changed = false;
            const next = state.syncNotifications.map((n) => {
                const reservation = allReservations.find((r) => r.id === n.reservationId);
                if (!reservation) return n;
                const customer = state.customerMap[reservation.customerId];
                const patch: Partial<typeof n> = {};
                if (!n.customerName && customer?.name) patch.customerName = customer.name;
                if (!n.appointmentDate && reservation.date) patch.appointmentDate = reservation.date;
                if (!n.appointmentTime && reservation.startTime) patch.appointmentTime = reservation.startTime;
                if ((!n.designerName || n.designerName === '미지정') && reservation.designerId) {
                    const name = designerById.get(reservation.designerId);
                    if (name) patch.designerName = name;
                }
                if (Object.keys(patch).length === 0) return n;
                changed = true;
                return {...n, ...patch};
            });
            if (!changed) return {};
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),
}));
