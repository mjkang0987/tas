// 담당자 카드 읽기 모드의 근무시간 한 줄 요약(#183).
// 편집 모드의 7행을 대체하는 표시이므로, 요약이 원본 7행과 다른 사실을 말하면
// 오너가 잘못된 근무시간을 그대로 두게 된다. 이 파일은 그 왜곡을 막는다.

import {describe, expect, it} from 'vitest';

import {createDefaultSchedule, summarizeSchedule, WEEKDAY_LABELS, type DaySchedule} from './model';

const OPEN = {start: '10:00', end: '20:00'};

// 요일 7행을 만든다. 인덱스(0=월 … 6=일)로 지정한 요일만 덮어쓴다.
function schedule(overrides: Record<number, Partial<DaySchedule>> = {}): DaySchedule[] {
    return WEEKDAY_LABELS.map((_, index) => ({
        enabled: true,
        ...OPEN,
        ...overrides[index],
    }));
}

describe('summarizeSchedule — 연속 요일 묶기', () => {
    it('7일이 모두 같으면 한 구간(월~일)으로 묶는다', () => {
        expect(summarizeSchedule(schedule())).toEqual([{days: '월~일', hours: '10:00~20:00'}]);
    });

    it('기본 스케줄(평일 근무·주말 휴무)을 두 구간으로 요약한다', () => {
        expect(summarizeSchedule(createDefaultSchedule())).toEqual([
            {days: '월~금', hours: '10:00~20:00'},
            {days: '토~일', hours: '휴무'},
        ]);
    });

    it('마지막 요일까지 구간에 포함한다 — 일요일이 잘려나가지 않는다', () => {
        // 일(6)만 다른 경우. 루프 끝에서 구간을 닫지 않으면 이 항목이 통째로 사라진다.
        expect(summarizeSchedule(schedule({6: {enabled: false}}))).toEqual([
            {days: '월~토', hours: '10:00~20:00'},
            {days: '일', hours: '휴무'},
        ]);
    });

    it('구간이 하루뿐이면 물결 없이 요일 하나로 적는다', () => {
        expect(summarizeSchedule(schedule({0: {enabled: false}}))).toEqual([
            {days: '월', hours: '휴무'},
            {days: '화~일', hours: '10:00~20:00'},
        ]);
    });

    it('같은 근무시간이라도 사이가 끊기면 따로 적는다', () => {
        // 월·수 근무 / 화 휴무 — 월과 수를 한 구간으로 합치면 화요일 휴무가 가려진다.
        const summary = summarizeSchedule(
            schedule({1: {enabled: false}, 3: {enabled: false}, 4: {enabled: false}, 5: {enabled: false}, 6: {enabled: false}}),
        );

        expect(summary).toEqual([
            {days: '월', hours: '10:00~20:00'},
            {days: '화', hours: '휴무'},
            {days: '수', hours: '10:00~20:00'},
            {days: '목~일', hours: '휴무'},
        ]);
    });
});

describe('summarizeSchedule — 구간을 가르는 기준', () => {
    it('시작·종료 시각이 다르면 구간을 나눈다', () => {
        expect(summarizeSchedule(schedule({5: {end: '18:00'}, 6: {end: '18:00'}}))).toEqual([
            {days: '월~금', hours: '10:00~20:00'},
            {days: '토~일', hours: '10:00~18:00'},
        ]);
    });

    it('휴무일의 시각은 무시하고 묶는다 — 꺼둔 요일의 남은 시각이 구간을 쪼개지 않는다', () => {
        // 체크만 해제하면 start/end 는 편집 화면의 값이 그대로 남는다.
        const summary = summarizeSchedule(
            schedule({5: {enabled: false, start: '09:00', end: '13:00'}, 6: {enabled: false}}),
        );

        expect(summary).toEqual([
            {days: '월~금', hours: '10:00~20:00'},
            {days: '토~일', hours: '휴무'},
        ]);
    });

    it('시각이 같아도 근무 여부가 다르면 나눈다', () => {
        expect(summarizeSchedule(schedule({6: {enabled: false}})).map(s => s.hours)).toEqual([
            '10:00~20:00',
            '휴무',
        ]);
    });
});

describe('summarizeSchedule — 스케줄이 온전하지 않을 때', () => {
    it('빈 배열이면 전부 휴무로 본다', () => {
        expect(summarizeSchedule([])).toEqual([{days: '월~일', hours: '휴무'}]);
    });

    it('7일치가 안 되면 모자란 요일을 휴무로 채운다', () => {
        expect(summarizeSchedule(schedule().slice(0, 5))).toEqual([
            {days: '월~금', hours: '10:00~20:00'},
            {days: '토~일', hours: '휴무'},
        ]);
    });

    it('어떤 입력에도 7일을 모두 덮는 구간을 낸다', () => {
        const cases = [[], schedule(), createDefaultSchedule(), schedule({2: {enabled: false}})];

        for (const input of cases) {
            const days = summarizeSchedule(input).flatMap(({days: label}) => {
                const [from, to] = label.split('~');
                const start = WEEKDAY_LABELS.indexOf(from as (typeof WEEKDAY_LABELS)[number]);
                const end = to ? WEEKDAY_LABELS.indexOf(to as (typeof WEEKDAY_LABELS)[number]) : start;

                return WEEKDAY_LABELS.slice(start, end + 1);
            });

            expect(days).toEqual([...WEEKDAY_LABELS]);
        }
    });
});
