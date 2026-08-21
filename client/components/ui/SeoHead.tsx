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
}

export function SeoHead({title, description = SITE_DESCRIPTION, path}: SeoHeadProps) {
    return (
        <Head>
            <title>{`${SITE_NAME} | ${title}`}</title>
            <meta name="description" content={description} />
            {path !== undefined && <link rel="canonical" href={`${SITE_URL}${path}`} />}
        </Head>
    );
}
