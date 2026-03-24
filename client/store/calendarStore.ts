import {create} from 'zustand';

import type {ReservationMap} from '../utils/reservations';

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

export interface MousePositionType {
    hour: number;
    minute: number;
    fullYear: number;
    month: number;
    date: number;
}

export interface CalendarState {
    today: FullType;
    target: DateType;
    aside: AsideSlice;
    view: ViewSlice;
    time: TimeSlice;
    router: RouterSlice;
    mousePosition: MousePositionType | null;
    reservationMap: ReservationMap;

    setToday: (v: FullType) => void;
    setTarget: (partial: Partial<DateType>) => void;
    setTargetFromDate: (value: Date | string | number) => void;
    setAside: (v: AsideSlice | ((prev: AsideSlice) => AsideSlice)) => void;
    setView: (v: ViewSlice | ((prev: ViewSlice) => ViewSlice)) => void;
    setTime: (v: TimeSlice | ((prev: TimeSlice) => TimeSlice)) => void;
    setRouterSlice: (v: RouterSlice | ((prev: RouterSlice) => RouterSlice)) => void;
    setMousePosition: (v: MousePositionType | null) => void;
    setReservationMap: (map: ReservationMap) => void;
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
    mousePosition: null,
    reservationMap: {},

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

    setMousePosition: (mousePosition) => set({mousePosition}),

    setReservationMap: (reservationMap) => set({reservationMap})
}));
