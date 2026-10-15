// 캘린더 휴무 판정. 요일 규칙(0=월)과 JS getDay()(0=일)가 어긋나면 화면이 엉뚱한 날을
// 휴무로 칠하므로, 요일 경계를 요일마다 확인한다.

import {describe, expect, it} from 'vitest';

import {DEFAULT_STORE_SETTINGS, getStoreClosedKind, normalizeStoreSettings} from './model';

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

// 게스트 로컬 스냅샷은 저장될 당시의 형태로 남는다 — 그 뒤 늘어난 필드는 통째로 없다.
// 빠진 채 스토어에 들어가면 그 필드를 읽는 화면(예약 상세의 pointSettings)이 터진다.
describe('normalizeStoreSettings', () => {
    it('없는 필드는 기본값으로 채운다', () => {
        const settings = normalizeStoreSettings({closedWeekdays: [2], closedDates: []});

        expect(settings.pointSettings).toEqual(DEFAULT_STORE_SETTINGS.pointSettings);
        expect(settings.businessHours).toEqual(DEFAULT_STORE_SETTINGS.businessHours);
        expect(settings.closedWeekdays).toEqual([2]);
    });

    it('저장된 값은 기본값을 이긴다', () => {
        const settings = normalizeStoreSettings({
            businessHours: {start: '09:00', end: '21:00'},
            pointSettings: {...DEFAULT_STORE_SETTINGS.pointSettings, enableServiceRate: true, serviceRate: 5},
        });

        expect(settings.businessHours).toEqual({start: '09:00', end: '21:00'});
        expect(settings.pointSettings.enableServiceRate).toBe(true);
        expect(settings.pointSettings.serviceRate).toBe(5);
    });

    it('중첩 객체도 일부만 저장돼 있으면 나머지를 채운다', () => {
        const settings = normalizeStoreSettings({pointSettings: {enableServiceRate: true}} as Partial<typeof DEFAULT_STORE_SETTINGS>);

        expect(settings.pointSettings.enableServiceRate).toBe(true);
        expect(settings.pointSettings.serviceRate).toBe(DEFAULT_STORE_SETTINGS.pointSettings.serviceRate);
        expect(settings.pointSettings.rechargeRules).toEqual(DEFAULT_STORE_SETTINGS.pointSettings.rechargeRules);
    });

    it('통째로 없으면 기본값 전체를 준다', () => {
        expect(normalizeStoreSettings(undefined)).toEqual(DEFAULT_STORE_SETTINGS);
    });
});
