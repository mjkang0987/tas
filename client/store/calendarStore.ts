import {create} from 'zustand';

import type {Reservation, ReservationMap, ReservationHistoryEntry, ReservationStatus} from '../utils/reservations';
import type {Customer, CustomerMap} from '../utils/customers';
import type {ServiceItem} from '../utils/services';
import {CATEGORY_BASE_COLOR_MAP, SERVICE_CATALOG} from '../utils/services';
import type {DaySchedule, Designer, DesignerStatus} from '../utils/designers';
import {createDefaultSchedule, DEFAULT_DESIGNERS, getDesignerColor} from '../utils/designers';
import type {StoreSettings} from '../utils/storeSettings';
import {DEFAULT_STORE_SETTINGS} from '../utils/storeSettings';
import {
    groupCatalogByCategory,
    reorder,
    syncCustomerSettings,
    syncDesignerSettings,
    syncServiceSettings,
    syncStoreSettings,
} from './calendarStoreHelpers';
import {
    buildClosedReservationState,
    buildOpenedReservationState,
} from './calendarStoreOverlayHelpers';

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

    setReservationMap: (reservationMap) => set({reservationMap}),

    setCustomerMap: (customerMap) => set({customerMap}),

    addCustomer: (customer) =>
        set((state) => {
            const nextCustomerMap = {
                ...state.customerMap,
                [customer.id]: customer
            };

            syncCustomerSettings(Object.values(nextCustomerMap));
            return {customerMap: nextCustomerMap};
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
            const nextStoreSettings = {
                ...state.storeSettings,
                businessHours: {
                    ...state.storeSettings.businessHours,
                    ...hours,
                }
            };
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    updateStoreClosedDates: (dates) =>
        set((state) => {
            const nextStoreSettings = {
                ...state.storeSettings,
                closedDates: [...dates].sort()
            };
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    addStoreClosedDate: (date) =>
        set((state) => {
            if (!date || state.storeSettings.closedDates.includes(date)) return state;

            const nextStoreSettings = {
                ...state.storeSettings,
                closedDates: [...state.storeSettings.closedDates, date].sort()
            };
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    removeStoreClosedDate: (date) =>
        set((state) => {
            const nextClosedDates = state.storeSettings.closedDates.filter((item) => item !== date);
            if (nextClosedDates.length === state.storeSettings.closedDates.length) return state;

            const nextStoreSettings = {
                ...state.storeSettings,
                closedDates: nextClosedDates
            };
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    addDesigner: (name, status = '재직', phone = '', note = '', color) =>
        set((state) => {
            const cleanName = name.trim();
            if (!cleanName) return state;
            const designerId = Date.now();

            const nextDesigner: Designer = {
                id: designerId,
                name: cleanName,
                schedule: createDefaultSchedule(),
                status,
                phone,
                note,
                color: color || getDesignerColor({id: designerId}),
            };

            const nextDesigners = [
                ...state.designers,
                nextDesigner
            ];

            syncDesignerSettings(nextDesigners);
            return {designers: nextDesigners};
        }),

    updateDesigner: (designerId, patch) =>
        set((state) => {
            const nextDesigners = state.designers.map((designer) =>
                designer.id === designerId
                    ? {
                        ...designer,
                        ...(patch.name !== undefined ? {name: patch.name} : {}),
                        ...(patch.status ? {status: patch.status} : {}),
                        ...(patch.phone !== undefined ? {phone: patch.phone} : {}),
                        ...(patch.note !== undefined ? {note: patch.note} : {}),
                        ...(patch.color !== undefined ? {color: patch.color} : {}),
                    }
                    : designer
            );

            syncDesignerSettings(nextDesigners);
            return {designers: nextDesigners};
        }),

    updateDesignerDay: (designerId, dayIndex, patch) =>
        set((state) => {
            if (dayIndex < 0 || dayIndex > 6) return state;

            const nextDesigners = state.designers.map((designer) => {
                if (designer.id !== designerId) return designer;

                const nextSchedule = designer.schedule.map((day, index) =>
                    index === dayIndex ? {...day, ...patch} : day
                );

                return {...designer, schedule: nextSchedule};
            });

            syncDesignerSettings(nextDesigners);
            return {designers: nextDesigners};
        }),

    deleteDesigner: (designerId) =>
        set((state) => {
            const nextDesigners = state.designers.filter((designer) => designer.id !== designerId);
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
            const nextCatalog = [...state.serviceCatalog, item];
            return withSyncedCatalog(state, nextCatalog);
        }),

    updateService: (name, updated) =>
        set((state) => {
            const nextCatalog = state.serviceCatalog.map((s) => s.name === name ? updated : s);
            return withSyncedCatalog(state, nextCatalog);
        }),

    deleteService: (name) =>
        set((state) => {
            const nextCatalog = state.serviceCatalog.filter((s) => s.name !== name);
            return withSyncedCatalog(state, nextCatalog);
        }),

    renameCategory: (prevCategory, nextCategory) =>
        set((state) => {
            const trimmed = nextCategory.trim();
            if (!trimmed || trimmed === prevCategory) return state;
            if (state.serviceCatalog.some((item) => item.category === trimmed)) return state;

            const nextCatalog = state.serviceCatalog.map((item) => (
                item.category === prevCategory ? {...item, category: trimmed} : item
            ));

            const nextCategoryBaseColorMap = {...state.categoryBaseColorMap};
            if (prevCategory in nextCategoryBaseColorMap) {
                nextCategoryBaseColorMap[trimmed] = nextCategoryBaseColorMap[prevCategory];
                delete nextCategoryBaseColorMap[prevCategory];
            }

            syncServiceSettings(nextCatalog, nextCategoryBaseColorMap);
            return {
                serviceCatalog: nextCatalog,
                categoryBaseColorMap: nextCategoryBaseColorMap,
            };
        }),

    moveCategory: (dragCategory, targetCategory) =>
        set((state) => {
            if (dragCategory === targetCategory) return state;

            const grouped = groupCatalogByCategory(state.serviceCatalog);

            const categories = Array.from(grouped.keys());
            const dragIndex = categories.indexOf(dragCategory);
            const targetIndex = categories.indexOf(targetCategory);

            if (dragIndex === -1 || targetIndex === -1) return state;

            const nextCategories = reorder(categories, dragIndex, targetIndex);
            const nextCatalog = nextCategories.flatMap((category) => grouped.get(category) || []);
            return withSyncedCatalog(state, nextCatalog);
        }),

    moveServiceInCategory: (dragName, targetName) =>
        set((state) => {
            if (dragName === targetName) return state;

            const dragIndex = state.serviceCatalog.findIndex((s) => s.name === dragName);
            const targetIndex = state.serviceCatalog.findIndex((s) => s.name === targetName);

            if (dragIndex === -1 || targetIndex === -1) return state;

            const targetItem = state.serviceCatalog[targetIndex];
            const nextCatalog = [...state.serviceCatalog];
            const [moved] = nextCatalog.splice(dragIndex, 1);
            const movedWithCategory: ServiceItem = {...moved, category: targetItem.category};
            const insertIndex = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
            nextCatalog.splice(insertIndex, 0, movedWithCategory);
            return withSyncedCatalog(state, nextCatalog);
        }),

    addReservation: (reservation) => {
        set((state) => {
            const map = {...state.reservationMap};
            const key = reservation.date;

            if (!map[key]) map[key] = [];
            map[key] = [...map[key], reservation];

            return {reservationMap: map, createReservationInitial: null};
        });

        fetch('/api/reservations', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(reservation)
        });
    },

    updateReservation: (prev, updated) => {
        set((state) => {
            const map = {...state.reservationMap};
            const oldKey = prev.date;
            const newKey = updated.date;

            if (map[oldKey]) {
                map[oldKey] = map[oldKey].filter((r) => r.id !== prev.id);
                if (map[oldKey].length === 0) delete map[oldKey];
            }

            if (!map[newKey]) map[newKey] = [];
            const idx = map[newKey].findIndex((r) => r.id === updated.id);
            if (idx > -1) {
                map[newKey][idx] = updated;
            } else {
                map[newKey].push(updated);
            }

            const entry: ReservationHistoryEntry = {
                reservationId: prev.id,
                before: prev,
                after: updated,
                timestamp: new Date().toISOString()
            };

            return {
                reservationMap: map,
                selectedReservation: updated,
                selectedReservations: state.selectedReservations.map((reservation) => (
                    reservation.id === updated.id ? updated : reservation
                )),
                reservationHistory: [...state.reservationHistory, entry]
            };
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
            const map = {...state.reservationMap};
            const key = reservation.date;

            if (map[key]) {
                map[key] = map[key].map((r) => r.id === reservation.id ? updated : r);
            }

            const entry: ReservationHistoryEntry = {
                reservationId: reservation.id,
                before: reservation,
                after: updated,
                timestamp: new Date().toISOString()
            };

            const nextSelectedReservations = state.selectedReservations.filter((item) => item.id !== reservation.id);

            return {
                reservationMap: map,
                selectedReservation: nextSelectedReservations[nextSelectedReservations.length - 1] ?? null,
                selectedReservations: nextSelectedReservations,
                reservationHistory: [...state.reservationHistory, entry]
            };
        });

        fetch('/api/reservations', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id, status})
        });
    }
}));
