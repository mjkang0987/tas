import type {GetServerSideProps} from 'next';

import {isBookingHost, resolveRequestHost} from '../features/booking/routing';
import {SITE_URL} from '../lib/seo';

/**
 * 검색 색인 대상 공개 페이지 목록.
 * _app.tsx 동의 가드가 비로그인·미동의에도 통과시키는 경로만 포함한다
 * (그 외 경로는 /login·/consent 로 리다이렉트되어 색인 불가).
 * /login·/logout 은 공개지만 색인 가치가 없어 제외.
 * 루트(/)는 익명 방문자에게 소개 화면을 서버렌더한다(pages/index.tsx `landing`).
 */
const PUBLIC_PATHS = ['/', '/terms', '/privacy'];

function buildSitemap(): string {
    const urls = PUBLIC_PATHS.map((path) => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n  </url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({req, res}) => {
    // 예약 서브도메인에는 사이트맵이 없다. 여기서 메인 URL 목록을 200 으로 주면
    // 다른 호스트의 URL 을 실은 사이트맵이 되어 검색엔진이 거부한다.
    const host = resolveRequestHost(req.headers['x-forwarded-host'] as string | undefined, req.headers.host);
    if (isBookingHost(host)) {
        return {notFound: true};
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.write(buildSitemap());
    res.end();
    return {props: {}};
};

export default function Sitemap() {
    return null;
}
