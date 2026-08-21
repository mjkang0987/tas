import type {GetServerSideProps} from 'next';

import {isBookingHost, resolveHostFromHeaders} from '../features/booking/routing';
import {SITE_URL} from '../lib/seo';

/**
 * robots.txt 를 호스트별로 나눈다.
 *
 * `public/robots.txt` 로 두면 **예약 서브도메인도 같은 파일을 받는다** — proxy.ts 의
 * `handleBookingHost` 가 확장자 있는 경로를 그대로 통과시키기 때문이다. 그러면
 * `Disallow: /month` 같은 메인 사이트 규칙이 거기선 **매장 슬러그**를 막고
 * (슬러그가 `month`·`login`·`settings` 면 걸린다), `Sitemap:` 도 남의 호스트를 가리킨다.
 */
const MAIN_ROBOTS = `User-agent: *
Allow: /

# 인증·관리 영역 (색인 불필요)
Disallow: /api/
Disallow: /mypage
Disallow: /settings
Disallow: /menu
Disallow: /consent
Disallow: /address
Disallow: /onboarding
Disallow: /logout

# 동의 필요 → 비로그인 접근 시 리다이렉트 (색인 불가)
Disallow: /inquiry
Disallow: /dpa

# /로 rewrite되는 앱 뷰 (홈과 중복)
Disallow: /day
Disallow: /three
Disallow: /week
Disallow: /month
Disallow: /year

Sitemap: ${SITE_URL}/sitemap.xml
`;

// 예약 서브도메인. 루트 바로 아래가 매장 슬러그라 경로 기반 Disallow 를 두면 슬러그를 막는다.
// 예약 확인 링크(/{slug}/r/{token})는 **페이지의 noindex 로** 뺀다 — 여기서 Disallow 하면
// 크롤러가 그 태그를 읽지 못해 URL 만 남은 색인이 생긴다.
const BOOKING_ROBOTS = `User-agent: *
Allow: /

Disallow: /api/
`;

export const getServerSideProps: GetServerSideProps = async ({req, res}) => {
    const host = resolveHostFromHeaders(req.headers);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.write(isBookingHost(host) ? BOOKING_ROBOTS : MAIN_ROBOTS);
    res.end();
    return {props: {}};
};

export default function Robots() {
    return null;
}
