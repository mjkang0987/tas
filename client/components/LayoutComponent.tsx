import React, {
    useEffect,
    useState
} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';

import {useIsomorphicEffect} from '../hooks/useIsomorphicEffect';

import {useRouteChangeSync} from '../hooks/useRouteChangeSync';

import {NodeType} from '../utils/types';
import {isCalendar, setRouter} from '../utils/router';
import {ViewType} from '../utils/constants';

import {Header} from './common/Header';
import {Aside} from './common/Aside';
import {Footer} from './common/Footer';
import {Icon} from './common/Icons';
import {ButtonText} from './common/ButtonText';

export default function LayoutComponent({children}: NodeType) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const setToday = useCalendarStore((s) => s.setToday);
    const setRouterSlice = useCalendarStore((s) => s.setRouterSlice);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const view = useCalendarStore((s) => s.view);
    const setView = useCalendarStore((s) => s.setView);

    const isomorphicEffect = useIsomorphicEffect();

    const initDate: Date = new Date();

    const closeModal = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'ASIDE' || target.tagName === 'INPUT') {
            return;
        }

        if (!aside.isVisible) {
            return;
        }

        setAside({
            isTransitionEnd: false,
            isVisible: false
        })
    };

    const array = router.asPath.split('/');
    const isRootPath = array.join('').length === 0;
    const isCalendarPath = isCalendar(array);

    const currDate = !isCalendarPath || isRootPath ? initDate : new Date(Number(array[2]), Number(array[3]) - 1 || 1, Number(array[4]) || 1);

    useRouteChangeSync({
        setRouterSlice
    });

    isomorphicEffect(() => {
        setLoading(true);
        setToday(initDate);
        setCurr(currDate);

        setView({
            type: isRootPath || !isCalendarPath ? ViewType.Week : array[1]
        });
    }, []);

    useEffect(() => {
        if (currValue.full === null) {
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
    }, [currValue]);


    return (<StyledWrapper onClick={(e: React.MouseEvent) => closeModal(e)}>
            {!loading && <Icon iconType="loading"/>}
            <Header/>
            {currValue.full !== null && <>
                <StyledMain>
                    <StyledButton type="button"
                                  $isVisible={aside.isVisible}>
                        <Icon iconType="plus"/>
                        {aside.isVisible && <ButtonText a11y={false}>일정추가</ButtonText>}
                    </StyledButton>
                    <Aside/>
                    {children}
                </StyledMain>
                <Footer/>
            </>}
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div<{ onClick?: Function }>`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const StyledMain = styled.main`
  flex: 1;
  overflow: hidden;
  display: flex;
  height: 100%;
  position: relative;
`;
const StyledButton = styled.button <{ $isVisible: boolean }>`
  display: inline-flex;
  position: absolute;
  top: 10px;
  left: 15px;
  align-items: center;
  justify-content: center;
  width: ${props => props.$isVisible
                    ? '89px'
                    : 'auto'};
  max-width: calc(80% - 30px);
  height: 25px;
  border: 1px solid #ccc;
  background-color: ${props => props.$isVisible
                               ? 'var(--white-color)'
                               : 'rgb(255 255 255 / .6)'};
  border-radius: ${props => props.$isVisible
                            ? '5px'
                            : '20px'};
  box-shadow: ${props => props.$isVisible
                         ? '0 0 10px 0 rgba(0, 0, 0, .1)'
                         : '0 0 10px 0 rgba(0, 0, 0, .2)'};
  font-size: var(--small-font);
  z-index: 3;
  transition: box-shadow .1s ease-in-out;

  &:hover {
    ${props => !props.$isVisible && `
      box-shadow:  0 0 15px 0 rgba(0, 0, 0, .4);
    `}
  }
`;
