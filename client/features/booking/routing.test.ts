import {describe, expect, it} from 'vitest';

import {
    bookBaseForHost,
    bookHref,
    isBookLang,
    isBookingHost,
    isBookingRoute,
    isMainHost,
    resolveHostFromHeaders,
    resolveRequestHost,
} from './routing';

// 기본 호스트(NEXT_PUBLIC_BOOKING_HOST 미지정 시). 이 값이 robots.txt·sitemap 분기의 기준이다.
const BOOKING = 'book.takeaseat.co.kr';

describe('resolveRequestHost', () => {
    it('x-forwarded-host 를 host 보다 우선한다', () => {
        // 오리진의 host 는 항상 run.app 이라(Cloudflare Worker 가 갈아끼움) 원 호스트는 이쪽에만 있다.
        expect(resolveRequestHost(BOOKING, 'tas-xxx.run.app')).toBe(BOOKING);
    });

    it('프록시가 겹쳐 콤마로 이어붙으면 최초 값(원 요청 호스트)만 쓴다', () => {
        expect(resolveRequestHost(`${BOOKING}, proxy.internal`, null)).toBe(BOOKING);
    });

    it('대문자·공백을 정규화한다', () => {
        expect(resolveRequestHost('  BOOK.TakeASeat.co.KR  ', null)).toBe(BOOKING);
    });

    it('x-forwarded-host 가 없으면 host 로 폴백한다', () => {
        expect(resolveRequestHost(null, 'takeaseat.co.kr')).toBe('takeaseat.co.kr');
    });

    it('빈 문자열은 폴백을 막지 않는다', () => {
        expect(resolveRequestHost('', 'takeaseat.co.kr')).toBe('takeaseat.co.kr');
    });

    it('둘 다 없으면 빈 문자열', () => {
        expect(resolveRequestHost(undefined, undefined)).toBe('');
    });
});

describe('resolveHostFromHeaders', () => {
    it('SSR 헤더에서 원 요청 호스트를 뽑는다', () => {
        expect(resolveHostFromHeaders({'x-forwarded-host': BOOKING, host: 'tas-xxx.run.app'})).toBe(BOOKING);
    });

    it('헤더가 배열로 오면 최초 값을 쓴다', () => {
        // Node 는 보통 ', ' 로 이어붙이지만 타입상 string[] 도 가능하다 — 캐스팅으로 덮지 않는다.
        expect(resolveHostFromHeaders({'x-forwarded-host': [BOOKING, 'proxy.internal']})).toBe(BOOKING);
    });

    it('x-forwarded-host 가 없으면 host 를 쓴다', () => {
        expect(resolveHostFromHeaders({host: 'takeaseat.co.kr'})).toBe('takeaseat.co.kr');
    });

    it('헤더가 비어도 던지지 않는다', () => {
        expect(resolveHostFromHeaders({})).toBe('');
    });
});

describe('isBookingHost / isMainHost', () => {
    it('예약 서브도메인을 알아본다', () => {
        expect(isBookingHost(BOOKING)).toBe(true);
        expect(isBookingHost('takeaseat.co.kr')).toBe(false);
    });

    it('메인 호스트는 www 포함 두 가지', () => {
        expect(isMainHost('takeaseat.co.kr')).toBe(true);
        expect(isMainHost('www.takeaseat.co.kr')).toBe(true);
    });

    it('로컬·dev·run.app 은 메인 호스트가 아니다 — 구 /book 경로가 그대로 동작해야 한다', () => {
        expect(isMainHost('localhost:3000')).toBe(false);
        expect(isMainHost('dev.takeaseat.co.kr')).toBe(false);
        expect(isMainHost('tas-xxx.run.app')).toBe(false);
    });

    it('두 판정 모두 빈 호스트에 false', () => {
        expect(isBookingHost('')).toBe(false);
        expect(isMainHost(null)).toBe(false);
    });
});

describe('bookBaseForHost', () => {
    it('예약 서브도메인에서는 슬러그가 루트 바로 아래라 접두가 없다', () => {
        expect(bookBaseForHost(BOOKING)).toBe('');
    });

    it('그 외 호스트에서는 /book 접두를 쓴다', () => {
        expect(bookBaseForHost('takeaseat.co.kr')).toBe('/book');
        expect(bookBaseForHost('localhost:3000')).toBe('/book');
    });
});

describe('isBookingRoute', () => {
    it('내부 라우트 접두로 판정한다(호스트·rewrite 와 무관)', () => {
        expect(isBookingRoute('/book/[slug]')).toBe(true);
        expect(isBookingRoute('/book/[slug]/r/[token]')).toBe(true);
    });

    it('접두만 같고 하위가 없으면 예약 페이지가 아니다', () => {
        expect(isBookingRoute('/book')).toBe(false);
        expect(isBookingRoute('/bookmark')).toBe(false);
    });

    it('빈 값에 false', () => {
        expect(isBookingRoute(undefined)).toBe(false);
        expect(isBookingRoute(null)).toBe(false);
    });
});

describe('isBookLang', () => {
    it('지원 언어만 통과시킨다', () => {
        expect(isBookLang('ko')).toBe(true);
        expect(isBookLang('ja')).toBe(true);
        expect(isBookLang('de')).toBe(false);
        expect(isBookLang(3)).toBe(false);
    });
});

describe('bookHref', () => {
    it('한국어는 언어 접두가 없다', () => {
        expect(bookHref('ko', 'my-shop')).toBe('/book/my-shop');
    });

    it('그 외 언어는 /{lang} 접두', () => {
        expect(bookHref('ja', 'my-shop')).toBe('/book/ja/my-shop');
    });

    it('예약 서브도메인 base 를 주면 /book 이 사라진다', () => {
        expect(bookHref('ko', 'my-shop', undefined, bookBaseForHost(BOOKING))).toBe('/my-shop');
    });

    it('슬러그·토큰을 URL 인코딩한다', () => {
        expect(bookHref('ko', '내 가게')).toBe(`/book/${encodeURIComponent('내 가게')}`);
        expect(bookHref('ko', 'shop', {token: 'a/b'})).toBe('/book/shop/r/a%2Fb');
    });
});
