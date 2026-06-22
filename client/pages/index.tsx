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
import {GuidedTour, TourStep} from '../components/ui/GuidedTour';

const TOUR_DONE_KEY = 'tas-tour-main-v1';

// inAside: 모바일에서 이 단계는 aside 드로어를 열고, 아닌 단계(헤더 대상)는 드로어를 닫는다.
const MAIN_TOUR_STEPS: TourStep[] = [
    {targetId: 'tour-add-reservation', title: '예약 추가', description: '여기서 새 예약을 등록할 수 있어요. 달력의 빈 칸을 눌러도 바로 등록돼요.', inAside: true},
    {targetId: 'tour-views', title: '보기 전환', description: '일·주·월 등 원하는 방식으로 달력을 볼 수 있어요.', inAside: true},
    {targetId: 'tour-settings', title: '설정', description: '매장·서비스·디자이너·멤버를 여기서 관리해요.', inAside: true},
    {targetId: 'tour-designer-filter', title: '디자이너 필터', description: '특정 디자이너의 예약만 모아서 볼 수 있어요.'},
    {targetId: 'tour-search', title: '고객 검색', description: '고객·예약을 빠르게 찾을 수 있어요.'},
    {targetId: 'tour-notify', title: '알림', description: '네이버 예약·중복 예약 알림이 여기에 표시돼요.'},
];

type HomeProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
    storageMode: 'remote' | 'local';
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
            <SeoHead title="예약, 네이버 예약, 고객 관리 시스템" />
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

export default Home;

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
