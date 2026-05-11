import React, {useEffect, useState} from 'react';

import Head from 'next/head';
import Router from 'next/router';

import type {
    AppContext,
    AppProps
} from 'next/app';

import {SessionProvider, useSession} from 'next-auth/react';
import styled, {keyframes} from 'styled-components';

import {GlobalStyle} from '../styles/globalStyle';
import {useCalendarStore} from '../store/calendarStore';
import type {ServiceItem} from '../utils/services';
import type {Designer} from '../utils/designers';
import type {StoreSettings} from '../utils/storeSettings';
import {groupByDate} from '../utils/reservations';
import {toCustomerMap} from '../utils/customers';
import {loadLocalDbSnapshot, setAuthenticated} from '../lib/local-db';

import LayoutComponent from '../components/layout/LayoutComponent';

type AppContentProps = Pick<AppProps, 'Component' | 'pageProps'>;

function AppContent({Component, pageProps}: AppContentProps) {
    const {data: session, status} = useSession();
    const setServiceCatalog = useCalendarStore((s) => s.setServiceCatalog);
    const setCategoryBaseColorMap = useCalendarStore((s) => s.setCategoryBaseColorMap);
    const setDesigners = useCalendarStore((s) => s.setDesigners);
    const setStoreSettings = useCalendarStore((s) => s.setStoreSettings);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const hasApiAccess = status === 'authenticated' && !!session?.user?.role && !!session.user?.storeId;

    useEffect(() => {
        setAuthenticated(hasApiAccess);
    }, [hasApiAccess]);

    useEffect(() => {
        if (status === 'unauthenticated' || (status === 'authenticated' && !hasApiAccess)) {
            const localDb = loadLocalDbSnapshot();
            setServiceCatalog(localDb.services);
            setCategoryBaseColorMap(localDb.categoryBaseColors);
            return;
        }

        if (!hasApiAccess) {
            return;
        }

        fetch('/api/services')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load services');
                return res.json() as Promise<{ services: ServiceItem[]; categoryBaseColors: Record<string, string> }>;
            })
            .then((data) => {
                if (Array.isArray(data.services)) {
                    setServiceCatalog(data.services);
                }

                if (data.categoryBaseColors && typeof data.categoryBaseColors === 'object' && Object.keys(data.categoryBaseColors).length > 0) {
                    setCategoryBaseColorMap(data.categoryBaseColors);
                }
            })
            .catch(() => {
                // Keep default SERVICE_CATALOG if loading fails.
            });
    }, [hasApiAccess, status, setServiceCatalog, setCategoryBaseColorMap]);

    useEffect(() => {
        if (status === 'unauthenticated' || (status === 'authenticated' && !hasApiAccess)) {
            const localDb = loadLocalDbSnapshot();
            setDesigners(localDb.designers);
            return;
        }

        if (!hasApiAccess) {
            return;
        }

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
    }, [hasApiAccess, status, setDesigners]);

    useEffect(() => {
        if (status === 'unauthenticated' || (status === 'authenticated' && !hasApiAccess)) {
            const localDb = loadLocalDbSnapshot();
            setStoreSettings(localDb.storeSettings);
            setReservationMap(groupByDate(localDb.reservations));
            setCustomerMap(toCustomerMap(localDb.customers));
            setReservationHistory(localDb.history);
            return;
        }

        if (!hasApiAccess) {
            return;
        }

        fetch('/api/store')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load store settings');
                return res.json() as Promise<StoreSettings>;
            })
            .then((data) => {
                if (data && typeof data === 'object' && data.businessHours && Array.isArray(data.closedDates)) {
                    const rawPointSettings = data.pointSettings as StoreSettings['pointSettings'] & {mode?: string} | undefined;
                    setStoreSettings({
                        ...data,
                        pointSettings: rawPointSettings
                            ? {
                                enableServiceRate: typeof rawPointSettings.enableServiceRate === 'boolean'
                                    ? rawPointSettings.enableServiceRate
                                    : rawPointSettings.mode === 'service-rate',
                                enableRecharge: typeof rawPointSettings.enableRecharge === 'boolean'
                                    ? rawPointSettings.enableRecharge
                                    : rawPointSettings.mode === 'recharge',
                                serviceRate: rawPointSettings.serviceRate ?? 5,
                                rechargeRules: Array.isArray(rawPointSettings.rechargeRules)
                                    ? rawPointSettings.rechargeRules
                                    : [{baseAmount: 100000, bonusAmount: 5000}],
                            }
                            : {
                                enableServiceRate: true,
                                enableRecharge: true,
                                serviceRate: 5,
                                rechargeRules: [{baseAmount: 100000, bonusAmount: 5000}],
                            },
                    });
                }
            })
            .catch(() => {
                // Keep default store settings if loading fails.
            });
    }, [hasApiAccess, status, setStoreSettings, setReservationMap, setCustomerMap, setReservationHistory]);

    return (
        <>
            <Head>
                <title>TAS | Take a seat</title>
            </Head>
            <GlobalStyle/>
            <LayoutComponent>
                <Component {...pageProps} />
            </LayoutComponent>
        </>
    );
}

function RouteLoadingSpinner() {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        let fallback: ReturnType<typeof setTimeout>;
        const calendarPattern = /^\/(month|week|day|year|three)(\/|$)/;

        const start = (url: string, opts: {shallow: boolean}) => {
            if (opts.shallow || calendarPattern.test(url)) return;
            timer = setTimeout(() => setLoading(true), 300);
            fallback = setTimeout(() => setLoading(false), 8000);
        };
        const end = () => {
            clearTimeout(timer);
            clearTimeout(fallback);
            setLoading(false);
        };

        Router.events.on('routeChangeStart', start);
        Router.events.on('routeChangeComplete', end);
        Router.events.on('routeChangeError', end);

        return () => {
            clearTimeout(timer);
            clearTimeout(fallback);
            Router.events.off('routeChangeStart', start);
            Router.events.off('routeChangeComplete', end);
            Router.events.off('routeChangeError', end);
        };
    }, []);

    if (!loading) return null;

    return (
        <StyledOverlay>
            <StyledSpinner />
        </StyledOverlay>
    );
}

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const StyledOverlay = styled.div`
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    z-index: 9999;
`;

const StyledSpinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid var(--light-gray-color);
    border-top-color: var(--blue-color);
    border-radius: 50%;
    animation: ${spin} 0.6s linear infinite;
`;

function App({Component, pageProps: {session, ...pageProps}}: AppProps) {
    return (
        <SessionProvider session={session}>
            <RouteLoadingSpinner />
            <AppContent Component={Component} pageProps={pageProps}/>
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
