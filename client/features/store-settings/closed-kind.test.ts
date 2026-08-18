// 캘린더 휴무 표시 판정(getStoreClosedKind) — 요일 인덱스 변환이 이 파일의 핵심이다.
// 앱 공통 dayIndex 는 0=월 … 6=일 인데 JS getDay() 는 0=일 … 6=토 라서,
// 변환을 빼먹거나 방향을 틀리면 **하루씩 밀린 요일에 휴무가 붙는다.**
// 날짜 파싱도 로컬 자정이어야 한다(횡단 규칙 1번 — UTC 파싱은 KST 에서 하루 밀린다).
process.env.TZ = 'Asia/Seoul';

import {describe, expect, it} from 'vitest';

import {getStoreClosedKind, STORE_CLOSED_LABEL_PARTS} from './model';

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

describe('STORE_CLOSED_LABEL_PARTS — 배지 문구', () => {
    it('조각을 이으면 화면 문구가 된다', () => {
        expect(STORE_CLOSED_LABEL_PARTS.date.join('')).toBe('휴업일');
        expect(STORE_CLOSED_LABEL_PARTS.weekday.join('')).toBe('정기휴무');
    });

    // 좁은 열(모바일 주별 ~49px)에서 조각을 세로로 쌓아 두 줄을 만든다.
    // 조각이 하나로 합쳐지면 다시 한 글자씩 쪼개지므로 개수를 고정한다.
    it('정기 휴무는 두 조각으로 나뉘어 있다', () => {
        expect(STORE_CLOSED_LABEL_PARTS.weekday).toHaveLength(2);
        expect(STORE_CLOSED_LABEL_PARTS.date).toHaveLength(1);
    });
});
