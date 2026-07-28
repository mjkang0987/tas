import React, {useMemo, useRef} from 'react';

import type {ChangeEvent, MouseEvent} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {computeTargetDerived} from '../../utils/calendarDerived';

import {setRouter} from '../../utils/router';

import {pad} from '../../utils/timeRound';

import {
    ViewType
} from '../../utils/constants';

export const CalendarHeading = () => {
    const router = useRouter();
    const view = useCalendarStore((s) => s.view);
    const {type} = view;
    const currValue = useCalendarStore((s) => s.target);
    const {full, fullYear, month, date, day} = currValue;
    const curr = useMemo(() => computeTargetDerived(currValue), [currValue]);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const inputRef = useRef<HTMLInputElement>(null);

    // 현재 보는 날짜를 피커 초기값으로(달을 그 위치에서 열기)
    const pickerValue = full ? `${fullYear}-${pad(month + 1)}-${pad(date)}` : '';

    // 데스크톱 브라우저는 투명 input을 눌러도 피커가 안 열리는 경우가 있어 명시적으로 띄운다.
    const handlePickerOpen = (event: MouseEvent<HTMLInputElement>) => {
        try {
            event.currentTarget.showPicker();
        } catch {
            // showPicker 미지원·사용자 제스처 밖 호출 — 기본 클릭 동작에 맡긴다.
        }
    };

    const handlePickerChange = (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value; // YYYY-MM-DD
        if (!raw) {
            return;
        }

        const [year, pickedMonth, pickedDate] = raw.split('-').map(Number);
        if (!year || !pickedMonth || !pickedDate) {
            return;
        }

        setCurr(new Date(year, pickedMonth - 1, pickedDate));
        setRouter({
            type: view.type,
            year,
            month: pickedMonth,
            date: pickedDate,
            router,
        });
    };

    const setMonth = () => {
        if (type === ViewType.Day || type === ViewType.Month) {
            return +month + 1;
        }

        if (curr) {
            const baseDate = new Date(+fullYear, +month, +date);
            const startDate = new Date(baseDate);
            const endDate = new Date(baseDate);

            if (type === ViewType.Week) {
                startDate.setDate(baseDate.getDate() - +day);
                endDate.setDate(startDate.getDate() + 6);
            } else {
                endDate.setDate(baseDate.getDate() + 2);
            }

            if (startDate.getMonth() !== endDate.getMonth() || startDate.getFullYear() !== endDate.getFullYear()) {
                const startLabel = startDate.getFullYear() !== endDate.getFullYear()
                    ? `${startDate.getFullYear()} / ${startDate.getMonth() + 1}`
                    : startDate.getMonth() + 1;
                const endLabel = endDate.getFullYear() !== startDate.getFullYear()
                    ? `${endDate.getFullYear()} / ${endDate.getMonth() + 1}`
                    : endDate.getMonth() + 1;

                return `${startLabel} - ${endLabel}`;
            }

            return `${startDate.getMonth() + 1}`;
        }

        return `${+month + 1}`;
    }

    return (<StyledHeading>
            {full && <StyledDateWrap>
                <StyledDateElement>{+fullYear}</StyledDateElement>
                {type !== ViewType.Year && <StyledDateElement>
                    {setMonth()}
                </StyledDateElement>}
                {type === ViewType.Day && <StyledDateElement>{+date}</StyledDateElement>}
                <StyledChevron viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9.5L12 15.5L18 9.5" />
                </StyledChevron>
                {/* 연/월 텍스트 위를 덮는 투명 네이티브 date input — 탭하면 OS 달력이 뜬다.
                    프론트 표준(네이티브 우선)에 맞춰 커스텀 달력 대신 <input type="date">를 쓴다. */}
                <StyledDateInput ref={inputRef}
                                 type="date"
                                 value={pickerValue}
                                 onChange={handlePickerChange}
                                 onClick={handlePickerOpen}
                                 aria-label="날짜 선택" />
            </StyledDateWrap>}
        </StyledHeading>
    );
};

const StyledHeading = styled.h1`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* 누를 수 있다는 표시(pill 배경 + 셰브론). 좌우 패딩이 탭 영역도 넓혀줘
   연간 보기처럼 텍스트가 "2026" 뿐일 때 타겟이 지나치게 좁아지는 것도 막는다. */
const StyledDateWrap = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 12px;
  border-radius: 999px;
  background-color: var(--gray-color2);
  cursor: pointer;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: var(--light-gray-color);
    }
  }
`;

const StyledChevron = styled.svg`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: var(--dark-gray-color2);
  fill: none;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
`;

const StyledDateElement = styled.span`
  display: inline-flex;
  font-size: var(--big-font);

  & + & {
    &:before {
      content: "/";
      display: inline-flex;
      position: relative;
      margin: 0 4px;
    }
  }
`;

const StyledDateInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  opacity: 0;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;

  &::-webkit-calendar-picker-indicator {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    cursor: pointer;
  }
`;
