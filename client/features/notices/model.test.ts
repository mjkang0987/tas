import {describe, expect, it} from 'vitest';

import {MAX_VISIBLE_NOTICES, noticeCategoryLabel} from './model';

describe('noticeCategoryLabel', () => {
    it('알려진 분류는 한국어 라벨', () => {
        expect(noticeCategoryLabel('event')).toBe('이벤트');
        expect(noticeCategoryLabel('info')).toBe('안내');
    });

    it('모르는 값(옛 데이터·오타)은 공지로 폴백', () => {
        expect(noticeCategoryLabel('unknown')).toBe('공지');
    });
});

describe('MAX_VISIBLE_NOTICES', () => {
    // iOS 앱(StoreNotice.maxPinned)이 같은 값을 하드코딩해 서버 409 와 맞춘다 — 바꾸면 앱도 같이 바꿔야 한다.
    it('3', () => {
        expect(MAX_VISIBLE_NOTICES).toBe(3);
    });
});
