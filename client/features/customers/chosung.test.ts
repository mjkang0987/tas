import {describe, expect, it} from 'vitest';

import {getChosung, isChosungQuery, matchesChosung} from './chosung';

describe('getChosung', () => {
    it('한글 음절을 초성으로 바꾼다', () => {
        expect(getChosung('김민수')).toBe('ㄱㅁㅅ');
    });

    it('된소리 초성도 구분한다', () => {
        expect(getChosung('까치')).toBe('ㄲㅊ');
    });

    it('한글이 아닌 문자는 그대로 둔다', () => {
        expect(getChosung('Kim3')).toBe('Kim3');
    });

    it('한글과 비한글이 섞이면 한글만 초성으로 바뀐다', () => {
        expect(getChosung('김민수2호점')).toBe('ㄱㅁㅅ2ㅎㅈ');
    });

    it('빈 문자열은 빈 문자열', () => {
        expect(getChosung('')).toBe('');
    });

    it('서러게이트 페어(이모지)는 한 글자로 그대로 통과한다', () => {
        expect(getChosung('🙂김민수')).toBe('🙂ㄱㅁㅅ');
    });
});

describe('isChosungQuery', () => {
    it('초성 자모로만 구성되면 true', () => {
        expect(isChosungQuery('ㄱㅁㅅ')).toBe(true);
        expect(isChosungQuery('ㅎ')).toBe(true);
    });

    it('완성형 글자·빈 문자열이 섞이면 false', () => {
        expect(isChosungQuery('김ㅁㅅ')).toBe(false);
        expect(isChosungQuery('')).toBe(false);
        expect(isChosungQuery('010')).toBe(false);
    });
});

describe('matchesChosung', () => {
    it('초성 질의가 이름 초성열 일부와 일치하면 true', () => {
        expect(matchesChosung('김민수', 'ㄱㅁㅅ')).toBe(true);
        expect(matchesChosung('김민수', 'ㄱㅁ')).toBe(true);
        expect(matchesChosung('이김민수', 'ㄱㅁㅅ')).toBe(true);
    });

    it('초성 순서·구성이 다르면 false', () => {
        expect(matchesChosung('김민수', 'ㅁㄱㅅ')).toBe(false);
        expect(matchesChosung('김민수', 'ㄱㅈㅅ')).toBe(false);
    });

    it('초성 질의가 아니면(완성형 포함) 항상 false — 일반 일치는 호출부 책임', () => {
        expect(matchesChosung('김민수', '김민수')).toBe(false);
        expect(matchesChosung('김민수', '')).toBe(false);
    });
});
