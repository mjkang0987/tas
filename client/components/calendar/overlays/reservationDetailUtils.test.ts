import {describe, expect, it} from 'vitest';

import type {Reservation} from '../../../utils/reservations';
import {buildDraftReservation, buildReservationFormState} from './reservationDetailUtils';

describe('예약 변경 초안', () => {
    const reservation: Reservation = {
        id: 1, date: '2026-10-19', startTime: '10:00', endTime: '11:00', service: '남성커트',
        customerId: 1, status: 'active', price: 18000, channel: '전화예약',
    };

    it('폼에서 바꾼 칸이 모두 초안에 들어간다(예약경로 포함)', () => {
        const form = {...buildReservationFormState(reservation), channel: '현장방문' as const, memo: '앞머리', price: 20000};
        const draft = buildDraftReservation(reservation, form);
        expect(draft.channel).toBe('현장방문');
        expect(draft.memo).toBe('앞머리');
        expect(draft.price).toBe(20000);
    });
});
