import React, {useEffect, useRef, useState} from 'react';

import Link from 'next/link';
import Router, {useRouter} from 'next/router';

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
import {loadLocalDbSnapshot, saveLocalDbSnapshot, setAuthenticated, shouldUseLocalDb} from '../lib/local-db';

import LayoutComponent from '../components/layout/LayoutComponent';

type AppContentProps = Pick<AppProps, 'Component' | 'pageProps'>;

function AppContent({Component, pageProps}: AppContentProps) {
    const {data: session, status} = useSession();
    const router = useRouter();
    const setServiceCatalog = useCalendarStore((s) => s.setServiceCatalog);
    const setCategoryBaseColorMap = useCalendarStore((s) => s.setCategoryBaseColorMap);
    const setDesigners = useCalendarStore((s) => s.setDesigners);
    const setStoreInfo = useCalendarStore((s) => s.setStoreInfo);
    const setStoreSettings = useCalendarStore((s) => s.setStoreSettings);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const initSyncNotifications = useCalendarStore((s) => s.initSyncNotifications);
    const clearSyncNotifications = useCalendarStore((s) => s.clearSyncNotifications);
    const hasApiAccess = status === 'authenticated' && !!session?.user?.role && !!session.user?.storeId;

    const [sessionExpired, setSessionExpired] = useState(false);
    const hadSessionRef = useRef(false);

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('takeaseat.authenticated') === '1') {
            hadSessionRef.current = true;
        }
        initSyncNotifications();
    }, [initSyncNotifications]);

    // 게스트·미인증 사용자는 네이버 동기화를 사용할 수 없으므로 알림 초기화
    useEffect(() => {
        if (status === 'loading') return;
        if (!hasApiAccess) {
            clearSyncNotifications();
        }
    }, [status, hasApiAccess, clearSyncNotifications]);

    useEffect(() => {
        if (status === 'authenticated') {
            hadSessionRef.current = true;
        }
        if (status === 'unauthenticated' && hadSessionRef.current) {
            setSessionExpired(true);
            hadSessionRef.current = false;
        }
    }, [status]);

    useEffect(() => {
        setAuthenticated(hasApiAccess);
    }, [hasApiAccess]);

    // 게스트 → SNS 연동 시 로컬 온보딩 데이터를 서버로 마이그레이션
    const localSyncDone = useRef(false);
    useEffect(() => {
        if (!hasApiAccess || localSyncDone.current) return;

        const snapshot = loadLocalDbSnapshot();
        if (!snapshot.onboarded) return;
        if (snapshot.services.length === 0 && snapshot.designers.length === 0) return;

        localSyncDone.current = true;

        fetch('/api/onboarding', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                shopName: snapshot.storeName ?? '',
                shopType: snapshot.shopType ?? null,
                services: snapshot.services,
                designers: snapshot.designers.map((d) => ({name: d.name, color: d.color})),
            }),
        })
            .then((res) => {
                if (res.ok) {
                    snapshot.onboarded = false;
                    saveLocalDbSnapshot(snapshot);
                }
            })
            .catch(() => {
                localSyncDone.current = false;
            });
    }, [hasApiAccess]);

    useEffect(() => {
        if (status === 'loading') return;
        if (!shouldUseLocalDb()) return;
        if (router.pathname.startsWith('/onboarding') || router.pathname.startsWith('/login')) return;

        if (typeof window === 'undefined') return;
        const raw = window.localStorage.getItem('takeaseat.local-db.v1');
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            if (parsed.onboarded === false) {
                router.replace('/onboarding?mode=guest');
            }
        } catch {
            // ignore
        }
    }, [status, router]);

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
            setStoreInfo(localDb.storeName ?? '', localDb.shopType ?? null);
            setStoreSettings(localDb.storeSettings);
            setReservationMap(groupByDate(localDb.reservations));
            setCustomerMap(toCustomerMap(localDb.customers));
            setReservationHistory(localDb.history);
            return;
        }

        if (!hasApiAccess) {
            return;
        }

        Promise.all([
            fetch('/api/store'),
            fetch('/api/reservations'),
            fetch('/api/customers'),
        ])
            .then(async ([storeRes, reservationsRes, customersRes]) => {
                if (!storeRes.ok) throw new Error('Failed to load store settings');
                if (!reservationsRes.ok) throw new Error('Failed to load reservations');
                if (!customersRes.ok) throw new Error('Failed to load customers');

                return Promise.all([
                    storeRes.json() as Promise<StoreSettings & {storeName?: string; shopType?: string | null}>,
                    reservationsRes.json() as Promise<{
                        reservations: Array<Parameters<typeof groupByDate>[0][number]>;
                        history: Parameters<typeof setReservationHistory>[0];
                    }>,
                    customersRes.json() as Promise<{customers: Array<Parameters<typeof toCustomerMap>[0][number]>}>,
                ]);
            })
            .then(([storeData, reservationsData, customersData]) => {
                setStoreInfo(storeData.storeName ?? '', storeData.shopType ?? null);
                if (storeData && typeof storeData === 'object' && storeData.businessHours && Array.isArray(storeData.closedDates)) {
                    const rawPointSettings = storeData.pointSettings as StoreSettings['pointSettings'] & {mode?: string} | undefined;
                    setStoreSettings({
                        ...storeData,
                        pointSettings: rawPointSettings
                            ? {
                                enableServiceRate: typeof rawPointSettings.enableServiceRate === 'boolean'
                                    ? rawPointSettings.enableServiceRate
                                    : rawPointSettings.mode === 'service-rate',
                                enableRecharge: typeof rawPointSettings.enableRecharge === 'boolean'
                                    ? rawPointSettings.enableRecharge
                                    : rawPointSettings.mode === 'recharge',
                                serviceRate: rawPointSettings.serviceRate ?? 0,
                                rechargeRules: Array.isArray(rawPointSettings.rechargeRules)
                                    ? rawPointSettings.rechargeRules
                                    : [{baseAmount: 0, bonusAmount: 0}],
                            }
                            : {
                                enableServiceRate: false,
                                enableRecharge: false,
                                serviceRate: 0,
                                rechargeRules: [{baseAmount: 0, bonusAmount: 0}],
                            },
                    });
                }

                if (Array.isArray(reservationsData.reservations)) {
                    setReservationMap(groupByDate(reservationsData.reservations));
                }

                if (Array.isArray(reservationsData.history)) {
                    setReservationHistory(reservationsData.history);
                }

                if (Array.isArray(customersData.customers)) {
                    setCustomerMap(toCustomerMap(customersData.customers));
                }
            })
            .catch(() => {
                // Keep the current in-memory data if loading fails.
            });
    }, [hasApiAccess, status, setStoreInfo, setStoreSettings, setReservationMap, setCustomerMap, setReservationHistory]);

    return (
        <>
            <GlobalStyle/>
            <LayoutComponent>
                <Component {...pageProps} />
            </LayoutComponent>
            {sessionExpired && (
                <StyledSessionExpiredToast>
                    <span>로그인 세션이 만료되었습니다.</span>
                    <StyledSessionExpiredLink href="/login" onClick={() => setSessionExpired(false)}>
                        다시 로그인
                    </StyledSessionExpiredLink>
                    <StyledSessionExpiredClose type="button" onClick={() => setSessionExpired(false)}>
                        ✕
                    </StyledSessionExpiredClose>
                </StyledSessionExpiredToast>
            )}
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

const StyledSessionExpiredToast = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    background: var(--toast-bg);
    color: var(--white-color);
    font-size: 13px;
    box-shadow: var(--modal-shadow);
    z-index: 10000;
    white-space: nowrap;
`;

const StyledSessionExpiredLink = styled(Link)`
    color: var(--link-color-light);
    font-weight: 600;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

const StyledSessionExpiredClose = styled.button`
    padding: 0;
    border: none;
    background: none;
    color: var(--muted-text);
    font-size: 14px;
    line-height: 1;
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
