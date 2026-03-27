import {create} from 'zustand';

import type {Reservation, ReservationMap, ReservationHistoryEntry, ReservationStatus} from '../utils/reservations';
import type {CustomerMap} from '../utils/customers';

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

    setToday: (v: FullType) => void;
    setTarget: (partial: Partial<DateType>) => void;
    setTargetFromDate: (value: Date | string | number) => void;
    setAside: (v: AsideSlice | ((prev: AsideSlice) => AsideSlice)) => void;
    setView: (v: ViewSlice | ((prev: ViewSlice) => ViewSlice)) => void;
    setTime: (v: TimeSlice | ((prev: TimeSlice) => TimeSlice)) => void;
    setRouterSlice: (v: RouterSlice | ((prev: RouterSlice) => RouterSlice)) => void;
    setReservationMap: (map: ReservationMap) => void;
    setCustomerMap: (map: CustomerMap) => void;
    setSelectedReservation: (v: Reservation | null) => void;
    setReservationHistory: (history: ReservationHistoryEntry[]) => void;
    setReservationListFilter: (v: CalendarState['reservationListFilter']) => void;
    setCreateReservationInitial: (v: CreateReservationInitial | null) => void;
    addReservation: (reservation: Reservation) => void;
    updateReservation: (prev: Reservation, updated: Reservation) => void;
    cancelReservation: (reservation: Reservation, status?: ReservationStatus) => void;
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

    setSelectedReservation: (selectedReservation) => set({selectedReservation}),

    setReservationHistory: (reservationHistory) => set({reservationHistory}),

    setReservationListFilter: (reservationListFilter) => set({reservationListFilter}),

    setCreateReservationInitial: (createReservationInitial) => set({createReservationInitial}),

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
