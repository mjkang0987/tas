import {describe, expect, it} from 'vitest';

import {backgroundForWhiteText, contrastRatio, parseColor} from './contrast';

// 메모 태그(customers MEMO_TAG_COLORS)·담당자 기본색 팔레트
const PALETTE = ['#4285F4', '#34A853', '#EA4335', '#FBBC04', '#FF6D01', '#46BDC6', '#9334E6', '#E91E8C',
    '#6526D9', '#2D7FF9', '#E85D75', '#00A896', '#FB8C00', '#6D6F78', '#7E57C2'];

describe('흰 글자를 얹는 색 바탕', () => {
    it.each(PALETTE)('%s → 흰 글자 4.5:1 이상', (color) => {
        expect(contrastRatio('#ffffff', backgroundForWhiteText(color))).toBeGreaterThanOrEqual(4.5);
    });

    it('이미 진한 색은 그대로, 밝은 색은 같은 색상으로 진하게', () => {
        expect(backgroundForWhiteText('#6526D9')).toBe('#6526D9');
        const yellow = backgroundForWhiteText('#FBBC04');
        expect(yellow).not.toBe('#FBBC04');
        const [r, g, b] = parseColor(yellow)!;
        expect(r).toBeGreaterThan(g); // 노랑 계열(빨강 ≥ 초록 > 파랑) 유지
        expect(g).toBeGreaterThan(b);
    });

    it('어떤 회색이든 흰 글자 4.5 이상', () => {
        for (let v = 0; v <= 255; v++) {
            const bg = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
            expect(contrastRatio('#ffffff', backgroundForWhiteText(bg))).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('못 읽는 색은 그대로', () => {
        expect(backgroundForWhiteText('var(--x)')).toBe('var(--x)');
    });

    it('색 표기 읽기', () => {
        expect(parseColor('#abc')).toEqual([170, 187, 204]);
        expect(parseColor('#6526d914')).toEqual([101, 38, 217]);
        expect(parseColor('hsl(196, 100%, 32%)')).toEqual([0, 120, 163]);
        expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual([127.5, 127.5, 127.5]);
        expect(parseColor('red')).toBeNull();
    });
});
