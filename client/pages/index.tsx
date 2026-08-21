import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';

import {computeTargetDerived} from '../utils/calendarDerived';

import {groupByDate, Reservation, ReservationHistoryEntry} from '../utils/reservations';

import {Customer, toCustomerMap} from '../utils/customers';

import {Calendar} from '../components/calendar/views/Calendar';

import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';

import {ReservationListModal} from '../components/calendar/overlays/ReservationListModal';

import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';

import {ServiceLegend} from '../components/calendar/service/ServiceLegend';

import {getPageSession, loadPageData} from '../lib/page-data';
import {SeoHead} from '../components/ui/SeoHead';
import {LandingContent} from '../components/landing/LandingContent';
import {LANDING_DESCRIPTION} from '../lib/seo';
import {GUEST_TERMS_COOKIE} from '../utils/terms';
import {getGuestTermsVersion, hasGuestData, setGuestTermsAgreed} from '../lib/local-db';
import {GuidedTour, TourStep} from '../components/ui/GuidedTour';

const TOUR_DONE_KEY = 'tas-tour-main-v1';

// inAside: 모바일에서 이 단계는 aside 드로어를 열고, 아닌 단계(헤더 대상)는 드로어를 닫는다.
const MAIN_TOUR_STEPS: TourStep[] = [
    {targetId: 'tour-add-reservation', title: '예약 추가', description: '여기서 새 예약을 등록할 수 있어요. 달력의 빈 칸을 눌러도 바로 등록돼요.', inAside: true},
    {targetId: 'tour-views', title: '보기 전환', description: '일·주·월 등 원하는 방식으로 달력을 볼 수 있어요.', inAside: true},
    {targetId: 'tour-settings', title: '설정', description: '매장·서비스·담당자·멤버를 여기서 관리해요.', inAside: true},
    {targetId: 'tour-assignee-filter', title: '담당자 필터', description: '특정 담당자의 예약만 모아서 볼 수 있어요.'},
    {targetId: 'tour-search', title: '고객 검색', description: '고객·예약을 빠르게 찾을 수 있어요.'},
    {targetId: 'tour-notify', title: '알림', description: '네이버 예약·중복 예약 알림이 여기에 표시돼요.'},
];

type HomeProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
    storageMode: 'remote' | 'local';
    /**
     * 익명 첫 방문 — 캘린더 대신 소개 화면을 서버렌더한다.
     * 크롤러가 루트에서 받는 것이 앱 셸이 아니라 색인 가능한 내용이 되게 하려는 것이다.
     */
    landing?: boolean;
};

const Home: NextPage<HomeProps> = (props) => {
    const resolveReservationsByIds = (reservationMap: ReturnType<typeof groupByDate>, reservationIds: number[]) => {
        const allReservations = Object.values(reservationMap).flat();
        return reservationIds
            .map((reservationId) => allReservations.find((item) => item.id === reservationId) ?? null)
            .filter((reservation): reservation is Reservation => reservation !== null);
    };
    const aside = useCalendarStore((s) => s.aside);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const selectedReservationIds = useCalendarStore((s) => s.selectedReservations);
    const closeReservationDetail = useCalendarStore((s) => s.closeReservationDetail);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const restoreReservation = useCalendarStore((s) => s.restoreReservation);
    const deleteReservation = useCalendarStore((s) => s.deleteReservation);
    const reservationHistory = useCalendarStore((s) => s.reservationHistory);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const reservationListFilter = useCalendarStore((s) => s.reservationListFilter);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);

    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);

    const selectedCustomer = selectedCustomerId !== null ? customerMap[selectedCustomerId] : null;
    const selectedReservations = useMemo(
        () => resolveReservationsByIds(reservationMap, selectedReservationIds),
        [reservationMap, selectedReservationIds]
    );

    useEffect(() => {
        if (props.storageMode === 'local') {
            return;
        }

        setReservationMap(groupByDate(props.reservations));
        setCustomerMap(toCustomerMap(props.customers));
        setReservationHistory(props.history);
    }, [props.storageMode, props.reservations, props.customers, props.history, setReservationMap, setCustomerMap, setReservationHistory]);

    useEffect(() => {
        if (selectedReservations.length > 0) {
            setCreateReservationInitial(null);
        }
    }, [selectedReservations, setCreateReservationInitial]);

    // 사용 안내 투어: 온보딩 후 메인 첫 진입 시 1회 자동 + Aside '사용 안내' 버튼(이벤트)으로 재실행
    const setAside = useCalendarStore((s) => s.setAside);
    const [tourOpen, setTourOpen] = useState(false);
    const asideWasVisibleRef = useRef(false);

    // 단계별 레이아웃 조정: 데스크탑은 aside(컬럼)를 펼친 채 두면 헤더도 안 가려지므로 항상 펼침.
    // 모바일은 aside가 드로어(오버레이)라, aside 대상 단계만 열고 헤더 대상 단계는 닫아 가림 방지.
    const handleTourStep = useCallback((step: TourStep) => {
        if (typeof window === 'undefined') return;
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        if (isMobile) {
            setAside((prev) => ({...prev, isVisible: !!step.inAside}));
        } else {
            setAside((prev) => (prev.isVisible ? prev : {...prev, isVisible: true}));
        }
    }, [setAside]);

    const startTour = useCallback(() => {
        asideWasVisibleRef.current = useCalendarStore.getState().aside.isVisible;
        setTourOpen(true);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const start = () => startTour();
        window.addEventListener('tas:start-tour', start);
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (!localStorage.getItem(TOUR_DONE_KEY)) {
            timer = setTimeout(start, 800);
        }
        return () => {
            window.removeEventListener('tas:start-tour', start);
            if (timer) clearTimeout(timer);
        };
    }, [startTour]);

    const closeTour = () => {
        if (typeof window !== 'undefined') localStorage.setItem(TOUR_DONE_KEY, '1');
        setTourOpen(false);
        // 투어 시작 전 aside가 접혀 있었으면 원래대로 되돌림
        if (!asideWasVisibleRef.current) {
            setAside((prev) => ({...prev, isVisible: false}));
        }
    };

    return (<>
            <SeoHead title="예약·고객 관리 시스템" />
            <StyledSection $isVisible={aside.isVisible}>
                {curr && <Calendar/>}
            </StyledSection>
            {reservationListFilter && <ReservationListModal/>}
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={customerMap}
                                   reservationMap={reservationMap}
                                   history={reservationHistory}
                                   onClose={() => closeReservationDetail(index)}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={updateReservation}
                                   onCancel={cancelReservation}
                                   onRestore={restoreReservation}
                                   onDelete={deleteReservation}/>
            ))}
            {selectedCustomer && <CustomerDetail customer={selectedCustomer}
                                                 reservationMap={reservationMap}
                                                 onReservationClick={openReservationDetailFromCustomer}
                                                 onClose={() => setSelectedCustomerId(null)}/>}
            <ServiceLegend/>
            <GuidedTour steps={MAIN_TOUR_STEPS} open={tourOpen} onClose={closeTour} onStepChange={handleTourStep}/>
        </>
    );
};

