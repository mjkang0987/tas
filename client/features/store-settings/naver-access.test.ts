// 네이버예약 연동 노출 대상 판별.
// 이 판정이 틀리면 두 방향 모두 사고다 — 허용 매장이 쓰던 연동을 잃거나,
// 아직 열지 않은 매장에 연동 메뉴가 노출된다.

import {describe, expect, it} from 'vitest';

import {NAVER_BOOKING_ALLOWED_SLUGS, isNaverBookingAllowedSlug} from './naver-access';

describe('isNaverBookingAllowedSlug', () => {
    it('허용 목록에 있는 매장은 노출 대상이다', () => {
        expect(isNaverBookingAllowedSlug('hairsalonkimeun')).toBe(true);
    });

    it('목록에 없는 매장은 제외한다', () => {
        expect(isNaverBookingAllowedSlug('otherstore')).toBe(false);
        // 부분 일치로 통과하면 안 된다 — 'hairsalonkimeun2' 를 만든 매장이 딸려 들어온다.
        expect(isNaverBookingAllowedSlug('hairsalonkimeun2')).toBe(false);
        expect(isNaverBookingAllowedSlug('kimeun')).toBe(false);
    });

    it('슬러그가 없는 매장(미설정)은 제외한다', () => {
        expect(isNaverBookingAllowedSlug(null)).toBe(false);
        expect(isNaverBookingAllowedSlug(undefined)).toBe(false);
    });

    it('빈 문자열·공백뿐인 값은 제외한다', () => {
        // 정규화 결과가 빈 문자열이 되는 값들. 목록 대조 전에 걸러내지 않으면
        // 목록에 빈 항목이 섞였을 때 슬러그 없는 매장이 통째로 통과한다.
        expect(isNaverBookingAllowedSlug('')).toBe(false);
        expect(isNaverBookingAllowedSlug('   ')).toBe(false);
    });

    it('대소문자·앞뒤 공백은 정규화해서 대조한다', () => {
        expect(isNaverBookingAllowedSlug('HairSalonKimeun')).toBe(true);
        expect(isNaverBookingAllowedSlug('  hairsalonkimeun  ')).toBe(true);
    });

    it('허용 목록은 비어 있지 않다', () => {
        // 목록을 비우면 모든 매장이 조용히 차단된다(파일럿 매장 포함).
        expect(NAVER_BOOKING_ALLOWED_SLUGS.length).toBeGreaterThan(0);
    });
});
