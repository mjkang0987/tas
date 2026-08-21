import Document, {Html, Head, Main, NextScript, DocumentContext} from 'next/document';

import {ServerStyleSheet} from 'styled-components';

import {SITE_KEYWORDS, SITE_OG_DESCRIPTION, SITE_OG_IMAGE, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_WIDTH, SITE_TITLE, SITE_TWITTER_DESCRIPTION, SITE_URL} from '../lib/seo';
import {ADSENSE_CLIENT} from '../lib/ads';
import {isBookingRoute} from '../features/booking/routing';

class ReservationDocument extends Document {
    static async getInitialProps(ctx: DocumentContext) {
        const sheet = new ServerStyleSheet();
        const originalRenderPage = ctx.renderPage;

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) =>
                        sheet.collectStyles(<App {...props} />)
                });

            const initialProps = await Document.getInitialProps(ctx);
            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </>
                )
            };
        } finally {
            sheet.seal();
        }
    }

    render() {
        // 공개 예약 페이지에는 광고 유닛(AdBanner)이 하나도 렌더되지 않는다(isBarePage라 Footer 광고 영역을 안 탐).
        // 스크립트만 로드되면 고객 브라우저에 광고 식별 쿠키(__eoi·_gcl_au)만 남으므로 제외한다.
        const isBookingPage = isBookingRoute(this.props.__NEXT_DATA__?.page);
        return (
            <Html lang="ko">
                <Head>
                    <meta name="naver-site-verification" content="007f9bb5b9d7d529ee9b602a19c8a3da58298eee" />
                    <meta name="keywords" content={SITE_KEYWORDS} />
                    <meta name="author" content="TAS" />
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content={SITE_TITLE} />
                    <meta property="og:description" content={SITE_OG_DESCRIPTION} />
                    <meta property="og:image" content={SITE_OG_IMAGE} />
                    <meta property="og:image:width" content={SITE_OG_IMAGE_WIDTH} />
                    <meta property="og:image:height" content={SITE_OG_IMAGE_HEIGHT} />
                    <meta property="og:url" content={SITE_URL} />
                    <meta name="twitter:title" content={SITE_TITLE} />
                    <meta name="twitter:description" content={SITE_TWITTER_DESCRIPTION} />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:image" content={SITE_OG_IMAGE} />
                    <link rel="icon"
                          href="/favicon/favicon.ico"
                          sizes="any" />
                    <link rel="icon"
                          type="image/png"
                          sizes="32x32"
                          href="/favicon/favicon32x32.png" />
                    <link rel="icon"
                          type="image/png"
                          sizes="16x16"
                          href="/favicon/favicon16x16.png" />
                    <link rel="apple-touch-icon"
                          sizes="180x180"
                          href="/favicon/apple-icon-180x180.png" />
                    <link rel="manifest"
                          href="/favicon/manifest.json" />
                    {ADSENSE_CLIENT && !isBookingPage && (
                        <script async
                                src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
                                crossOrigin="anonymous" />
                    )}
                </Head>
                <body>
                <Main />
                <NextScript />
                <div id="modal-root"></div>
                </body>
            </Html>
        );
    }
}

export default ReservationDocument;