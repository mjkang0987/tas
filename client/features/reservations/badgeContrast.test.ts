import {describe, expect, it} from 'vitest';

import {RESERVATION_STATUS_BADGE_STYLES} from './model';

// WCAG 상대 휘도·대비. 배경이 rgba 면 흰 바탕 위에 섞은 색으로 본다.
function toRgb(color: string): [number, number, number] {
    const rgba = color.match(/rgba?\(([^)]+)\)/);
    if (rgba) {
        const [r, g, b, a = '1'] = rgba[1].split(',').map((v) => v.trim());
        const alpha = Number(a);
        return [Number(r), Number(g), Number(b)].map((c) => c * alpha + 255 * (1 - alpha)) as [number, number, number];
    }
    const hex = color.replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
    const f = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
    const [la, lb] = [luminance(toRgb(a)), luminance(toRgb(b))];
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('예약 상태 배지 글자 대비', () => {
    it.each(Object.entries(RESERVATION_STATUS_BADGE_STYLES))('%s 는 배경 위 4.5:1 이상(작은 글자 AA)', (_, {bg, color}) => {
        expect(contrast(color, bg)).toBeGreaterThanOrEqual(4.5);
    });
});
