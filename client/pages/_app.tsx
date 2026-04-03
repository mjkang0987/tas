import React, {useEffect} from 'react';

import Head from 'next/head';

import type {
    AppContext,
    AppProps
} from 'next/app';

import {SessionProvider} from 'next-auth/react';

import {GlobalStyle} from '../styles/globalStyle';
import {useCalendarStore} from '../store/calendarStore';
import type {ServiceItem} from '../utils/services';
import type {Designer} from '../utils/designers';

import LayoutComponent from '../components/LayoutComponent';

function App({Component, pageProps: {session, ...pageProps}}: AppProps) {
    const setServiceCatalog = useCalendarStore((s) => s.setServiceCatalog);
    const setCategoryBaseColorMap = useCalendarStore((s) => s.setCategoryBaseColorMap);
    const setDesigners = useCalendarStore((s) => s.setDesigners);

    useEffect(() => {
        fetch('/api/services')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load services');
                return res.json() as Promise<{ services: ServiceItem[]; categoryBaseColors: Record<string, string> }>;
            })
            .then((data) => {
                if (Array.isArray(data.services)) {
                    setServiceCatalog(data.services);
                }

                if (data.categoryBaseColors && typeof data.categoryBaseColors === 'object') {
                    setCategoryBaseColorMap(data.categoryBaseColors);
                }
            })
            .catch(() => {
                // Keep default SERVICE_CATALOG if loading fails.
            });
    }, [setServiceCatalog, setCategoryBaseColorMap]);

    useEffect(() => {
        fetch('/api/designers')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load designers');
                return res.json() as Promise<{ designers: Designer[] }>;
            })
            .then((data) => {
                if (Array.isArray(data.designers)) {
                    setDesigners(data.designers);
                }
            })
            .catch(() => {
                // Keep default designers if loading fails.
            });
    }, [setDesigners]);

    return (
        <SessionProvider session={session}>
            <Head>
                <title>Chairtime</title>
            </Head>
            <GlobalStyle/>
            <LayoutComponent>
                <Component {...pageProps} />
            </LayoutComponent>
        </SessionProvider>
    );
}

App.getInitialProps = async ({Component, ctx}: AppContext) => {
    const initProps = Component.getInitialProps ? await Component.getInitialProps(ctx) : {};

    const agent = ctx.req?.headers['user-agent'] ?? '';
    const desktopRegex = /windows nt|macintosh|linux/i;
    const isDesktop = desktopRegex.test(agent);

    return {
        pageProps: {
            ...initProps,
            isDesktop
        }
    };
};

export default App;
