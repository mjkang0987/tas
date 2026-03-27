import React from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    ViewType,
} from '../../utils/constants';

import {getServiceColor} from '../../utils/services';

import {toDateKey} from '../../utils/reservations';
import {ButtonReserve} from "../common/Buttons";

export const Timeline = ({
                             fullYear,
                             month,
                             date,
                             isToday
                         }: { isToday: boolean, fullYear: number, month: number, date: number }) => {

    const view = useCalendarStore((s) => s.view);
    const {type} = view;
    const time = useCalendarStore((s) => s.time);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setSelectedReservation = useCalendarStore((s) => s.setSelectedReservation);

    const {start, end} = time;

    const customerMap = useCalendarStore((s) => s.customerMap);

    const dateKey = toDateKey(fullYear, month, date);
    const reservations = reservationMap[dateKey] || [];
    const blockOffset = type === ViewType.Day ? 50 : 20;

    const today = new Date();
    const hour = today.getHours();
    const minutes = today.getMinutes();
    const seconds = today.getSeconds();

    const timing = ((end - hour) * 3600) - (minutes * 60) - seconds;
    const top = ((hour - start) * 80) + (minutes * 4 / 3);
    const full = (end - start) * 80;

    const setMousePositionHandler = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const paddingTop = type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
        const relativeY = e.clientY - rect.top - paddingTop;
        const totalMin = Math.max(0, relativeY) / 2;
        let clickH = start + Math.floor(totalMin / 60);
        const clickM = Math.floor(totalMin % 60);
        clickH = Math.min(Math.max(clickH, start), end - 1);

        const rounded = clickM < 15 ? 0 : clickM < 45 ? 30 : 0;
        if (clickM >= 45) clickH = Math.min(clickH + 1, end - 1);

        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${fullYear}-${pad(month + 1)}-${pad(date)}`;
        const startTime = `${pad(clickH)}:${pad(rounded)}`;

        setCreateReservationInitial({date: dateStr, startTime});
    };

    return (<StyledTimelineWrap onClick={setMousePositionHandler}
                                type={type}
                                $timing={timing}
                                $top={top}
                                $full={full}>
        {isToday && <StyledBar />}
        {reservations.map((r, index) => {
            const [sH, sM] = r.startTime.split(':').map(Number);
            const [eH, eM] = r.endTime.split(':').map(Number);
            const blockTop = (sH - start) * 80 + sM * 4 / 3 + blockOffset;
            const blockHeight = (eH - sH) * 80 + (eM - sM) * 4 / 3;
            const customer = customerMap[r.customerId];

            return (<ButtonReserve key={r.id}
                                   $position='absolute'
                                   $top={blockTop}
                                   $height={blockHeight}
                                   $color={getServiceColor(r.service)}
                                   $cancelled={r.status === 'cancelled' || r.status === 'noshow'}
                                   onClick={(e: React.MouseEvent) => {
                                       e.stopPropagation();
                                       setSelectedReservation(r);
                                   }}>
                <strong>{r.service}{r.status === 'cancelled' ? ' (취소)' : r.status === 'noshow' ? ' (노쇼)' : ''}</strong>
                {customer && <span className="detail">{customer.name}</span>}
            </ButtonReserve>);
        })}
    </StyledTimelineWrap>);
};
const StyledTimelineWrap = styled.div<{
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void,
    type: string,
    $timing: number,
    $top: number,
    $full: number
}>`
    --bar-top: ${props => props.$top ? props.$top : 0}px;
    --timeline-height: ${props => props.$full ? props.$full : 10 * 80}px;

    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%;
    padding: ${props => props.type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP}px 5px 0;
    box-sizing: border-box;

    > span {
        top: ${props => props.type === ViewType.Day ? 50 : 20}px;
        animation: down ${props => props.$timing ? props.$timing : 10 * 3600}s linear;
    }
`;

const StyledBar = styled.span`
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--orange-color);
    pointer-events: none;

    &:before {
        content: "";
        position: absolute;
        top: -4px;
        left: 0;
        width: 10px;
        height: 10px;
        background-color: var(--orange-color);
        border-radius: 100%;
    }
`;

