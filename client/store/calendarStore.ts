import {create} from 'zustand';

import type {Reservation, ReservationMap, ReservationHistoryEntry, ReservationStatus} from '../utils/reservations';
import type {Customer, CustomerMap} from '../utils/customers';
import type {ServiceItem} from '../utils/services';
import {CATEGORY_BASE_COLOR_MAP, SERVICE_CATALOG} from '../utils/services';
import type {DaySchedule, Designer, DesignerStatus} from '../utils/designers';
import {createDefaultSchedule, DEFAULT_DESIGNERS} from '../utils/designers';

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
    reservationHistory: ReservationHistoryEntry[];
    reservationListFilter: { type: 'month'; year: number; month: number } | { type: 'date'; dateKey: string } | null;
    createReservationInitial: CreateReservationInitial | null;
    selectedCustomerId: number | null;
    serviceCatalog: ServiceItem[];
    categoryBaseColorMap: Record<string, string>;
    designers: Designer[];

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
    setReservationHistory: (history: ReservationHistoryEntry[]) => void;
    setReservationListFilter: (v: CalendarState['reservationListFilter']) => void;
    setCreateReservationInitial: (v: CreateReservationInitial | null) => void;
    setSelectedCustomerId: (v: number | null) => void;
    setServiceCatalog: (catalog: ServiceItem[]) => void;
    setCategoryBaseColorMap: (colorMap: Record<string, string>) => void;
    setDesigners: (designers: Designer[]) => void;
    addDesigner: (name: string, status?: DesignerStatus, phone?: string, note?: string) => void;
    updateDesigner: (designerId: number, patch: Partial<Pick<Designer, 'name' | 'status' | 'phone' | 'note'>>) => void;
    updateDesignerDay: (designerId: number, dayIndex: number, patch: Partial<DaySchedule>) => void;
    deleteDesigner: (designerId: number) => void;
    updateCategoryBaseColor: (category: string, color: string) => void;
    addService: (item: ServiceItem) => void;
    updateService: (name: string, updated: ServiceItem) => void;
    deleteService: (name: string) => void;
    moveCategory: (dragCategory: string, targetCategory: string) => void;
    moveServiceInCategory: (dragName: string, targetName: string) => void;
    addReservation: (reservation: Reservation) => void;
    updateReservation: (prev: Reservation, updated: Reservation) => void;
    cancelReservation: (reservation: Reservation, status?: ReservationStatus) => void;
}

function syncServiceSettings(services: ServiceItem[], categoryBaseColors: Record<string, string>): void {
    fetch('/api/services', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({services, categoryBaseColors})
    }).catch(() => {
        // Preserve local UX even if sync fails; server data can be retried later.
    });
}

function syncDesignerSettings(designers: Designer[]): void {
    fetch('/api/designers', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({designers})
    }).catch(() => {
        // Preserve local UX even if sync fails; server data can be retried later.
    });
}

function syncCustomerSettings(customers: Customer[]): void {
    fetch('/api/customers', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({customers})
    }).catch(() => {
        // Preserve local UX even if sync fails; server data can be retried later.
    });
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

function groupCatalogByCategory(serviceCatalog: ServiceItem[]): Map<string, ServiceItem[]> {
    const grouped = new Map<string, ServiceItem[]>();

    for (const item of serviceCatalog) {
        const group = grouped.get(item.category);

        if (group) {
            group.push(item);
        } else {
            grouped.set(item.category, [item]);
        }
    }

    return grouped;
}

function reorder<T>(list: T[], fromIndex: number, targetIndex: number): T[] {
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(insertIndex, 0, moved);
    return next;
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
    reservationHistory: [],
    reservationListFilter: null,
    createReservationInitial: null,
    selectedCustomerId: null,
    serviceCatalog: SERVICE_CATALOG,
    categoryBaseColorMap: CATEGORY_BASE_COLOR_MAP,
    designers: DEFAULT_DESIGNERS,

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

    setReservationHistory: (reservationHistory) => set({reservationHistory}),

    setReservationListFilter: (reservationListFilter) => set({reservationListFilter}),

    setCreateReservationInitial: (createReservationInitial) => set({createReservationInitial}),

    setSelectedCustomerId: (selectedCustomerId) => set({selectedCustomerId}),

    setServiceCatalog: (serviceCatalog) => set({serviceCatalog}),
    setCategoryBaseColorMap: (categoryBaseColorMap) => set({categoryBaseColorMap}),
    setDesigners: (designers) => set({designers}),

    addDesigner: (name, status = '재직', phone = '', note = '') =>
        set((state) => {
            const cleanName = name.trim();
            if (!cleanName) return state;

            const nextDesigner: Designer = {
                id: Date.now(),
                name: cleanName,
                schedule: createDefaultSchedule(),
                status,
                phone,
                note,
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

            return {
                reservationMap: map,
                selectedReservation: null,
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
