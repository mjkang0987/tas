import type {Reservation} from '../utils/reservations';

type OverlayState = {
    selectedReservation: Reservation | null;
    selectedReservations: Reservation[];
    createReservationInitial: { date: string; startTime: string } | null;
};

export function buildOpenedReservationState(
    state: Pick<OverlayState, 'selectedReservations'>,
    selectedReservation: Reservation
): Pick<OverlayState, 'selectedReservation' | 'selectedReservations' | 'createReservationInitial'> {
    const nextReservations = [...state.selectedReservations, selectedReservation];

    return {
        selectedReservation,
        selectedReservations: nextReservations,
        createReservationInitial: null,
    };
}

export function buildClosedReservationState(
    state: Pick<OverlayState, 'selectedReservations'>,
    layerIndex: number
): Pick<OverlayState, 'selectedReservation' | 'selectedReservations'> {
    const nextReservations = state.selectedReservations.filter((_, index) => index !== layerIndex);

    return {
        selectedReservations: nextReservations,
        selectedReservation: nextReservations[nextReservations.length - 1] ?? null,
    };
}
