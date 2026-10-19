import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {describe, expect, it} from 'vitest';

import {contrastRatio} from '../colors/contrast';
import {RESERVATION_STATUS_BADGE_STYLES} from './model';

const contrast = contrastRatio;

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
    it.each(['blue-color', 'warning-color', 'danger-color', 'info-color', 'caution-color', 'dark-gray-color', 'dark-gray-color2'])('--%s', (name) => {
        expect(contrast(token(name), '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token(name), '#f7f7f7')).toBeGreaterThanOrEqual(4.5);
    });
});