// 동의 쿠키만 지워지고 게스트 데이터는 남은 경우를 한 번만 되돌리기 위한 표시.
// 쿠키가 붙지 않는 환경에서 새로고침이 무한 반복되지 않게 세션에 남긴다.
const GUEST_COOKIE_REPAIRED_KEY = 'takeaseat.guest-cookie-repaired';

/**
 * 익명 방문자용 소개 화면.
 *
 * 서버는 localStorage 를 못 보므로 동의 쿠키로만 게스트를 알아본다(`getServerSideProps`).
 * 쿠키만 지워지고 게스트 데이터가 남으면 여기로 잘못 오는데, 그대로 두면 `_app` 의
 * "이전 데이터 불러오기"를 눌러도 캘린더로 못 간다 — 앱 셸이 애초에 서버에서 오지 않았다.
 * 그래서 쿠키를 되살리고 서버 판정을 한 번 다시 받는다.
 */
const Landing: NextPage = () => {
    useEffect(() => {
        const version = getGuestTermsVersion();
        if (!version || !hasGuestData()) return;
        if (sessionStorage.getItem(GUEST_COOKIE_REPAIRED_KEY)) return;

        sessionStorage.setItem(GUEST_COOKIE_REPAIRED_KEY, '1');
        setGuestTermsAgreed(version);
        window.location.replace('/');
    }, []);

    return (
        <>
            <SeoHead title="예약·고객 관리" description={LANDING_DESCRIPTION} path="/"/>
            <LandingContent/>
        </>
    );
};

/**
 * 루트는 두 화면을 겸한다 — 로그인·게스트는 캘린더, 익명 첫 방문은 소개.
 * `Home` 안에서 early return 하면 훅 순서가 깨지므로 컴포넌트 자체를 갈라 놓는다.
 */
const HomePage: NextPage<HomeProps> = (props) => (props.landing ? <Landing/> : <Home {...props}/>);

export default HomePage;

const StyledSection = styled.section <{ $isVisible: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-left: solid var(--light-gray-color) ${props => props.$isVisible ? `1px` : 0};
`;

export const getServerSideProps: GetServerSideProps<HomeProps> = async (ctx) => {
    const session = await getPageSession(ctx);
    if (!session) {
        // 게스트(로컬 데이터로 쓰는 중)인지는 서버가 localStorage 를 못 보므로 동의 쿠키로만 안다.
        // 쿠키는 /consent 에서 데이터가 생기기 전에 심긴다(features/local-db/storage.ts).
        const isGuest = !!ctx.req.cookies[GUEST_TERMS_COOKIE];
        if (!isGuest) {
            // 공유 캐시(s-maxage)는 일부러 열지 않는다. 모든 트래픽이 Cloudflare `tas-proxy` Worker 를
            // 지나는데, 거기에 HTML 을 캐시하는 규칙이 있으면 익명 소개 화면이 `/` 에 캐시돼 로그인
            // 사용자에게까지 돌아간다(Cloudflare 는 `Vary: Cookie` 를 캐시 키에 넣지 않는다).
            // 15KB 페이지를 캐시해서 얻는 것보다 오너 화면이 소개 페이지로 바뀌는 쪽이 훨씬 비싸다.
            return {
                props: {
                    reservations: [],
                    customers: [],
                    history: [],
                    storageMode: 'local',
                    landing: true,
                }
            };
        }

        return {
            props: {
                reservations: [],
                customers: [],
                history: [],
                storageMode: 'local',
            }
        };
    }

    const data = await loadPageData(session.storeId);

    return {
        props: {
            reservations: data.reservations,
            customers: data.customers,
            history: data.history,
            storageMode: 'remote',
        }
    };
};
