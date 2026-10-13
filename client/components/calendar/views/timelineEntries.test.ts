import {describe, expect, it} from 'vitest';

import {buildTimelineEntries} from './timelineEntries';
import type {Reservation} from '../../../utils/reservations';

function makeReservation(id: number, startTime: string, endTime: string): Reservation {
    return {
        id,
        date: '2026-09-16',
        startTime,
        endTime,
        service: '커트',
        customerId: id,
        assigneeId: 1,
        price: 10000,
    } as Reservation;
}

describe('buildTimelineEntries', () => {
    it('겹치지 않으면 낱개로 낸다', () => {
        const entries = buildTimelineEntries([
            makeReservation(1, '10:00', '11:00'),
            makeReservation(2, '11:00', '12:00'),
        ]);

        expect(entries.map((entry) => entry.kind)).toEqual(['single', 'single']);
    });

    it('splitUpTo 기본값(0)이면 겹침을 접는다 — 기존 데스크톱 동작', () => {
        const entries = buildTimelineEntries([
            makeReservation(1, '10:00', '11:30'),
            makeReservation(2, '11:00', '12:30'),
        ]);

        expect(entries).toHaveLength(1);
        expect(entries[0].kind).toBe('cluster');
    });

    it('splitUpTo 를 넘게 겹치면 접는다 — 좁은 화면에서 3칸은 못 읽는다', () => {
        const entries = buildTimelineEntries([
            makeReservation(1, '10:00', '12:00'),
            makeReservation(2, '10:30', '12:00'),
            makeReservation(3, '11:00', '12:00'),
        ], {splitUpTo: 2});

        expect(entries).toHaveLength(1);
        expect(entries[0].kind).toBe('cluster');
    });

    it('빈 목록은 빈 결과', () => {
        expect(buildTimelineEntries([])).toEqual([]);
    });

    it('사슬로 이어진 겹침은 끝난 칸을 물려받는다 — 3건이 2칸', () => {
        // 10-11 과 10:30-11:30 은 겹치지만, 11-12 는 첫 건이 끝난 뒤라 그 칸을 다시 쓴다.
        // 묶음 크기대로 3칸을 주면 폭이 1/3 로 줄고 주 뷰에서는 그 날 칸이 3배가 된다.
        const entries = buildTimelineEntries([
            makeReservation(1, '10:00', '11:00'),
            makeReservation(2, '10:30', '11:30'),
            makeReservation(3, '11:00', '12:00'),
        ], {splitUpTo: 3});

        const lanes = entries.map((entry) => entry.kind === 'single' ? entry.lane : 'cluster');
        expect(lanes).toEqual([
            {index: 0, count: 2},
            {index: 1, count: 2},
            {index: 0, count: 2},
        ]);
    });

    it('진짜로 동시에 겹치면 그만큼 칸을 늘린다 — 3중 겹침은 3칸', () => {
        const entries = buildTimelineEntries([
            makeReservation(1, '10:00', '12:00'),
            makeReservation(2, '10:30', '12:00'),
            makeReservation(3, '11:00', '12:00'),
        ], {splitUpTo: 3});

        const lanes = entries.map((entry) => entry.kind === 'single' ? entry.lane : 'cluster');
        expect(lanes).toEqual([
            {index: 0, count: 3},
            {index: 1, count: 3},
            {index: 2, count: 3},
        ]);
    });

    it('나뉜 예약에는 칸이 붙고 낱개 예약에는 붙지 않는다', () => {
        const entries = buildTimelineEntries([
            makeReservation(1, '10:00', '11:30'),
            makeReservation(2, '11:00', '12:30'),
            makeReservation(3, '14:00', '15:00'),
        ], {splitUpTo: 2});

        const lanes = entries.map((entry) => entry.kind === 'single' ? entry.lane : 'cluster');
        expect(lanes).toEqual([
            {index: 0, count: 2},
            {index: 1, count: 2},
            undefined,
        ]);
    });
});
