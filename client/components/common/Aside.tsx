import React from 'react';

import Link from 'next/link';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {
    ASIDE as asides,
    ViewType
} from '../../utils/constants';

import {InputWrap} from './Input';

interface Props {
    $isVisible: boolean;
    $isTransitionEnd: boolean;
}

export const Aside = () => {
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const setView = useCalendarStore((s) => s.setView);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);

    const setChangeView = ({viewType}: { viewType: string }) => {
        setAside({
            ...aside,
            isVisible: !aside.isVisible
        });

        setView({type: viewType.toLowerCase()});

        if (viewType === ViewType.Week) {
            setCurr(new Date(Number(currValue.fullYear), Number(currValue.month), Number(currValue.date) - Number(currValue.day)));
        }
    };

    const setAsPath = (path: string) => {
        let result: (string | number)[] = [path, currValue.fullYear];

        if (path !== ViewType.Year) {
            result.push(Number(currValue.month + 1));
        }

        if (path === ViewType.Day) {
            result.push(Number(currValue.date));
        }

        return result;
    };

    return (<StyledAside $isVisible={aside.isVisible}
                         $isTransitionEnd={aside.isTransitionEnd}
                         className={!aside.isTransitionEnd
                                    ? 'animate'
                                    : ''}
                         onAnimationEnd={() => {
                             setAside({
                                 ...aside,
                                 isTransitionEnd: true
                             });
                         }}>
            {currValue && Object.keys(asides).map((a) =>
                <StyledNavLink href={`/${setAsPath(a.toLowerCase()).join('/')}`}
                               key={asides[a].id}
                               onClick={() => setChangeView({viewType: a})}>
                    {asides[a].title}
                </StyledNavLink>
            )}
            <StyledDivider/>
            <StyledNavLink href="/settings"
                           onClick={() => setAside({...aside, isVisible: false})}>
                설정
            </StyledNavLink>
        </StyledAside>
    );
};

const StyledAside = styled.aside <Props>`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    ${props => (!props.$isVisible && props.$isTransitionEnd) && 'display: none'};
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 120px;
    max-width: 80%;
    padding: 42px 15px 0;
    border-right: solid 1px var(--light-gray-color);
    box-sizing: border-box;
    background-color: #fff;
    box-shadow: 10px 0 10px 0 rgba(0 0 0 / .1);
    z-index: 100;

    &.animate {
        animation-name: asideHide;
        animation-duration: .4s;
        animation-timing-function: ease-in-out;
        animation-direction: ${props => props.$isVisible
                ? 'reverse'
                : 'normal'};
        animation-fill-mode: forward;
    }
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid var(--light-gray-color);
  margin: 4px 0;
`;

const StyledNavLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 25px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  background-color: var(--white-color);
  border-radius: 5px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, .1);
  font-size: var(--small-font);
  text-decoration: none;
  color: inherit;
`;
