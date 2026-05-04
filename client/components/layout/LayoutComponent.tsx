import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {useIsomorphicEffect} from '../../hooks/useIsomorphicEffect';

import {useRouteChangeSync} from '../../hooks/useRouteChangeSync';

import {NodeType} from '../../utils/types';
import {isCalendar, setRouter} from '../../utils/router';
import {ViewType} from '../../utils/constants';

import {Header} from './Header';
import {Aside} from './Aside';
import {Footer} from './Footer';
import {Icon} from '../ui/Icons';
import {ReservationCreate} from '../calendar/overlays/ReservationCreate';

export default function LayoutComponent({children}: NodeType) {
    const router = useRouter();

    const isLoginPage = router.pathname === '/login';

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

    const array = useMemo(() => router.asPath.split('/'), [router.asPath]);
    const isRootPath = useMemo(() => array.join('').length === 0, [array]);
    const isCalendarPath = useMemo(() => isCalendar(array), [array]);
    const currDate = useMemo(
        () => !isCalendarPath || isRootPath
            ? initDate
            : new Date(Number(array[2]), Number(array[3]) - 1 || 1, Number(array[4]) || 1),
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
            const month = (Number(segments[3]) - 1) || 0;
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

        if (!isCalendarPath && !isRootPath) {
            return;
        }

        let changeRouter: Array<string | number> = [''];

        if (view.type === ViewType.Year) {
            changeRouter = [...changeRouter, ViewType.Month, currValue.month + 1];
        }

        if (view.type !== ViewType.Year) {
            changeRouter = [...changeRouter, ViewType.Day, currValue.fullYear, currValue.month + 1, currValue.date]
        }

        setRouterSlice({
            arrayRouter: changeRouter,
            isRootPath,
            isCalendarPath
        });

        setRouter({
            type : view.type,
            year : currValue.fullYear,
            month: currValue.month + 1,
            date : currValue.date,
            router
        });
    }, [currValue, isCalendarPath, isRootPath, router, setRouterSlice, view]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (<StyledWrapper>
            <Aside/>
            <StyledContent $asideOpen={aside.isVisible}>
                {!loading && <Icon iconType="loading"/>}
                <Header/>
                {currValue.full !== null && <>
                    <StyledMain>
                        {children}
                    </StyledMain>
                    {createReservationInitial && selectedReservations.length === 0 && (
                        <ReservationCreate initial={createReservationInitial}
                                           customerMap={customerMap}
                                           onClose={() => setCreateReservationInitial(null)}
                                           onSave={addReservation}/>
                    )}
                    <Footer/>
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
    border-radius: 12px;
    transition: border-radius 0.25s ease;
`;

const StyledMain = styled.main`
    flex: 1;
    overflow: hidden;
    display: flex;
    height: 100%;
`;

