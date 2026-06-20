import Document, {Html, Head, Main, NextScript, DocumentContext} from 'next/document';

import {ServerStyleSheet} from 'styled-components';

import {SITE_DESCRIPTION, SITE_KEYWORDS, SITE_OG_DESCRIPTION, SITE_OG_IMAGE, SITE_TITLE, SITE_TWITTER_DESCRIPTION, SITE_URL} from '../lib/seo';
import {ADSENSE_CLIENT} from '../lib/ads';

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
        return (
            <Html lang="ko">
                <Head>
                    <link rel="canonical" href={SITE_URL} />
                    <meta name="description" content={SITE_DESCRIPTION} />
                    <meta name="keywords" content={SITE_KEYWORDS} />
                    <meta name="author" content="TAS" />
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content={SITE_TITLE} />
                    <meta property="og:description" content={SITE_OG_DESCRIPTION} />
                    <meta property="og:image" content={SITE_OG_IMAGE} />
                    <meta property="og:url" content={SITE_URL} />
                    <meta name="twitter:title" content={SITE_TITLE} />
                    <meta name="twitter:description" content={SITE_TWITTER_DESCRIPTION} />
                    <meta name="twitter:card" content="summary" />
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
                    {ADSENSE_CLIENT && (
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