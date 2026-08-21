import Head from 'next/head';

import {SITE_DESCRIPTION, SITE_NAME, SITE_URL} from '../../lib/seo';

interface SeoHeadProps {
    title: string;
    description?: string;
    /**
     * 색인 대상 공개 페이지에만 지정. SITE_URL 기준 절대 경로(예: '/terms').
     * 지정한 페이지만 canonical을 선언하고, 비공개 페이지는 URL 자체가 기본 canonical이 된다.
     */
    path?: string;
    /**
     * 검색 색인에서 제외한다. **robots.txt 로 막는 것과 바꿔 쓰지 말 것** —
     * 크롤이 막히면 크롤러가 이 태그를 읽지 못해 오히려 URL 만 남은 색인이 생긴다.
     */
    noindex?: boolean;
}

export function SeoHead({title, description = SITE_DESCRIPTION, path, noindex = false}: SeoHeadProps) {
    return (
        <Head>
            <title>{`${SITE_NAME} | ${title}`}</title>
            <meta name="description" content={description} />
            {noindex && <meta name="robots" content="noindex" />}
            {path !== undefined && <link rel="canonical" href={`${SITE_URL}${path}`} />}
        </Head>
    );
}
