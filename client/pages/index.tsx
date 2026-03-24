import {useEffect, useMemo} from 'react';

import type {GetStaticProps, NextPage} from 'next';

import Head from 'next/head';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';

import {computeTargetDerived} from '../utils/calendarDerived';

import {groupByDate, Reservation} from '../utils/reservations';

import {Calendar} from '../components/calendar/Calendar';

import reservationsData from './api/reservations.json';

type HomeProps = {
    reservations: Reservation[];
};

const Home: NextPage<HomeProps> = (props) => {
    const aside = useCalendarStore((s) => s.aside);
    const target = useCalendarStore((s) => s.target);
    const curr = useMemo(() => computeTargetDerived(target), [target]);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);

    useEffect(() => {
        setReservationMap(groupByDate(props.reservations));
    }, [props.reservations, setReservationMap]);

    return (<>
            <Head>
                <title>RESERVATION</title>
            </Head>
            <StyledSection $isVisible={aside.isVisible}>
                {curr && <Calendar/>}
            </StyledSection>
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

export const getStaticProps: GetStaticProps<HomeProps> = async () => ({
    props: {
        reservations: reservationsData.reservations
    }
});