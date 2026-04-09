import type {Reservation, ReservationHistoryEntry, ReservationMap} from '../utils/reservations';

type ReservationOverlayState = {
    selectedReservation: Reservation | null;
    selectedReservations: Reservation[];
    reservationHistory: ReservationHistoryEntry[];
};

export function buildAddedReservationMap(
    reservationMap: ReservationMap,
    reservation: Reservation
): ReservationMap {
    const nextMap = {...reservationMap};
    const key = reservation.date;

    if (!nextMap[key]) nextMap[key] = [];
    nextMap[key] = [...nextMap[key], reservation];

    return nextMap;
}

function buildHistoryEntry(before: Reservation, after: Reservation): ReservationHistoryEntry {
    return {
        reservationId: before.id,
        before,
        after,
        timestamp: new Date().toISOString(),
    };
}

export function buildUpdatedReservationState(
    state: Pick<ReservationOverlayState, 'selectedReservations' | 'reservationHistory'> & {reservationMap: ReservationMap},
    prev: Reservation,
    updated: Reservation
) {
    const nextMap = {...state.reservationMap};
    const oldKey = prev.date;
    const newKey = updated.date;

    if (nextMap[oldKey]) {
        nextMap[oldKey] = nextMap[oldKey].filter((reservation) => reservation.id !== prev.id);
        if (nextMap[oldKey].length === 0) delete nextMap[oldKey];
    }

    if (!nextMap[newKey]) nextMap[newKey] = [];
    const existingIndex = nextMap[newKey].findIndex((reservation) => reservation.id === updated.id);
    if (existingIndex > -1) {
        nextMap[newKey][existingIndex] = updated;
    } else {
        nextMap[newKey].push(updated);
    }

    return {
        reservationMap: nextMap,
        selectedReservation: updated,
        selectedReservations: state.selectedReservations.map((reservation) => (
            reservation.id === updated.id ? updated : reservation
        )),
        reservationHistory: [...state.reservationHistory, buildHistoryEntry(prev, updated)],
    };
}

export function buildCancelledReservationState(
    state: Pick<ReservationOverlayState, 'selectedReservations' | 'reservationHistory'> & {reservationMap: ReservationMap},
    reservation: Reservation,
    updated: Reservation
) {
    const nextMap = {...state.reservationMap};
    const key = reservation.date;

    if (nextMap[key]) {
        nextMap[key] = nextMap[key].map((item) => item.id === reservation.id ? updated : item);
    }

    const nextSelectedReservations = state.selectedReservations.filter((item) => item.id !== reservation.id);

    return {
        reservationMap: nextMap,
        selectedReservation: nextSelectedReservations[nextSelectedReservations.length - 1] ?? null,
        selectedReservations: nextSelectedReservations,
        reservationHistory: [...state.reservationHistory, buildHistoryEntry(reservation, updated)],
    };
}
