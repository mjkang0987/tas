import React, {
    useEffect,
    useState
} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {
    useRecoilState,
    useRecoilValue,
    useSetRecoilState
} from 'recoil';

import {
    asideState,
    portalState,
    routerState,
    targetState,
    targetStateState,
    todayState,
    viewState,
} from '../recoil/atoms';

import {useIsomorphicEffect} from '../hooks/useIsomorphicEffect';

import {
    NodeType,
    ViewType
} from '../utils/constants';

import {
    handleOnload,
    setRouter,
} from '../utils/utils';

import {
    isCalendar,
} from '../utils/utils';

import {HeaderComponent} from './common/Header';
import {AsideComponent} from './common/Aside';
import {FooterComponent} from './common/Footer';
import {Icon} from './common/Icons';
import {ButtonText} from './common/ButtonText';

export default function LayoutComponent({children}: NodeType) {
    const router = useRouter();

    const setPortal = useSetRecoilState(portalState);
    const [loading, setLoading] = useState(false);
    const [aside, setAside] = useRecoilState(asideState);
    const setToday = useSetRecoilState(todayState);
    const [routers, setRouters] = useRecoilState(routerState);
    const currValue = useRecoilValue(targetState);
    const setCurr = useSetRecoilState(targetStateState);
    const [view, setView] = useRecoilState(viewState);

    const isomorphicEffect = useIsomorphicEffect();

    const initDate: Date = new Date();

    const closeModal = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'ASIDE' || target.tagName === 'INPUT') {
            return;
        }

        if (!aside.isVisible) {
            return;
        }

        setAside({
            isVisible: false
        })
    };

    const array = router.asPath.split('/');
    const isRootPath = array.join('').length === 0;
    const isCalendarPath = isCalendar(array);

    const currDate = !isCalendarPath || isRootPath ? initDate : new Date(Number(array[2]), Number(array[3]) - 1 || 1, Number(array[4]) || 1);

    handleOnload({
        setRouters
    });

    isomorphicEffect(() => {
        setLoading(true);
        setToday(initDate);
        setCurr(currDate);

        setPortal(document.getElementById('portal'));

        setView({
            type: isRootPath || !isCalendarPath ? ViewType.Week : array[1]
        });

    }, []);

    useEffect(() => {
    }, [routers, setRouters]);

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

        setRouters({
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
    }, [currValue, setCurr]);


    return (<StyledWrapper onClick={(e) => closeModal(e)}>
            {!loading && <Icon iconType="loading"/>}
            <HeaderComponent/>
            {currValue.full !== null && <>
                <StyledMain>
                    <StyledButton type="button"
                                  isVisible={aside.isVisible}>
                        <Icon iconType="plus"/>
                        {aside.isVisible && <ButtonText a11y={false}>일정추가</ButtonText>}
                    </StyledButton>
                    <AsideComponent/>
                    {children}
                </StyledMain>
                <FooterComponent/>
            </>}
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div<{
    onClick?: (e: MouseEvent) => void;
    children?: ReactNode;
}>`
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

const StyledButton = styled.button <{ isVisible: boolean }>`
  display: inline-flex;
  position: absolute;
  top: 10px;
  left: 15px;
  align-items: center;
  justify-content: center;
  width: ${props => props.isVisible
                    ? '189px'
                    : 'auto'};
  max-width: calc(80% - 30px);
  height: 35px;
  border: 1px solid #ccc;
  background-color: ${props => props.isVisible
                               ? 'var(--white-color)'
                               : 'rgb(255 255 255 / .6)'};
  border-radius: ${props => props.isVisible
                            ? '5px'
                            : '20px'};
  box-shadow: ${props => props.isVisible
                         ? '0 0 10px 0 rgba(0, 0, 0, .1)'
                         : '0 0 10px 0 rgba(0, 0, 0, .2)'};
  font-size: var(--small-font);
  z-index: 3;
  transition: box-shadow .1s ease-in-out;

  &:hover {
    ${props => !props.isVisible && `
      box-shadow:  0 0 15px 0 rgba(0, 0, 0, .4);
    `}
  }
`;
