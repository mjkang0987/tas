import type {ChangeEvent} from 'react';

import {useRouter} from 'next/router';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {setRouter} from '../../utils/router';
import {pad} from '../../utils/timeRound';

// 모바일 헤더의 날짜 점프 — 네이티브 날짜 선택(달력)으로 임의 날짜로 이동.
// 프론트 표준(네이티브 우선)에 맞춰 커스텀 달력 대신 <input type="date">를 쓴다.
// 공유 CalendarHeading은 건드리지 않고 캘린더 아이콘 옆에 얹는다.
export const MobileDateJump = () => {
    const router = useRouter();
    const view = useCalendarStore((s) => s.view);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);

    // 현재 보는 날짜를 피커 초기값으로(달을 그 위치에서 열기)
    const value = currValue.full
        ? `${currValue.fullYear}-${pad(currValue.month + 1)}-${pad(currValue.date)}`
        : '';

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value; // YYYY-MM-DD
        if (!raw) {
            return;
        }

        const [year, month, date] = raw.split('-').map(Number);
        if (!year || !month || !date) {
            return;
        }

        const target = new Date(year, month - 1, date);
        setCurr(target);
        setRouter({
            type: view.type,
            year,
            month,
            date,
            router,
        });
    };

    return (
        <StyledDateJump>
            <StyledCalendarIcon viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9.5H20.5" />
            </StyledCalendarIcon>
            <StyledDateInput type="date"
                             value={value}
                             onChange={handleChange}
                             aria-label="날짜 선택" />
        </StyledDateJump>
    );
};

// 데스크톱 숨김, 모바일에서만 노출.
const StyledDateJump = styled.div`
    display: none;

    @media (max-width: 640px) {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        border-radius: var(--radius-md);
        color: var(--dark-gray-color);
    }
`;

const StyledCalendarIcon = styled.svg`
    width: 20px;
    height: 20px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
`;

// 아이콘 위를 덮는 투명 네이티브 date input — 탭하면 OS 달력이 뜬다.
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
