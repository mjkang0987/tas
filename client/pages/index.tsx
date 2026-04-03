import {useEffect, useMemo} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import Head from 'next/head';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';

import {computeTargetDerived} from '../utils/calendarDerived';

import {groupByDate, Reservation, ReservationHistoryEntry} from '../utils/reservations';

import {Customer, toCustomerMap} from '../utils/customers';

import {Calendar} from '../components/calendar/Calendar';

import {ReservationDetail} from '../components/calendar/ReservationDetail';

import {ReservationListModal} from '../components/calendar/ReservationListModal';

import {CustomerDetail} from '../components/calendar/CustomerDetail';

import {ServiceLegend} from '../components/calendar/ServiceLegend';

import customersData from './api/customers.json';

type HomeProps = {
    reservations: Reservation[];
    customers: Customer[];
    history: ReservationHistoryEntry[];
};

const Home: NextPage<HomeProps> = (props) => {
    const aside = useCalendarStore((s) => s.aside);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const selectedReservation = useCalendarStore((s) => s.selectedReservation);
    const setSelectedReservation = useCalendarStore((s) => s.setSelectedReservation);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const reservationHistory = useCalendarStore((s) => s.reservationHistory);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const reservationListFilter = useCalendarStore((s) => s.reservationListFilter);

    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);

    const selectedCustomer = selectedCustomerId !== null ? customerMap[selectedCustomerId] : null;

    useEffect(() => {
        setReservationMap(groupByDate(props.reservations));
        setCustomerMap(toCustomerMap(props.customers));
        setReservationHistory(props.history);
    }, [props.reservations, props.customers, props.history, setReservationMap, setCustomerMap, setReservationHistory]);

    return (<>
            <Head>
                <title>RESERVATION</title>
            </Head>
            <StyledSection $isVisible={aside.isVisible}>
                {curr && <Calendar/>}
            </StyledSection>
            {reservationListFilter && <ReservationListModal/>}
            {selectedReservation && <ReservationDetail reservation={selectedReservation}
                                                       customerMap={customerMap}
                                                       reservationMap={reservationMap}
                                                       history={reservationHistory}
                                                       onClose={() => setSelectedReservation(null)}
                                                       onCustomerClick={(customerId) => setSelectedCustomerId(customerId)}
                                                       onUpdate={updateReservation}
                                                       onCancel={cancelReservation}/>}
            {selectedCustomer && <CustomerDetail customer={selectedCustomer}
                                                 reservationMap={reservationMap}
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

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.join(process.cwd(), 'pages/api/reservations.json'), 'utf-8');
    const data = JSON.parse(raw);

    return {
        props: {
            reservations: data.reservations,
            customers: customersData.customers,
            history: data.history ?? []
        }
    };
};
