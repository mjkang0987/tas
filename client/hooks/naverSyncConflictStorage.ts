import {useCalendarStore} from '../store/calendarStore';
import type {Reservation} from '../utils/reservations';
import type {ConflictInfo} from './useNaverBookingSync';

const ACTIVE_CONFLICTS_KEY = 'naver-sync-active-conflicts';

interface StoredConflictPair {
    newReservation: Reservation;
    existingReservation: Reservation;
}

export function loadActiveConflictPairs(): StoredConflictPair[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(ACTIVE_CONFLICTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveActiveConflictPairs(conflicts: ConflictInfo[]): void {
    if (typeof window === 'undefined') return;
    const pairs: StoredConflictPair[] = conflicts.map((c) => ({
        newReservation: c.newReservation,
        existingReservation: c.existingReservation,
    }));
    localStorage.setItem(ACTIVE_CONFLICTS_KEY, JSON.stringify(pairs));
}

export function removeActiveConflictPair(key: string): void {
    if (typeof window === 'undefined') return;
    const pairs = loadActiveConflictPairs();
    const [newId, existingId] = key.split('-').map(Number);
    const next = pairs.filter((p) => !(p.newReservation.id === newId && p.existingReservation.id === existingId));
    localStorage.setItem(ACTIVE_CONFLICTS_KEY, JSON.stringify(next));
}

export function restoreConflictsFromPairs(): ConflictInfo[] {
    const pairs = loadActiveConflictPairs();
    if (pairs.length === 0) return [];

    const reservationMap = useCalendarStore.getState().reservationMap;
    const activeReservations = Object.values(reservationMap).flat()
        .filter((r) => r.status !== 'cancelled' && r.status !== 'noshow');

    return pairs.filter((stored) => {
        const newExists = activeReservations.some((r) => r.id === stored.newReservation.id);
        const existingExists = activeReservations.some((r) => r.id === stored.existingReservation.id);
        return newExists && existingExists;
    }).map((stored) => ({
        newReservation: stored.newReservation,
        existingReservation: stored.existingReservation,
    }));
}
