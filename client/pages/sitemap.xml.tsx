import type {GetServerSideProps} from 'next';

import {SITE_URL} from '../lib/seo';

/**
 * 검색 색인 대상 공개 페이지 목록.
 * _app.tsx 동의 가드가 비로그인·미동의에도 통과시키는 경로만 포함한다
 * (그 외 경로는 /about·/login·/consent 로 리다이렉트되어 색인 불가).
 * /login·/logout 은 공개지만 색인 가치가 없어 제외.
 * 루트(/)는 익명 방문자에게 소개 화면을 서버렌더한다(pages/index.tsx `landing`).
 * /about 은 같은 내용이라 canonical 을 루트로 걸어 두었고, 중복 제출이 되지 않게 여기선 뺀다.
 */
const PUBLIC_PATHS = ['/', '/terms', '/privacy'];

function buildSitemap(): string {
    const urls = PUBLIC_PATHS.map((path) => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n  </url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({res}) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.write(buildSitemap());
    res.end();
    return {props: {}};
};

export default function Sitemap() {
    return null;
}
