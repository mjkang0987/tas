import {describe, expect, it} from 'vitest';

import {clampRevenueRange, getDiffDays, REVENUE_MAX_RANGE_DAYS} from './revenueChartUtils';

describe('clampRevenueRange', () => {
    it('상한 이내면 그대로 둔다', () => {
        expect(clampRevenueRange('2026-01-01', '2026-03-31')).toEqual({startDateKey: '2026-01-01', endDateKey: '2026-03-31'});
    });

    it('경계(365일 간격)는 자르지 않는다 — 윤년 포함 만 1년이 들어가야 한다', () => {
        const range = clampRevenueRange('2024-01-01', '2024-12-31');   // 윤년: 366일 = 간격 365
        expect(getDiffDays(range.startDateKey, range.endDateKey)).toBe(REVENUE_MAX_RANGE_DAYS);
        expect(range).toEqual({startDateKey: '2024-01-01', endDateKey: '2024-12-31'});
    });

    it('상한을 넘으면 끝을 남기고 시작을 당긴다', () => {
        const range = clampRevenueRange('2020-01-01', '2026-08-31');
        expect(range.endDateKey).toBe('2026-08-31');
        expect(getDiffDays(range.startDateKey, range.endDateKey)).toBe(REVENUE_MAX_RANGE_DAYS);
        expect(range.startDateKey).toBe('2025-08-31');
    });

    it('뒤집힌 기간도 간격만 자른다 — 순서는 건드리지 않는다', () => {
        const range = clampRevenueRange('2026-08-31', '2020-01-01');
        expect(range.startDateKey).toBe('2026-08-31');
        expect(getDiffDays(range.endDateKey, range.startDateKey)).toBe(REVENUE_MAX_RANGE_DAYS);
    });
});
