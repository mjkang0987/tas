import {create} from 'zustand';

import type {Reservation, ReservationMap, ReservationHistoryEntry, ReservationStatus} from '../utils/reservations';
import {hasCompletedPayment} from '../utils/reservations';
import type {Customer, CustomerMap} from '../utils/customers';
import type {PointHistoryEntry} from '../utils/customers';
import {appendPointHistories, syncCustomerFirstVisitDates} from '../utils/customers';
import type {ServiceItem} from '../utils/services';
import {CATEGORY_BASE_COLOR_MAP, SERVICE_CATALOG} from '../utils/services';
import type {DaySchedule, Designer, DesignerStatus} from '../utils/designers';
import {DEFAULT_DESIGNERS} from '../utils/designers';
import type {StoreSettings} from '../utils/storeSettings';
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
    syncServiceSettings,
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
    buildUpdatedServiceState,
} from './calendarStoreServiceHelpers';
import {
    buildAddedStoreClosedDateState,
    buildRemovedStoreClosedDateState,
    buildUpdatedStoreBusinessHoursState,
    buildUpdatedStoreClosedDatesState,
    buildUpdatedStorePointSettingsState,
} from './calendarStoreStoreSettingsHelpers';

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
    isTransitionEnd: boolean;
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
    selectedReservation: Reservation | null;
    selectedReservations: Reservation[];
    reservationHistory: ReservationHistoryEntry[];
    reservationListFilter: { type: 'month'; year: number; month: number } | { type: 'date'; dateKey: string } | null;
    createReservationInitial: CreateReservationInitial | null;
    selectedCustomerId: number | null;
    calendarDesignerId: number | null;
    serviceCatalog: ServiceItem[];
    categoryBaseColorMap: Record<string, string>;
    designers: Designer[];
    storeSettings: StoreSettings;

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
    setSelectedReservation: (v: Reservation | null) => void;
    setSelectedReservations: (v: Reservation[]) => void;
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
    updateService: (name: string, updated: ServiceItem) => void;
    deleteService: (name: string) => void;
    renameCategory: (prevCategory: string, nextCategory: string) => void;
    moveCategory: (dragCategory: string, targetCategory: string) => void;
    moveServiceInCategory: (dragName: string, targetName: string) => void;
    addReservation: (reservation: Reservation) => void;
    updateReservation: (prev: Reservation, updated: Reservation) => void;
    cancelReservation: (reservation: Reservation, status?: ReservationStatus) => void;
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
        isVisible      : false,
        isTransitionEnd: true
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
    serviceCatalog: SERVICE_CATALOG,
    categoryBaseColorMap: CATEGORY_BASE_COLOR_MAP,
    designers: DEFAULT_DESIGNERS,
    storeSettings: DEFAULT_STORE_SETTINGS,

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
        set((state) => ({
            aside: typeof v === 'function' ? v(state.aside) : v
        })),

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
        set((state) => buildOpenedReservationState(state, selectedReservation)),

    openReservationDetailFromCustomer: (selectedReservation) =>
        set((state) => buildOpenedReservationState(state, selectedReservation)),

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

    updateService: (name, updated) =>
        set((state) => {
            const nextCatalog = buildUpdatedServiceState(state.serviceCatalog, name, updated);
            return withSyncedCatalog(state, nextCatalog);
        }),

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
        set((state) => {
            const nextMap = buildAddedReservationMap(state.reservationMap, reservation);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {reservationMap: nextMap, customerMap: nextCustomerMap, createReservationInitial: null};
        });

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

        set((state) => {
            const nextState = buildUpdatedReservationState(state, prev, updated);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextState.reservationMap);
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {...nextState, customerMap: nextCustomerMap};
        });

        fetch('/api/reservations', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prev, updated})
        });
    },

    cancelReservation: (reservation, status = 'cancelled') => {
        const updated: Reservation = {...reservation, status};

        set((state) => {
            const nextState = buildCancelledReservationState(state, reservation, updated);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextState.reservationMap);
            if (Object.keys(nextCustomerMap).length > 0) {
                syncCustomerSettings(Object.values(nextCustomerMap));
            }
            return {...nextState, customerMap: nextCustomerMap};
        });

        fetch('/api/reservations', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id, status})
        });
    }
}));
