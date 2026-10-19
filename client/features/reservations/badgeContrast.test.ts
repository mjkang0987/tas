import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {describe, expect, it} from 'vitest';

import {RESERVATION_STATUS_BADGE_STYLES} from './model';

// WCAG 상대 휘도·대비. 배경이 rgba 면 흰 바탕 위에 섞은 색으로 본다.
function toRgb(color: string): [number, number, number] {
    const hsl = color.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
    if (hsl) {
        const [h, s, l] = [Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100];
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
        };
        return [f(0), f(8), f(4)];
    }
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

// 글자색으로 쓰는 공용 토큰 — 흰 바탕·옅은 회색 바탕(--black-color-10 = #F7F7F7) 위 4.5:1.
describe('글자색 토큰 대비', () => {
    const css = readFileSync(fileURLToPath(new URL('../../styles/globalStyle.ts', import.meta.url)), 'utf8');
    const token = (name: string) => {
        const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
        if (!m) throw new Error(`--${name} 없음`);
        return m[1].trim();
    };
    it.each(['blue-color', 'warning-color', 'danger-color', 'info-color', 'caution-color'])('--%s', (name) => {
        expect(contrast(token(name), '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token(name), '#f7f7f7')).toBeGreaterThanOrEqual(4.5);
    });
});
