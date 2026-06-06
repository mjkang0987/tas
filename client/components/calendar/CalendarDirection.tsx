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
import {DirectionIcon} from '../ui/DirectionIcon';

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

            return setUpdateCurr(new Date(+fullYear - (isPrev ? 1 : -1), +month, +date));
        },
        monthView(isPrev: boolean) {
            const temporary = new Date(+fullYear, +month, 1);
            const currentDate = new Date(temporary.setMonth(+month - (isPrev ? 1 : -1)));

            setRouter({
                type,
                year : currentDate.getFullYear(),
                month: currentDate.getMonth() + 1,
                date : currentDate.getDate(),
                router
            });

            return setUpdateCurr(currentDate);
        },
        weekView(isPrev: boolean) {
            const baseDate = new Date(+fullYear, +month, +date);
            const weekStartDate = new Date(baseDate);
            weekStartDate.setDate(baseDate.getDate() - +day);

            const currentDate = new Date(weekStartDate);
            currentDate.setDate(weekStartDate.getDate() + (isPrev ? -7 : 7));

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
            const temporary = new Date(+fullYear, +month, +date);
            const currentDate = new Date(temporary.setDate(+date - (isPrev ? move : -move)));

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

        if (type === ViewType.Week) {
            return handlerView.weekView(isPrev);
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
`;
