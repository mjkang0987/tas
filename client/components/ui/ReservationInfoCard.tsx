import styled from 'styled-components';
import type {KeyboardEvent} from 'react';

import type {Reservation} from '../../utils/reservations';
import {RESERVATION_STATUS_BADGE_STYLES, hasCompletedPayment} from '../../utils/reservations';
import {formatPrice} from '../../utils/services';
import {DesignerLabel, StyledDesignerLabel} from './DesignerLabel';
import {LabelBadge} from './LabelBadge';
import {NewCustomerBadge} from './NewCustomerBadge';
import {ServiceChipList} from './ServiceChip';

type ReservationInfoCardProps = {
    reservation: Reservation;
    serviceColorMap: Record<string, string>;
    designerColor: string;
    designerName: string;
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
    if (reservation.status === 'cancelled') return {type: 'cancelled', label: '예약취소'};
    if (reservation.status === 'noshow') return {type: 'noshow', label: '노쇼'};
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
    designerColor,
    designerName,
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
            $accentColor={accentColor ?? designerColor}
            $accentBar={accentBar}
            $clickable={clickable}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? handleActivate : undefined}
            onKeyDown={handleKeyDown}
        >
            <StyledLeft>
            {!compactDate && timeMode !== 'none' && (
                <StyledTime>{timeText}</StyledTime>
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
                            <StyledCustomerName>{customerName}</StyledCustomerName>
                        )}
                    </StyledCustomerMeta>
                )}

                <StyledServiceList
                    service={reservation.service}
                    serviceColorMap={serviceColorMap}
                    keyPrefix={reservation.id}
                />
                <StyledMetaLine>
                    <StyledDesignerMeta>
                        <span>디자이너</span>
                        <DesignerLabel color={designerColor} name={designerName} />
                    </StyledDesignerMeta>
                </StyledMetaLine>
            </StyledBody>
            {(showStatus || showPrice) && (
                <StyledTrailing>
                    {showStatus && (
                        <StyledStatusBadge $type={state.type}>
                            {state.label}
                        </StyledStatusBadge>
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

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledLeft = styled.strong`
    font-weight: normal;
`;

const StyledTime = styled.span`
    flex-shrink: 0;
    width: 76px;
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;

    @media (max-width: 640px) {
        width: auto;
    }
`;

const StyledBody = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
`;

const StyledCompactDate = styled.div`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;
const StyledDate = styled.div`
    font-size: 11px;
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

const StyledDesignerMeta = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--dark-gray-color);

    ${StyledDesignerLabel} {
        gap: 4px;
    }
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

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--blue-color);
        }
    }
`;

const StyledTrailing = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-left: auto;

    @media (max-width: 640px) {
        width: 100%;
        justify-content: space-between;
    }
`;

const StyledStatusBadge = styled(LabelBadge).attrs<{ $type: string }>((props) => ({
    $tone: (props.$type === 'completed' || props.$type === 'paid') ? 'success' : props.$type === 'cancelled' ? 'neutral' : props.$type === 'noshow' ? 'danger' : 'info',
    $shape: 'soft',
    $size: 'sm',
}))<{ $type: string }>`
    font-size: var(--tiny-font);
    font-weight: 600;
    background-color: ${(props) => RESERVATION_STATUS_BADGE_STYLES[props.$type]?.bg || '#F1F1F1'};
    color: ${(props) => RESERVATION_STATUS_BADGE_STYLES[props.$type]?.color || '#999'};
`;

const StyledPrice = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
`;
