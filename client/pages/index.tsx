import {useEffect, useMemo} from 'react';

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

    return (<>
            <SeoHead title="Take a seat" />
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
                                   onRestore={restoreReservation}/>
            ))}
            {selectedCustomer && <CustomerDetail customer={selectedCustomer}
                                                 reservationMap={reservationMap}
                                                 onReservationClick={openReservationDetailFromCustomer}
                                                 onClose={() => setSelectedCustomerId(null)}/>}
            <ServiceLegend/>
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
