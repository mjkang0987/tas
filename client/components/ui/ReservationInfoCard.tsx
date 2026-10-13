import styled from 'styled-components';
import type {KeyboardEvent} from 'react';

import type {Reservation} from '../../utils/reservations';
import {hasCompletedPayment} from '../../utils/reservations';
import {formatPrice} from '../../utils/services';
import {AssigneeLabel} from './AssigneeLabel';
import {ReservationStatusBadge} from './ReservationStatusBadge';
import {NewCustomerBadge} from './NewCustomerBadge';
import {ServiceChipList} from './ServiceChip';

type ReservationInfoCardProps = {
    reservation: Reservation;
    serviceColorMap: Record<string, string>;
    assigneeColor: string;
    assigneeName: string;
    customerName?: string;
    today?: string;
    isNewCustomer?: boolean;
    onClick?: (reservation: Reservation) => void;
    onCustomerClick?: (customerId: number) => void;
    showDate?: boolean;
    showPrice?: boolean;
    showStatus?: boolean;
    timeMode?: 'start' | 'range' | 'none';
    compactDate?: boolean;
    accentColor?: string;
    accentBar?: boolean;
    className?: string;
};

function getReservationState(reservation: Reservation, today?: string) {
    if (reservation.status === 'cancelled') return {type: 'cancelled', label: '취소'};
    if (reservation.status === 'noshow') return {type: 'noshow', label: '노쇼'};
    if (reservation.status === 'requested') return {type: 'requested', label: '신청'};
    if (hasCompletedPayment(reservation)) return {type: 'paid', label: '결제완료'};
    return {type: 'booked', label: '예약'};
}

function getTimeText(reservation: Reservation, timeMode: 'start' | 'range' | 'none') {
    if (timeMode === 'none') return '';
    if (timeMode === 'start') return reservation.startTime;
    return `${reservation.startTime}~${reservation.endTime}`;
}

export function ReservationInfoCard({
    reservation,
    serviceColorMap,
    assigneeColor,
    assigneeName,
    customerName,
    today,
    isNewCustomer = false,
    onClick,
    onCustomerClick,
    showDate = true,
    showPrice = false,
    showStatus = true,
    timeMode = 'range',
    compactDate = false,
    accentColor,
    accentBar = true,
    className,
}: ReservationInfoCardProps) {
    const clickable = !!onClick;
    const isInactive = reservation.status === 'cancelled' || reservation.status === 'noshow';
    const state = getReservationState(reservation, today);
    const timeText = getTimeText(reservation, timeMode);
    const handleActivate = () => {
        if (onClick) {
            onClick(reservation);
        }
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!clickable) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        handleActivate();
    };

    return (
        <StyledCard
            {...(clickable ? {as: 'button' as const, type: 'button' as const} : {})}
            className={[className, isInactive ? 'inactive' : ''].filter(Boolean).join(' ') || undefined}
            $accentColor={accentColor ?? assigneeColor}
            $accentBar={accentBar}
            $clickable={clickable}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? handleActivate : undefined}
            onKeyDown={handleKeyDown}
        >
            <StyledLeft>
            {!compactDate && timeMode !== 'none' && (
                <StyledTime>
                    {/* 시작·종료를 두 줄로 — 한 줄짜리 "10:00~11:30"은 좁은 칸에서 접힌다.
                        줄바꿈 자체가 범위를 뜻하므로 물결표는 두지 않는다. */}
                    <span>{reservation.startTime}</span>
                    {timeMode === 'range' && <span>{reservation.endTime}</span>}
                </StyledTime>
            )}
            {compactDate && (
                <StyledCompactDate>
                    {showDate ? `${reservation.date} ` : ''}{timeText}
                </StyledCompactDate>
            )}
            {!compactDate && showDate && (
                <StyledDate>{reservation.date}</StyledDate>
            )}
            </StyledLeft>
            <StyledBody>
                {customerName && (
                    <StyledCustomerMeta>
                        {isNewCustomer && <NewCustomerBadge>N</NewCustomerBadge>}
                        {onCustomerClick ? (
                            <StyledCustomerButton
                                className={isInactive ? 'strike' : undefined}
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onCustomerClick(reservation.customerId);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onCustomerClick(reservation.customerId);
                                    }
                                }}
                            >
                                {customerName}
                            </StyledCustomerButton>
                        ) : (
                            <StyledCustomerName className={isInactive ? 'strike' : undefined}>{customerName}</StyledCustomerName>
                        )}
                    </StyledCustomerMeta>
                )}

                <StyledServiceList
                    service={reservation.service}
                    serviceColorMap={serviceColorMap}
                    keyPrefix={reservation.id}
                />
                <StyledMetaLine>
                    <StyledAssigneeMeta>
                        {/* "담당자" 라벨은 두지 않는다 — 색 배지와 이름만으로 뜻이 분명하고,
                            좁은 카드에서 그 두 글자가 이름을 밀어낸다. */}
                        <AssigneeLabel color={assigneeColor} name={assigneeName} />
                    </StyledAssigneeMeta>
                </StyledMetaLine>
            </StyledBody>
            {(showStatus || showPrice) && (
                <StyledTrailing>
                    {showStatus && (
                        <ReservationStatusBadge $type={state.type}>
                            {state.label}
                        </ReservationStatusBadge>
                    )}
                    {showPrice && (
                        <StyledPrice>{formatPrice(reservation.price ?? 0)}</StyledPrice>
                    )}
                </StyledTrailing>
            )}
        </StyledCard>
    );
}

