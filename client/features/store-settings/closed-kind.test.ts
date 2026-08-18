// 캘린더 휴무 표시 판정(getStoreClosedKind) — 요일 인덱스 변환이 이 파일의 핵심이다.
// 앱 공통 dayIndex 는 0=월 … 6=일 인데 JS getDay() 는 0=일 … 6=토 라서,
// 변환을 빼먹거나 방향을 틀리면 **하루씩 밀린 요일에 휴무가 붙는다.**
// 날짜 파싱도 로컬 자정이어야 한다(횡단 규칙 1번 — UTC 파싱은 KST 에서 하루 밀린다).
process.env.TZ = 'Asia/Seoul';

import {describe, expect, it} from 'vitest';

import {getStoreClosedKind, STORE_CLOSED_LABEL} from './model';

const EMPTY = {closedDates: [] as string[], closedWeekdays: [] as number[]};

describe('getStoreClosedKind — 임시 휴업일', () => {
    it('closedDates 에 있는 날짜는 date', () => {
        expect(getStoreClosedKind({...EMPTY, closedDates: ['2026-08-18']}, '2026-08-18')).toBe('date');
    });

    it('없는 날짜는 null', () => {
        expect(getStoreClosedKind({...EMPTY, closedDates: ['2026-08-18']}, '2026-08-19')).toBeNull();
    });
});

describe('getStoreClosedKind — 정기 휴무(요일)', () => {
    // 2026-08-17(월) … 2026-08-23(일) 한 주. dayIndex 0=월 … 6=일.
    const WEEK: [string, number][] = [
        ['2026-08-17', 0], // 월
        ['2026-08-18', 1], // 화
        ['2026-08-19', 2], // 수
        ['2026-08-20', 3], // 목
        ['2026-08-21', 4], // 금
        ['2026-08-22', 5], // 토
        ['2026-08-23', 6], // 일
    ];

    it('지정한 요일에만 weekday 를 돌려준다(요일이 밀리지 않는다)', () => {
        for (const [dateKey, dayIndex] of WEEK) {
            const settings = {...EMPTY, closedWeekdays: [dayIndex]};

            expect(getStoreClosedKind(settings, dateKey)).toBe('weekday');

            // 같은 주의 나머지 날은 전부 null 이어야 한다 — 변환이 틀리면 여기서 걸린다.
            for (const [otherKey] of WEEK.filter(([key]) => key !== dateKey)) {
                expect(getStoreClosedKind(settings, otherKey)).toBeNull();
            }
        }
    });

    it('일요일(dayIndex 6)은 JS getDay()=0 이라 변환 실수를 가장 잘 드러낸다', () => {
        expect(getStoreClosedKind({...EMPTY, closedWeekdays: [6]}, '2026-08-23')).toBe('weekday');
        expect(getStoreClosedKind({...EMPTY, closedWeekdays: [0]}, '2026-08-23')).toBeNull();
    });

    it('closedWeekdays 가 없으면(undefined) 조용히 null', () => {
        expect(getStoreClosedKind({closedDates: [], closedWeekdays: undefined as unknown as number[]}, '2026-08-18')).toBeNull();
    });
});

describe('getStoreClosedKind — 우선순위·방어', () => {
    it('둘 다 해당하면 임시 휴업일이 이긴다', () => {
        expect(getStoreClosedKind({closedDates: ['2026-08-18'], closedWeekdays: [1]}, '2026-08-18')).toBe('date');
    });

    it('날짜가 깨져 있으면 null(캘린더가 터지지 않는다)', () => {
        expect(getStoreClosedKind({...EMPTY, closedWeekdays: [0, 1, 2, 3, 4, 5, 6]}, 'not-a-date')).toBeNull();
    });
});

describe('STORE_CLOSED_LABEL — 스크린리더·툴팁 문구', () => {
    it('휴무 종류마다 문구가 다르다', () => {
        expect(STORE_CLOSED_LABEL.date).toBe('휴업일');
        expect(STORE_CLOSED_LABEL.weekday).toBe('정기휴무');
    });

    // 화면에는 색 띠·틴트만 보이므로, 이 문구가 비면 휴무 정보가 스크린리더에서 완전히 사라진다.
    it('빈 문구가 없다', () => {
        for (const label of Object.values(STORE_CLOSED_LABEL)) {
            expect(label.trim().length).toBeGreaterThan(0);
        }
    });
});
