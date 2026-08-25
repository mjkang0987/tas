// 캘린더 휴무 판정. 요일 규칙(0=월)과 JS getDay()(0=일)가 어긋나면 화면이 엉뚱한 날을
// 휴무로 칠하므로, 요일 경계를 요일마다 확인한다.

import {describe, expect, it} from 'vitest';

import {getStoreClosedKind} from './model';

const NONE = {closedDates: [], closedWeekdays: []};

describe('getStoreClosedKind', () => {
    it('휴무 설정이 없으면 null 이다', () => {
        expect(getStoreClosedKind(NONE, '2026-08-25')).toBeNull();
    });

    it('임시 휴업일로 찍힌 날짜는 date 다', () => {
        expect(getStoreClosedKind({closedDates: ['2026-08-25'], closedWeekdays: []}, '2026-08-25')).toBe('date');
        expect(getStoreClosedKind({closedDates: ['2026-08-25'], closedWeekdays: []}, '2026-08-26')).toBeNull();
    });

    it('정기 휴무 요일은 weekday 다 (dayIndex 0=월 … 6=일)', () => {
        // 2026-08-24(월) ~ 2026-08-30(일)
        const week = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];
        week.forEach((dateKey, dayIndex) => {
            expect(getStoreClosedKind({closedDates: [], closedWeekdays: [dayIndex]}, dateKey)).toBe('weekday');
            // 같은 주의 다른 날은 물들지 않는다.
            week.filter((d) => d !== dateKey).forEach((other) => {
                expect(getStoreClosedKind({closedDates: [], closedWeekdays: [dayIndex]}, other)).toBeNull();
            });
        });
    });

    it('둘 다 해당하면 임시 휴업일이 이긴다', () => {
        // 2026-08-25 는 화요일 = dayIndex 1.
        expect(getStoreClosedKind({closedDates: ['2026-08-25'], closedWeekdays: [1]}, '2026-08-25')).toBe('date');
    });

    it('빈 날짜 문자열은 null 이다', () => {
        expect(getStoreClosedKind({closedDates: [], closedWeekdays: [0, 1, 2, 3, 4, 5, 6]}, '')).toBeNull();
    });
});
