// 타임라인 배율 판정.
// 틀리면 두 방향 모두 사고다 — 짧은 예약이 안 보이거나, 30분 매장의 하루가 이유 없이 길어지거나.

import {describe, expect, it} from 'vitest';

import {
    DEFAULT_TIMELINE_UNIT,
    MIN_CARD_HEIGHT,
    cardDetailForHeight,
    cardHeightFor,
    hourHeightForUnit,
    resolveTimelineUnit,
    roundToUnit,
} from './timeline-scale';

describe('resolveTimelineUnit', () => {
    it('가장 짧은 시술이 단위를 정한다', () => {
        expect(resolveTimelineUnit([30, 60, 90])).toBe(30);
        expect(resolveTimelineUnit([10, 30, 60])).toBe(10);
        expect(resolveTimelineUnit([5, 60])).toBe(5);
    });

    it('어중간한 값은 이하의 가장 큰 단위로 내린다', () => {
        // 올리면 카드가 눈금 한 칸보다 짧아져 눈금이 거짓말을 한다.
        expect(resolveTimelineUnit([7])).toBe(5);
        expect(resolveTimelineUnit([12])).toBe(10);
        expect(resolveTimelineUnit([25])).toBe(20);
        expect(resolveTimelineUnit([45])).toBe(30);
    });

    it('5분보다 짧은 시술도 5분 단위까지만 내려간다', () => {
        expect(resolveTimelineUnit([1])).toBe(5);
        expect(resolveTimelineUnit([3, 30])).toBe(5);
    });

    it('90분처럼 큰 값만 있으면 가장 큰 단위를 쓴다', () => {
        expect(resolveTimelineUnit([90, 120])).toBe(60);
    });

    it('서비스가 없거나 값이 망가졌으면 기본값(30분)', () => {
        expect(resolveTimelineUnit([])).toBe(DEFAULT_TIMELINE_UNIT);
        expect(resolveTimelineUnit([0, -10, Number.NaN])).toBe(DEFAULT_TIMELINE_UNIT);
    });

    it('망가진 값이 섞여 있어도 멀쩡한 값으로 판정한다', () => {
        // 0을 최솟값으로 잡으면 모든 매장이 5분 단위가 된다.
        expect(resolveTimelineUnit([0, 30, 60])).toBe(30);
    });
});

describe('hourHeightForUnit', () => {
    it('15분 이상 매장은 현행 100px 그대로 — 대부분의 매장에 변화가 없다', () => {
        expect(hourHeightForUnit(60)).toBe(100);
        expect(hourHeightForUnit(30)).toBe(100);
        expect(hourHeightForUnit(20)).toBe(100);
        expect(hourHeightForUnit(15)).toBe(100);
    });

    it('짧은 단위만 배율을 올린다', () => {
        expect(hourHeightForUnit(10)).toBe(120);
        expect(hourHeightForUnit(5)).toBe(200);
    });

    it('배율은 그 단위 한 칸이 최소 카드 높이를 넘게 잡혀 있다', () => {
        // 이 관계가 깨지면 배율을 올려놓고도 카드가 안 읽힌다.
        for (const unit of [5, 10, 15, 20, 30, 60] as const) {
            const slotPx = (hourHeightForUnit(unit) / 60) * unit;
            expect(slotPx).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT);
        }
    });
});

describe('cardHeightFor', () => {
    it('시간에 비례해 그린다', () => {
        expect(cardHeightFor(30, 100 / 60)).toBeCloseTo(50);
        expect(cardHeightFor(60, 100 / 60)).toBeCloseTo(100);
    });

    it('비례 높이가 너무 낮으면 최소 높이가 받는다', () => {
        // 30분 단위 매장(100px/시간)에 오너가 직접 5분으로 줄인 예약이 있는 경우.
        expect(cardHeightFor(5, 100 / 60)).toBe(MIN_CARD_HEIGHT);
    });
});

describe('cardDetailForHeight', () => {
    it('높이에 따라 내용을 줄인다', () => {
        expect(cardDetailForHeight(50)).toBe('full');
        expect(cardDetailForHeight(36)).toBe('full');
        expect(cardDetailForHeight(35)).toBe('compact');
        expect(cardDetailForHeight(20)).toBe('compact');
        expect(cardDetailForHeight(19)).toBe('name');
    });

    it('5분 단위 매장의 5분 예약은 이름만 남는다', () => {
        const minuteHeight = hourHeightForUnit(5) / 60;
        expect(cardDetailForHeight(cardHeightFor(5, minuteHeight))).toBe('name');
    });

    it('10분 단위 매장의 10분 예약은 한 줄이 들어간다', () => {
        const minuteHeight = hourHeightForUnit(10) / 60;
        expect(cardDetailForHeight(cardHeightFor(10, minuteHeight))).toBe('compact');
    });

    it('30분 예약은 어느 매장에서도 두 줄 그대로', () => {
        for (const unit of [5, 10, 30] as const) {
            const minuteHeight = hourHeightForUnit(unit) / 60;
            expect(cardDetailForHeight(cardHeightFor(30, minuteHeight))).toBe('full');
        }
    });
});

describe('roundToUnit', () => {
    it('30분 단위는 기존 roundToHalfHour 와 같은 결과', () => {
        expect(roundToUnit(10, 14, 30)).toEqual({hour: 10, minute: 0});
        expect(roundToUnit(10, 15, 30)).toEqual({hour: 10, minute: 30});
        expect(roundToUnit(10, 44, 30)).toEqual({hour: 10, minute: 30});
        expect(roundToUnit(10, 45, 30)).toEqual({hour: 11, minute: 0});
    });

    it('10분 단위 매장은 10분 격자로 잡힌다', () => {
        // 30분 고정이던 시절엔 10:10을 눌러도 10:00 이나 10:30 으로만 갔다.
        expect(roundToUnit(10, 12, 10)).toEqual({hour: 10, minute: 10});
        expect(roundToUnit(10, 26, 10)).toEqual({hour: 10, minute: 30});
    });

    it('5분 단위도 마찬가지', () => {
        expect(roundToUnit(10, 7, 5)).toEqual({hour: 10, minute: 5});
        expect(roundToUnit(10, 3, 5)).toEqual({hour: 10, minute: 5});
    });

    it('시간 경계를 넘어가면 시(hour)가 올라간다', () => {
        expect(roundToUnit(10, 58, 10)).toEqual({hour: 11, minute: 0});
    });
});
