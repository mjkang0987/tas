'use client';

import React, {useEffect} from 'react';

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



const getData = async () => {
    const res = await fetch('http://localhost:3000/api/reservations');
    const data = await res.json() || {};
};

const Home = () => {
    const aside = useRecoilValue(asideState);
    const currValue = useRecoilValue(targetState);

    const setReservations = useSetRecoilState(reservationsState);

    // (async () => {
    //     console.log(getData());
    // })();

    useEffect(() => {
    //     if (data.reservations) {
    //         setReservations([...data.reservations]);
    //     }
    }, []);

    return (
        <div>dd</div>
        // <StyledSection isVisible={aside.isVisible}>
        //     {currValue.full && <CalendarComponent/>}
        // </StyledSection>
    );
};

export default Home;

const StyledSection = styled.section <Props>`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    border-left: solid var(--light-gray-color) ${props => props.isVisible
                                                          ? `1px`
                                                          : 0};
`;

// export const getServerSideProps = (async () => {
//     const res = await fetch('http://localhost:3000/api/hello');
//     const data = await res.json() || {};
//
//     return {
//         props: {
//             data,
//         }
//     };
// });
