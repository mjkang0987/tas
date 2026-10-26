import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {describe, expect, it} from 'vitest';

import {contrastRatio} from '../colors/contrast';
import {RESERVATION_STATUS_BADGE_STYLES, RESERVATION_STATUS_BADGE_STYLES_DARK} from './model';

const contrast = contrastRatio;

describe('예약 상태 배지 글자 대비', () => {
    it.each(Object.entries(RESERVATION_STATUS_BADGE_STYLES))('%s 는 배경 위 4.5:1 이상(작은 글자 AA)', (_, {bg, color}) => {
        expect(contrast(color, bg)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('어두운 화면 배지', () => {
    it('같은 상태를 다 갖는다', () => {
        expect(Object.keys(RESERVATION_STATUS_BADGE_STYLES_DARK).sort()).toEqual(Object.keys(RESERVATION_STATUS_BADGE_STYLES).sort());
    });
    it.each(Object.entries(RESERVATION_STATUS_BADGE_STYLES_DARK))('%s 글자 7:1 이상 · 바탕이 카드와 구분', (_, {bg, color}) => {
        expect(contrast(color, bg)).toBeGreaterThanOrEqual(7);
        expect(contrast(bg, '#1c1c1e')).toBeGreaterThanOrEqual(1.3);
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
    it.each(['blue-color', 'warning-color', 'danger-color', 'info-color', 'caution-color', 'dark-gray-color', 'dark-gray-color2'])('--%s', (name) => {
        expect(contrast(token(name), '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token(name), '#f7f7f7')).toBeGreaterThanOrEqual(4.5);
    });
});

// 어두운 화면 글자색 토큰 — 카드 바탕(--surface-color #1C1C1E)·옅은 회색(--gray-color2 #2C2C2E) 위 4.5:1 이상.
describe('어두운 화면 글자색 토큰 대비', () => {
    const css = readFileSync(fileURLToPath(new URL('../../styles/globalStyle.ts', import.meta.url)), 'utf8');
    const dark = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    const token = (name: string) => {
        const m = dark.match(new RegExp(`--${name}:\\s*([^;]+);`));
        if (!m) throw new Error(`어두운 --${name} 없음`);
        return m[1].trim();
    };
    it.each(['black-color', 'blue-color', 'brand-color', 'warning-color', 'danger-color', 'success-color', 'info-color', 'caution-color', 'dark-gray-color', 'dark-gray-color2', 'warning-text', 'naver-color', 'new-customer-color'])('--%s', (name) => {
        expect(contrast(token(name), '#1c1c1e')).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token(name), '#2c2c2e')).toBeGreaterThanOrEqual(4.5);
    });
});