const StyledCard = styled.div<{
    $accentColor: string;
    $accentBar: boolean;
    $clickable: boolean;
}>`
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
    padding: 6px;
    border: 1px solid ${(props) => `${props.$accentColor}44`};
    border-left-width: ${(props) => props.$accentBar ? '4px' : '1px'};
    border-left-color: ${(props) => props.$accentBar ? props.$accentColor : `${props.$accentColor}44`};
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, ${(props) => `${props.$accentColor}12`} 100%);
    color: var(--dark-gray-color);
    box-sizing: border-box;
    text-align: left;
    font: inherit;
    transition: border-color 0.14s ease, background-color 0.14s ease, box-shadow 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: ${(props) => props.$clickable ? `${props.$accentColor}66` : `${props.$accentColor}44`};
            background-color: ${(props) => props.$clickable ? `${props.$accentColor}16` : 'transparent'};
        }
    }

    /* 취소·노쇼: 빗금(해치) 배경 + 무채색 보더 — 활성 예약과 확실히 분기 */
    &.inactive {
        border-color: var(--gray-color);
        border-left-color: var(--gray-color);
        background:
            repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 0 6px, transparent 6px 12px),
            var(--gray-color2);
    }

    @media (hover: hover) and (pointer: fine) {
        &.inactive:hover {
            border-color: var(--gray-color);
            background:
                repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 0 6px, transparent 6px 12px),
                var(--gray-color2);
        }
    }

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledLeft = styled.strong`
    font-weight: normal;
`;

const StyledTime = styled.span`
    display: flex;
    flex-direction: column;
    line-height: 1.25;
    flex-shrink: 0;
    /* 두 줄로 쪼개면서 한 줄에 "10:00" 다섯 글자만 남았다. 76px 은 한 줄짜리
       "10:00~11:30" 기준이던 폭이라 그만큼이 빈 자리로 남는다. */
    width: 42px;
    font-size: var(--small-font);
    font-weight: 700;
    color: #0f172a;

    @media (max-width: 640px) {
        width: auto;
    }
`;

const StyledBody = styled.div`
    flex: 1;
    min-width: 0;
    /* 담당자를 시술칩 다음 줄에 둔다. 한 줄에 흘리면 시술이 많을 때 담당자가 칩 사이에 끼인다. */
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
`;

const StyledCompactDate = styled.div`
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;
const StyledDate = styled.div`
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;

const StyledServiceList = styled(ServiceChipList)`
    font-weight: 500;
`;

const StyledMetaLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    font-size: var(--tiny-font);
    color: var(--gray-color);
`;

const StyledAssigneeMeta = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--dark-gray-color);

`;

const StyledCustomerMeta = styled.span`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    min-width: 0;
`;

const StyledCustomerName = styled.span`
    min-width: 0;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.35;
    word-break: keep-all;
    font-size: var(--small-font);

    &.strike {
        text-decoration: line-through;
        text-decoration-color: var(--gray-color);
        text-decoration-thickness: 1.5px;
        color: var(--dark-gray-color2);
    }
`;

const StyledCustomerButton = styled.span`
    min-width: 0;
    font-weight: 700;
    color: #0f172a;
    text-align: left;
    cursor: pointer;
    line-height: 1.35;
    word-break: keep-all;
    font-size: var(--small-font);

    &.strike {
        text-decoration: line-through;
        text-decoration-color: var(--gray-color);
        text-decoration-thickness: 1.5px;
        color: var(--dark-gray-color2);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--blue-color);
        }
    }
`;

const StyledTrailing = styled.div`
    /* 상태를 가격 위에 세로로 쌓는다. 한 줄에 나란히 두면 좁은 카드에서 둘이 서로를 민다. */
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    margin-left: auto;
`;


const StyledPrice = styled.span`
    font-size: var(--medium-font);
    font-weight: 700;
    color: #0f172a;
`;
