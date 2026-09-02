import {describe, expect, it} from 'vitest';

import {findMatchRange} from './search-highlight';

describe('findMatchRange', () => {
    it('일반 부분일치 구간을 찾는다', () => {
        expect(findMatchRange('김민수', '민수')).toEqual({start: 1, end: 3});
    });

    it('caseInsensitive 옵션 없이는 대소문자를 구분한다', () => {
        expect(findMatchRange('Kim', 'kim')).toBeNull();
    });

    it('caseInsensitive 옵션이면 대소문자를 무시한다', () => {
        expect(findMatchRange('Kim', 'kim', {caseInsensitive: true})).toEqual({start: 0, end: 3});
    });

    it('일반 부분일치가 없으면 초성 부분일치를 본다', () => {
        expect(findMatchRange('김민수', 'ㄱㅁㅅ')).toEqual({start: 0, end: 3});
        expect(findMatchRange('이김민수', 'ㄱㅁㅅ')).toEqual({start: 1, end: 4});
    });

    it('일반 일치가 초성 일치보다 우선한다', () => {
        // '가'는 그 자체로 문자열에 있으므로 초성 규칙과 무관하게 일반 부분일치로 잡힌다.
        expect(findMatchRange('가나다', '가')).toEqual({start: 0, end: 1});
    });

    it('아무것도 못 찾으면 null', () => {
        expect(findMatchRange('김민수', '박서준')).toBeNull();
        expect(findMatchRange('김민수', 'ㅂㅅㅈ')).toBeNull();
    });

    it('빈 검색어는 null', () => {
        expect(findMatchRange('김민수', '')).toBeNull();
    });
});
