import React, {useEffect, useRef, useState} from 'react';

import Link from 'next/link';
import Router, {useRouter} from 'next/router';

import type {
    AppContext,
    AppProps
} from 'next/app';

import {SessionProvider, useSession} from 'next-auth/react';
import styled from 'styled-components';

import {GlobalStyle} from '../styles/globalStyle';
import {useCalendarStore} from '../store/calendarStore';
import type {ServiceItem} from '../utils/services';
import type {Designer} from '../utils/designers';
import type {StoreSettings} from '../utils/storeSettings';
import {groupByDate} from '../utils/reservations';
import {toCustomerMap} from '../utils/customers';
import {clearGuestEntryResolved, createDefaultLocalDbSnapshot, getGuestTermsVersion, hasGuestData, isGuestEntryResolved, loadLocalDbSnapshot, markGuestEntryResolved, saveLocalDbSnapshot, setAuthenticated, shouldUseLocalDb} from '../lib/local-db';
import {CURRENT_TERMS_VERSION} from '../utils/terms';

import LayoutComponent from '../components/layout/LayoutComponent';
import {ToastContainer} from '../components/ui/ToastContainer';
import {GuestMigrationLayer} from '../components/modals/GuestMigrationLayer';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {LoadingOverlay} from '../components/ui/LoadingOverlay';

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
    const [migrationData, setMigrationData] = useState<{
        snapshot: ReturnType<typeof loadLocalDbSnapshot>;
        storeName: string;
    } | null>(null);
    const [servicesReady, setServicesReady] = useState(false);
    const [designersReady, setDesignersReady] = useState(false);
    const [reservationsReady, setReservationsReady] = useState(false);
    const [showGuestEntry, setShowGuestEntry] = useState(false);
    const hadSessionRef = useRef(false);
    const guestEntryHandledRef = useRef(false);

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
            // 로그인 상태에선 게스트 진입 플래그 불필요 → 비워서 로그아웃 후 잔존 방지
            clearGuestEntryResolved();
        }
        if (status === 'unauthenticated' && hadSessionRef.current) {
            setSessionExpired(true);
            hadSessionRef.current = false;
        }
    }, [status]);

    useEffect(() => {
        setAuthenticated(hasApiAccess);
    }, [hasApiAccess]);

    // 게스트 → SNS 연동 시 로컬 데이터를 서버로 전체 마이그레이션
    const localSyncDone = useRef(false);
    useEffect(() => {
        if (!hasApiAccess || localSyncDone.current) return;
        if (session?.user?.role !== 'owner') return;

        const snapshot = loadLocalDbSnapshot();
        if (!snapshot.onboarded) return;
        const hasLocalData =
            snapshot.services.length > 0 ||
            snapshot.designers.length > 0 ||
            snapshot.customers.length > 0 ||
            snapshot.reservations.length > 0;
        if (!hasLocalData) return;

        localSyncDone.current = true;

        fetch('/api/migrate-local', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                shopName: snapshot.storeName ?? '',
                shopType: snapshot.shopType ?? null,
                services: snapshot.services,
                designers: snapshot.designers.map((d) => ({id: d.id, name: d.name, color: d.color ?? null})),
                customers: snapshot.customers,
                reservations: snapshot.reservations,
            }),
        })
            .then(async (res) => {
                if (res.ok) {
                    // 빈 매장: 전체 생성 완료 → 로컬 정리 후 리로드
                    const clean = createDefaultLocalDbSnapshot();
                    clean.onboarded = false;
                    saveLocalDbSnapshot(clean);
                    window.location.reload();
                } else if (res.status === 409) {
                    // 기존 데이터 있는 매장 → 병합/삭제 레이어 표시
                    const data = await res.json() as {storeName?: string};
                    setMigrationData({snapshot, storeName: data.storeName ?? ''});
                } else {
                    localSyncDone.current = false;
                }
            })
            .catch(() => {
                localSyncDone.current = false;
            });
    }, [hasApiAccess, session]);

    // 미인증(게스트) 진입 처리 — 로그인 계정은 proxy.ts 미들웨어가 처리
    useEffect(() => {
        if (status === 'loading' || status === 'authenticated') return;
        const path = router.pathname;

        // 로그인 / 약관 문서는 자유 접근
        if (path === '/login' || path === '/terms' || path === '/privacy' || path === '/logout') return;

        const consented = getGuestTermsVersion() === CURRENT_TERMS_VERSION;
        // 게스트로 커밋(게스트 시작 버튼 누름=resolved, 또는 사용 데이터 있음)한 적이 있는지
        const committed = hasGuestData() || isGuestEntryResolved();

        // /consent·/onboarding: 게스트 시작 절차 없이 URL 직접 접근하면 로그인으로
        if (path === '/consent' || path.startsWith('/onboarding')) {
            if (!committed) {
                router.replace('/login');
                return;
            }
            // 온보딩 진입인데 약관 미동의면 동의 먼저
            if (path.startsWith('/onboarding') && !consented) {
                router.replace(`/consent${router.asPath}`);
            }
            return;
        }

        // 로컬 데이터 없음 → 로그인으로 (아직 게스트로 커밋 안 함, 동의 불필요)
        if (!hasGuestData()) {
            router.replace('/login');
            return;
        }

        // 게스트 데이터 있음(=게스트로 사용 중)인데 미동의 → 어느 페이지든 동의 먼저
        // (온보딩 건너뛰기 등으로 동의를 우회하는 경우의 backstop)
        if (!consented) {
            router.replace(`/consent${router.asPath}`);
            return;
        }

        // 이하 "불러오기 안내"는 마운트당 1회만
        if (guestEntryHandledRef.current) return;
        guestEntryHandledRef.current = true;

        // 이번 세션에 이미 결정했으면 다시 묻지 않고 그대로 사용
        if (isGuestEntryResolved()) return;

        // 데이터 있음 + 동의 완료 + 미결정 → 불러오기 안내
        setShowGuestEntry(true);
    }, [status, router]);

    useEffect(() => {
        if (status === 'loading') return;
        if (!shouldUseLocalDb()) return;
        if (router.pathname.startsWith('/onboarding') || router.pathname.startsWith('/login')) return;
        // 약관 미동의 게스트는 동의 게이트가 먼저 처리하도록 양보
        if (getGuestTermsVersion() !== CURRENT_TERMS_VERSION) return;

        if (typeof window === 'undefined') return;
        const raw = window.localStorage.getItem('takeaseat.local-db.v1');
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            if (parsed.onboarded === false) {
                router.replace('/onboarding/guest');
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
            setServicesReady(true);
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
                setServicesReady(true);
            })
            .catch(() => {
                setServicesReady(true);
                // Keep default SERVICE_CATALOG if loading fails.
            });
    }, [hasApiAccess, status, setServiceCatalog, setCategoryBaseColorMap]);

    useEffect(() => {
        if (status === 'unauthenticated' || (status === 'authenticated' && !hasApiAccess)) {
            const localDb = loadLocalDbSnapshot();
            setDesigners(localDb.designers);
            setDesignersReady(true);
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
                setDesignersReady(true);
            })
            .catch(() => {
                setDesignersReady(true);
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
            setReservationsReady(true);
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
                setReservationsReady(true);
            })
            .catch(() => {
                // Keep the current in-memory data if loading fails.
                setReservationsReady(true);
            });
    }, [hasApiAccess, status, setStoreInfo, setStoreSettings, setReservationMap, setCustomerMap, setReservationHistory]);

    // 데이터(서비스·디자이너·예약)가 모두 준비될 때까지 오버레이로 가려 새로고침 플래시를 막음.
    // SSR/첫 렌더 모두 status==='loading'이라 하이드레이션 불일치가 없음.
    const isAuthFlowPage = router.pathname.startsWith('/login') || router.pathname.startsWith('/onboarding')
        || router.pathname === '/consent' || router.pathname === '/terms' || router.pathname === '/privacy';
    // 미인증 + 로컬데이터 없음 = /login 리다이렉트 대기 → 달력이 깜빡이지 않게 오버레이 유지
    // (게이트가 데이터 없으면 resolved와 무관하게 /login으로 보내므로 동일 조건으로 맞춤)
    const guestRedirectPending = status === 'unauthenticated' && !isAuthFlowPage && !hasGuestData();
    const isBooting = !isAuthFlowPage && (
        status === 'loading' || guestRedirectPending || !(servicesReady && designersReady && reservationsReady)
    );
    // 로딩바 하단 현재 상태 문구
    const bootStatusText = status === 'loading' ? '로그인 상태 확인 중...'
        : guestRedirectPending ? '로그인 페이지로 이동 중...'
        : !servicesReady ? '서비스 정보를 불러오는 중...'
        : !designersReady ? '디자이너 정보를 불러오는 중...'
        : !reservationsReady ? '예약 정보를 불러오는 중...'
        : '잠시만 기다려 주세요...';

    return (
        <>
            <GlobalStyle/>
            <LayoutComponent>
                <Component {...pageProps} />
            </LayoutComponent>
            {isBooting && (
                <LoadingOverlay backdrop="solid" zIndex={9998} text={bootStatusText} />
            )}
            <ToastContainer />
            {migrationData && (
                <GuestMigrationLayer
                    snapshot={migrationData.snapshot}
                    storeName={migrationData.storeName}
                    onFinish={() => setMigrationData(null)}
                />
            )}
            {showGuestEntry && (
                <ConfirmDialog
                    title="이전 데이터 불러오기"
                    message="게스트모드 데이터가 있습니다. 이전 데이터를 불러오시겠습니까?"
                    confirmLabel="예"
                    cancelLabel="아니오"
                    showCloseButton={false}
                    layerKey="guest-entry"
                    onConfirm={() => {
                        markGuestEntryResolved();
                        setShowGuestEntry(false);
                        // 약관 미동의 시 동의 먼저 (동의 후 원래 페이지로 복귀하며 로컬데이터 로드)
                        if (getGuestTermsVersion() !== CURRENT_TERMS_VERSION) {
                            router.replace(`/consent${router.asPath}`);
                        }
                    }}
                    onClose={() => { setShowGuestEntry(false); router.replace('/login'); }}
                />
            )}
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

    return <LoadingOverlay backdrop="dim" zIndex={9999} />;
}

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
