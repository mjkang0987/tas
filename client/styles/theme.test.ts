import {describe, expect, it} from 'vitest';

import {isLightOnlyPage, themeAttribute} from './theme';

describe('isLightOnlyPage', () => {
    it('공개 예약·정책 문서·소개 화면은 밝게 고정', () => {
        expect(isLightOnlyPage('/book/[slug]')).toBe(true);
        expect(isLightOnlyPage('/book/[slug]/r/[token]')).toBe(true);
        expect(isLightOnlyPage('/terms')).toBe(true);
        expect(isLightOnlyPage('/privacy')).toBe(true);
        expect(isLightOnlyPage('/dpa')).toBe(true);
        expect(isLightOnlyPage('/', true)).toBe(true);
    });

    it('앱 화면은 시스템 테마를 따른다', () => {
        expect(isLightOnlyPage('/')).toBe(false);
        expect(isLightOnlyPage('/address')).toBe(false);
        expect(isLightOnlyPage('/settings/[tab]')).toBe(false);
        expect(isLightOnlyPage('/login')).toBe(false);
        expect(isLightOnlyPage(undefined)).toBe(false);
        expect(themeAttribute('/address')).toBeUndefined();
        expect(themeAttribute('/terms')).toBe('light');
    });
});
