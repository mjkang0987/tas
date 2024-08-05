import React, {useEffect} from 'react';

import type {NextPage} from 'next';

import Head from 'next/head';

import {
    useRecoilValue,
    useSetRecoilState,
} from 'recoil';

import styled from 'styled-components';

import {
    asideState,
    reservationsState,
    targetState
} from '../recoil/atoms';

import {CalendarComponent} from '../components/calendar/CalendarWrap';

interface Props {
    isVisible: boolean;
    children: any;
}

const Home: NextPage = ({
    data
}: any) => {
    const aside = useRecoilValue(asideState);
    const currValue = useRecoilValue(targetState);

    const setReservations = useSetRecoilState(reservationsState);

    useEffect(() => {
        if (data.reservations) {
            setReservations([...data.reservations]);
        }
    }, []);

    return (<>
            <Head>
                <title>RESERVATION</title>
            </Head>
            <StyledSection isVisible={aside.isVisible}>
                {currValue.full && <CalendarComponent/>}
            </StyledSection>
        </>
    );
};

export default Home;

const StyledSection = styled.section <Props>`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-left: solid var(--light-gray-color) ${props => props.isVisible ? `1px` : 0};
`;

export const getServerSideProps = (async () => {
    const res = await fetch('http://localhost:3000/api/hello');
    const data = await res.json() || {};

    return {
        props: {
            data,
        }
    };
});
