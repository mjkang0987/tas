import React from 'react';

import Link from 'next/link';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {
    ASIDE as asides,
    ViewType
} from '../../utils/constants';

import {InputWrap} from '../ui/Input';

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
    gap: 2px;
    ${props => (!props.$isVisible && props.$isTransitionEnd) && 'display: none'};
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 160px;
    max-width: 80%;
    padding: 52px 8px 12px;
    border-right: solid 1px var(--light-gray-color);
    box-sizing: border-box;
    background-color: var(--white-color);
    box-shadow: var(--shadow-md);
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
  margin: 6px 4px;
`;

const StyledNavLink = styled(Link)`
  display: flex;
  align-items: center;
  width: 100%;
  height: 36px;
  padding: 0 12px;
  box-sizing: border-box;
  background-color: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--small-font);
  font-weight: 500;
  text-decoration: none;
  color: var(--dark-gray-color);
  transition: background-color 0.1s;

  &:hover {
    background-color: var(--gray-color2);
    color: var(--black-color);
  }
`;
