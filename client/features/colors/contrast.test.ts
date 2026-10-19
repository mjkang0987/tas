import {describe, expect, it} from 'vitest';

import {contrastRatio, DARK_TEXT, LIGHT_TEXT, parseColor, readableTextOn} from './contrast';

// 메모 태그(customers MEMO_TAG_COLORS)·담당자 기본색 팔레트
const PALETTE = ['#4285F4', '#34A853', '#EA4335', '#FBBC04', '#FF6D01', '#46BDC6', '#9334E6', '#E91E8C',
    '#6526D9', '#2D7FF9', '#E85D75', '#00A896', '#FB8C00', '#6D6F78', '#7E57C2'];

describe('색 바탕 위 글자색', () => {
    it.each(PALETTE)('%s 위 글자가 4.5:1 이상이거나, 흰·검 중 나은 쪽', (bg) => {
        const text = readableTextOn(bg);
        const best = Math.max(contrastRatio(LIGHT_TEXT, bg), contrastRatio(DARK_TEXT, bg));
        expect(contrastRatio(text, bg)).toBe(best);
        expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it('어떤 바탕이든 4.5:1 이상(회색 0~255 전부)', () => {
        for (let v = 0; v <= 255; v++) {
            const bg = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
            expect(contrastRatio(readableTextOn(bg), bg)).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('노랑은 검은 글자, 보라는 흰 글자', () => {
        expect(readableTextOn('#FBBC04')).toBe(DARK_TEXT);
        expect(readableTextOn('#6526D9')).toBe(LIGHT_TEXT);
    });

    it('못 읽는 색은 예전처럼 흰 글자', () => {
        expect(readableTextOn('var(--x)')).toBe(LIGHT_TEXT);
        expect(readableTextOn('')).toBe(LIGHT_TEXT);
    });

    it('색 표기 읽기', () => {
        expect(parseColor('#abc')).toEqual([170, 187, 204]);
        expect(parseColor('#6526d914')).toEqual([101, 38, 217]);
        expect(parseColor('hsl(196, 100%, 32%)')).toEqual([0, 120, 163]);
        expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual([127.5, 127.5, 127.5]);
        expect(parseColor('red')).toBeNull();
    });
});
