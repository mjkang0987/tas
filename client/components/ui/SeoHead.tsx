import Head from 'next/head';

import {SITE_NAME} from '../../lib/seo';

interface SeoHeadProps {
    title: string;
}

export function SeoHead({title}: SeoHeadProps) {
    return (
        <Head>
            <title>{SITE_NAME} | {title}</title>
        </Head>
    );
}
