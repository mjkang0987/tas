import React from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {
    A11Y_DIRECTION,
    ASIDE,
    ViewType
} from '../../utils/constants';

import {setRouter} from '../../utils/router';

import {ButtonText} from '../ui/ButtonText';
import {ButtonSquare} from '../ui/Buttons';

export const CalendarDirection = () => {
    const router = useRouter();

    const today = useCalendarStore((s) => s.today);
    const view = useCalendarStore((s) => s.view);
    const {type} = view;
    const currValue = useCalendarStore((s) => s.target);
    const {fullYear, month, date, day} = currValue;
    const setUpdateCurr = useCalendarStore((s) => s.setTargetFromDate);

    const handlerView = {
        yearView(isPrev: boolean) {
            setRouter({
                type,
                year : +fullYear - (isPrev ? 1 : -1),
                month: +month + 1,
                date : +date,
                router
            });

            return setUpdateCurr(`${+fullYear - (isPrev
                                                 ? 1
                                                 : -1)}, ${+month + 1}, ${+date}`);
        },
        monthView(isPrev: boolean) {
            const temporary = new Date(`${+fullYear}, ${+month + 1}, 1`);
            const currentDate = new Date(temporary.setMonth(+month - (isPrev
                                                                      ? 1
                                                                      : -1)));

            setRouter({
                type,
                year : currentDate.getFullYear(),
                month: currentDate.getMonth() + 1,
                date : currentDate.getDate(),
                router
            });

            return setUpdateCurr(currentDate);
        },
        dayView(isPrev: boolean) {
            const move = Number(ASIDE[type.toUpperCase()].move);
            const temporary = new Date(`${+fullYear}, ${+month + 1}, ${+date}`);
            const currentDate = new Date(temporary.setDate(+date - (isPrev ? move : -move) - (type === 'week' ? +day : 0)));

            setRouter({
                type,
                year : currentDate.getFullYear(),
                month: currentDate.getMonth() + 1,
                date : currentDate.getDate(),
                router
            });

            return setUpdateCurr(currentDate);
        }
    };

    const controller = ({direction}: { direction: string }) => {
        if (!direction) {
            return;
        }

        const isPrev = direction === 'prev';
        const isDate = ASIDE.hasOwnProperty(type.toUpperCase());

        if (type === ViewType.Year) {
            return handlerView.yearView(isPrev);
        }

        if (type === ViewType.Month) {
            return handlerView.monthView(isPrev);
        }

        if (isDate) {
            return handlerView.dayView(isPrev);
        }
    };

    return (<StyledButtonWrap>
            {today && <ButtonSquare onClick={() => {
                setUpdateCurr(today);
                setRouter({
                    type,
                    year : today.getFullYear(),
                    month: today.getMonth() + 1,
                    date : today.getDate(),
                    router
                });
            }}>
                <ButtonText a11y={false}>오늘</ButtonText>
            </ButtonSquare>}
            <StyledDirectionButton type="button" onClick={() => controller({direction: 'prev'})}>
                <DirectionIcon direction="left"/>
                {type && <ButtonText a11y={true}>이전{A11Y_DIRECTION[type]}</ButtonText>}
            </StyledDirectionButton>
            <StyledDirectionButton type="button" onClick={() => controller({direction: 'next'})}>
                <DirectionIcon direction="right"/>
                {type && <ButtonText a11y={true}>다음{A11Y_DIRECTION[type]}</ButtonText>}
            </StyledDirectionButton>
        </StyledButtonWrap>
    );
};

const DirectionIcon = ({direction}: { direction: 'left' | 'right' }) => (
    <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <rect x="1" y="1" width="30" height="30" rx="8" stroke="#D1D5DB" fill="white"/>
        <path
            d={direction === 'left' ? 'M18.5 10.5L13 16L18.5 21.5' : 'M13.5 10.5L19 16L13.5 21.5'}
            stroke="#111827"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const StyledButtonWrap = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StyledDirectionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 0;
  cursor: pointer;
`;
