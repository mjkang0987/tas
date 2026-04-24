import React from 'react';

import styled from 'styled-components';

import type {Reservation} from '../../utils/reservations';
import {getServiceColor, parseServiceString} from '../../utils/services';

const RESERVATION_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    booked: {bg: '#E8F0FE', color: '#4285F4'},
    cancelled: {bg: '#F1F1F1', color: '#999'},
    completed: {bg: '#E6F4EA', color: '#34A853'},
    noshow: {bg: '#FCE8E6', color: '#EA4335'},
};

type AddressCustomerReservationsProps = {
    customerReservations: Reservation[];
    designerColorMap: Record<number, string>;
    designerNameMap: Record<number, string>;
    serviceColorMap: Record<string, string>;
    today: string;
    onReservationClick: (reservation: Reservation) => void;
};

const getReservationState = (reservation: Reservation, today: string) => {
    if (reservation.status === 'cancelled') {
        return {type: 'cancelled', label: '취소'};
    }
    if (reservation.status === 'noshow') {
        return {type: 'noshow', label: '노쇼'};
    }
    if (reservation.status === 'completed') {
        return {type: 'completed', label: '완료'};
    }
    if (reservation.date < today) {
        return {type: 'completed', label: '완료'};
    }
    return {type: 'booked', label: '예약'};
};

export function AddressCustomerReservations({
    customerReservations,
    designerColorMap,
    designerNameMap,
    serviceColorMap,
    today,
    onReservationClick,
}: AddressCustomerReservationsProps) {
    return (
        <StyledReservationWrap>
            {customerReservations.length > 0 ? (
                <dl>
                    {customerReservations.map((reservation) => {
                        const designerColor = reservation.designerId
                            ? (designerColorMap[reservation.designerId] ?? '#8E8E93')
                            : '#8E8E93';
                        const designerName = reservation.designerId
                            ? (designerNameMap[reservation.designerId] ?? '미지정')
                            : '미지정';
                        const state = getReservationState(reservation, today);

                        return (
                            <StyledReservationItem
                                key={reservation.id}
                                $color={designerColor}
                                onClick={() => onReservationClick(reservation)}
                            >
                                <dt className="a11y">예약정보</dt>
                                <dd>
                                    <StyledReservationItemTop>
                                        <span className="date">{reservation.date}</span>
                                        <span className="time">{reservation.startTime}~{reservation.endTime}</span>
                                        <StyledServiceList>
                                            {parseServiceString(reservation.service).map((serviceName) => (
                                                <StyledServiceToken key={`${reservation.id}-${serviceName}`}>
                                                    <StyledServiceDot $color={getServiceColor(serviceName, serviceColorMap)} />
                                                    <span>{serviceName}</span>
                                                </StyledServiceToken>
                                            ))}
                                        </StyledServiceList>
                                    </StyledReservationItemTop>
                                    <StyledReservationMetaLine>
                                        <span>디자이너: {designerName}</span>
                                        <StyledReservationBadge $type={state.type}>
                                            {state.label}
                                        </StyledReservationBadge>
                                    </StyledReservationMetaLine>
                                </dd>
                            </StyledReservationItem>
                        );
                    })}
                </dl>
            ) : (
                <StyledEmpty>예약 내역이 없습니다.</StyledEmpty>
            )}
        </StyledReservationWrap>
    );
}

const StyledReservationWrap = styled.div`
`;

const StyledReservationItem = styled.div<{ $color: string }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 40px;
    padding: 6px 10px;
    font-size: var(--small-font);
    box-sizing: border-box;
    border: 1px solid ${(props) => props.$color};
    border-left-width: 4px;
    border-radius: 8px;
    background-color: ${(props) => `${props.$color}12`};
    cursor: pointer;
    margin-bottom: 6px;

    &:last-child {
        margin-bottom: 0;
    }

    &:hover {
        background-color: ${(props) => `${props.$color}1d`};
    }

    dt {
        position: absolute;
        overflow: hidden;
        width: 1px;
        height: 1px;
        clip: rect(1px, 1px, 1px, 1px);
        clip-path: inset(50%);
    }

    dd {
        margin: 0;
        width: 100%;
    }
`;

const StyledReservationItemTop = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;

    .date,
    .time {
        color: var(--dark-gray-color);
        opacity: 0.9;
    }
`;

const StyledServiceList = styled.span`
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 500;
`;

const StyledServiceToken = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
`;

const StyledServiceDot = styled.span<{ $color: string }>`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
`;

const StyledReservationMetaLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    justify-content: space-between;
    font-size: var(--tiny-font);
    color: var(--gray-color);
`;

const StyledReservationBadge = styled.span<{ $type: string }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: var(--tiny-font);
    font-weight: 600;
    white-space: nowrap;
    background-color: ${(props) => RESERVATION_BADGE_STYLES[props.$type]?.bg || '#F1F1F1'};
    color: ${(props) => RESERVATION_BADGE_STYLES[props.$type]?.color || '#999'};
`;

const StyledEmpty = styled.p`
    padding: 16px 10px;
    font-size: var(--small-font);
    color: var(--gray-color);
    text-align: center;
    background-color: var(--black-color-10);
    border-radius: 4px;
`;
