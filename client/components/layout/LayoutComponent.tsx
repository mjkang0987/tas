import React, {
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import {useRouter} from 'next/router';

import {useSession} from 'next-auth/react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {useIsomorphicEffect} from '../../hooks/useIsomorphicEffect';

import {useRouteChangeSync} from '../../hooks/useRouteChangeSync';

import {NodeType} from '../../utils/types';
import {isCalendar, setRouter} from '../../utils/router';
import {ViewType} from '../../utils/constants';

import {Header} from './Header';
import {Aside} from './Aside';
import {Icon} from '../ui/Icons';
import {ReservationCreate} from '../calendar/overlays/ReservationCreate';
import {AdBanner} from '../ad/AdBanner';

export default function LayoutComponent({children}: NodeType) {
    const router = useRouter();
    const {status} = useSession();

    const isLoginPage = router.pathname === '/login';
    const isAboutPage = router.pathname === '/about';
    const isOnboardingPage = router.pathname.startsWith('/onboarding');
    const isPublicPolicyPage = router.pathname === '/terms' || router.pathname === '/privacy';
    // 로그인/소개/온보딩/동의는 항상 풀페이지. 약관·개인정보는 미인증(로그인 전)일 때만
    // 앱 셸(Aside·Header) 없이 풀페이지로, 로그인 사용자에겐 셸 안에서 보여준다.
    // (DPA 는 운영자 전용 — 미인증 접근은 proxy.ts 에서 /login 으로 리다이렉트)
    const isBarePage = isLoginPage || isAboutPage || isOnboardingPage
        || router.pathname === '/consent'
        || (isPublicPolicyPage && status !== 'authenticated');

    const [loading, setLoading] = useState(false);
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const setToday = useCalendarStore((s) => s.setToday);
    const setRouterSlice = useCalendarStore((s) => s.setRouterSlice);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const view = useCalendarStore((s) => s.view);
    const setView = useCalendarStore((s) => s.setView);
    const createReservationInitial = useCalendarStore((s) => s.createReservationInitial);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const selectedReservations = useCalendarStore((s) => s.selectedReservations);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const addReservation = useCalendarStore((s) => s.addReservation);

    const isomorphicEffect = useIsomorphicEffect();
    const [initDate] = useState(() => new Date());
    const [initializedPath, setInitializedPath] = useState<string | null>(null);
    const routerRef = useRef(router);
    routerRef.current = router;

    const array = useMemo(() => router.asPath.split('/'), [router.asPath]);
    const isRootPath = useMemo(() => array.join('').length === 0, [array]);
    const isCalendarPath = useMemo(() => isCalendar(array), [array]);
    const getMonthIndex = (rawMonth?: string) => {
        const parsedMonth = Number(rawMonth);
        return Number.isFinite(parsedMonth) && parsedMonth > 0 ? parsedMonth - 1 : 0;
    };
    const currDate = useMemo(
        () => !isCalendarPath || isRootPath
            ? initDate
            : new Date(Number(array[2]), getMonthIndex(array[3]), Number(array[4]) || 1),
        [array, initDate, isCalendarPath, isRootPath]
    );

    useEffect(() => {
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        if (isMobile) {
            setAside({isVisible: false});
            return;
        }
        const stored = localStorage.getItem('aside-visible');
        if (stored !== null) {
            setAside({isVisible: stored !== 'false'});
        }
    }, [setAside]);

    useRouteChangeSync({
        setRouterSlice
    });

    isomorphicEffect(() => {
        if (initializedPath === router.asPath) {
            return;
        }

        setInitializedPath(router.asPath);
        setLoading(true);
        setToday(initDate);
        setCurr(currDate);

        setView({
            type: isRootPath || !isCalendarPath ? ViewType.Week : array[1]
        });
    }, [array, currDate, initDate, initializedPath, isCalendarPath, isRootPath, router.asPath, setCurr, setToday, setView]);

    useEffect(() => {
        const handlePopState = () => {
            const segments = window.location.pathname.split('/');
            const isCalPath = isCalendar(segments);
            const isRoot = segments.join('').length === 0;

            if (!isCalPath || isRoot) return;

            const viewType = segments[1];
            const year = Number(segments[2]);
            const month = getMonthIndex(segments[3]);
            const date = Number(segments[4]) || 1;

            setView({type: viewType});
            setCurr(new Date(year, month, date));
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [setCurr, setView]);

    useEffect(() => {
        if (currValue.full === null) {
            return;
        }

        const currentRouter = routerRef.current;
        const segments = currentRouter.asPath.split('?')[0].split('/');
        const isCalPath = isCalendar(segments) || segments.join('').length === 0;

        if (!isCalPath) {
            return;
        }

        const isRoot = segments.join('').length === 0;

        let changeRouter: Array<string | number> = [''];
        const routeDate = new Date(currValue.fullYear, currValue.month, currValue.date);

        if (view.type === ViewType.Week) {
            routeDate.setDate(currValue.date - currValue.day);
        }

        if (view.type === ViewType.Year) {
            changeRouter = [...changeRouter, ViewType.Year, currValue.fullYear];
        } else if (view.type === ViewType.Month) {
            routeDate.setFullYear(currValue.fullYear, currValue.month, 1);
            changeRouter = [...changeRouter, ViewType.Month, currValue.fullYear, currValue.month + 1];
        } else {
            changeRouter = [...changeRouter, view.type, routeDate.getFullYear(), routeDate.getMonth() + 1, routeDate.getDate()];
        }

        setRouterSlice({
            arrayRouter: changeRouter,
            isRootPath: isRoot,
            isCalendarPath: !isRoot
        });

        setRouter({
            type : view.type,
            year : routeDate.getFullYear(),
            month: routeDate.getMonth() + 1,
            date : routeDate.getDate(),
            router: currentRouter
        });
    }, [currValue, setRouterSlice, view]);

    if (isBarePage) {
        return <>{children}</>;
    }

    return (<StyledWrapper>
            <Aside/>
            <StyledContent $asideOpen={aside.isVisible}>
                {currValue.full === null && <Icon iconType="loading"/>}
                <Header/>
                {currValue.full !== null && <>
                    <StyledMain>
                        {children}
                    </StyledMain>
                    <StyledFooterAd>
                        <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_FOOTER_SLOT ?? ''} adFormat="horizontal" />
                    </StyledFooterAd>
                    {createReservationInitial && selectedReservations.length === 0 && (
                        <ReservationCreate initial={createReservationInitial}
                                           customerMap={customerMap}
                                           onClose={() => setCreateReservationInitial(null)}
                                           onSave={addReservation}/>
                    )}
                </>}
            </StyledContent>
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div`
    display: flex;
    flex-direction: row;
    height: 100%;
    overflow: hidden;
    padding: 8px;
    box-sizing: border-box;
    background-color: var(--aside-bg);
`;

const StyledContent = styled.div<{ $asideOpen: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--white-color);
    border-radius: 8px;
    transition: border-radius 0.25s ease;
`;

const StyledMain = styled.main`
    flex: 1;
    overflow: auto;
    overscroll-behavior: auto;
    display: flex;
    height: 100%;
    background:
        radial-gradient(circle at top left, rgba(45, 127, 249, 0.12), transparent 32%),
        linear-gradient(180deg, #f8fbff 0%, #ffffff 52%);
`;

const StyledFooterAd = styled.div`
    flex-shrink: 0;
    padding: 6px 12px;
    border-top: 1px solid var(--light-gray-color);
    background-color: var(--white-color);
`;
