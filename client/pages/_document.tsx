import Document, {Html, Head, Main, NextScript, DocumentContext} from 'next/document';

import {ServerStyleSheet} from 'styled-components';

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
                    <meta name="description" content="meta content description"/>
                    <meta name="keywords" content="meta keywords"/>
                    <meta name="author" content="MJ Kang"/>
                    <meta name="og:site_name" content="Chairtime"/>
                    <meta name="og:title" content="service title"/>
                    <meta name="og:description" content="service description"/>
                    <meta name="og:type" content="website"/>
                    <meta name="og:url" content="service url"/>
                    <meta name="og:image" content="image url"/>
                    <meta name="twitter:title" content="service title"/>
                    <meta name="twitter:description" content="service description"/>
                    <meta name="twitter:card" content="summary"/>
                    <meta name="og:url" content="service url"/>
                    <meta name="twitter:image" content="image url"/>
                    <link rel="shortcut icon" href="/favicon.ico" />
                </Head>
                <body>
                    <Main/>
                    <NextScript/>
                    <div id="modal-root"></div>
                </body>
            </Html>
        );
    }
}

export default ReservationDocument;