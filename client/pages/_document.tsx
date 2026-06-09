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
                    <link rel="canonical"
                          href="https://takeaseat.co.kr" />
                    <meta name="description"
                          content="예약 관리, 네이버 예약, 고객관리까지 한 번에!" />
                    <meta name="keywords"
                          content="예약관리, 네이버 예약, 고객관리, 예약 시스템, 미용실, 네일샵, 뷰티 CRM, 예약 캘린더, 헤어샵 예약, 네일샵 예약, Take a seat, TAS" />
                    <meta name="author"
                          content="TAS" />
                    <meta property="og:type"
                          content="website" />
                    <meta property="og:title"
                          content="TAS | 네이버 예약까지 한 번에 관리" />
                    <meta property="og:description"
                          content="네이버 예약 + 자체 예약을 한 화면에서. 예약 관리의 새로운 기준 Take a Seat" />
                    <meta property="og:image"
                          content="https://takeaseat.co.kr/og-image.jpg" />
                    <meta property="og:url"
                          content="https://takeaseat.co.kr" />
                    <meta name="twitter:title"
                          content="TAS | 네이버 예약까지 한 번에 관리" />
                    <meta name="twitter:description"
                          content="예약 관리, 네이버 예약, 고객관리까지 한 번에 확인!" />
                    <meta name="twitter:card"
                          content="summary" />
                    <meta name="twitter:image"
                          content="https://takeaseat.co.kr/og-image.jpg" />
                    <link rel="shortcut icon"
                          href="/favicon/favicon.ico" />
                    <script async
                            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
                            crossOrigin="anonymous" />
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