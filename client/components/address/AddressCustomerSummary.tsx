import React from 'react';

import styled from 'styled-components';

import {ServiceChipList, StyledServiceText} from '../ui/ServiceChip';
import {ReservationStatusBadge} from '../ui/ReservationStatusBadge';
import type {Customer} from '../../utils/customers';
import {formatTel} from '../../utils/customers';
import {formatPrice} from '../../utils/services';

type CustomerStats = {
    recentService: string;
    booked: number;
    cancelled: number;
    completed: number;
    noshow: number;
};

type AddressCustomerSummaryProps = {
    customer: Customer;
    stats?: CustomerStats;
    serviceColorMap: Record<string, string>;
    checked?: boolean;
    onCheck?: (id: number) => void;
    onCustomerClick?: (customerId: number) => void;
    onToggle?: () => void;
    open?: boolean;
};

export function AddressCustomerSummary({customer, stats, serviceColorMap, checked, onCheck, onCustomerClick, onToggle, open}: AddressCustomerSummaryProps) {
    return (
        <StyledSummaryRow
            onClick={onToggle}
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } }}
        >
            <StyledInlineRow>
                {onCheck && (
                    <StyledCheckbox
                        type="checkbox"
                        checked={checked ?? false}
                        onChange={(e) => { e.stopPropagation(); onCheck(customer.id); }}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
                {onCustomerClick ? (
                    <StyledNameButton type="button" onClick={(e) => { e.stopPropagation(); onCustomerClick(customer.id); }}>
                        {customer.name}
                    </StyledNameButton>
                ) : (
                    <StyledName>{customer.name}</StyledName>
                )}
                <StyledTel><StyledTelLink href={`tel:${customer.tel}`} onClick={(e) => e.stopPropagation()}>{formatTel(customer.tel)}</StyledTelLink></StyledTel>
                <StyledArrow $open={open} />
            </StyledInlineRow>
            <StyledRecentService>
                <StyledRecentServiceLabel>최근 서비스</StyledRecentServiceLabel>
                {stats?.recentService && stats.recentService !== '-'
                    ? <StyledServiceChips service={stats.recentService} serviceColorMap={serviceColorMap} keyPrefix={customer.id} />
                    : '-'}
            </StyledRecentService>
            <StyledBlockRow>
                <StyledPrice><StyledPriceLabel>적립금</StyledPriceLabel>{formatPrice(customer.points ?? 0)}</StyledPrice>
                <StyledStatusCounts>
                    <ReservationStatusBadge $type="booked">예약({stats?.booked || 0})</ReservationStatusBadge>
                    <ReservationStatusBadge $type="cancelled">취소({stats?.cancelled || 0})</ReservationStatusBadge>
                    <ReservationStatusBadge $type="completed">완료({stats?.completed || 0})</ReservationStatusBadge>
                    <ReservationStatusBadge $type="noshow">노쇼({stats?.noshow || 0})</ReservationStatusBadge>
                </StyledStatusCounts>
            </StyledBlockRow>
        </StyledSummaryRow>
    );
}

const StyledNameButton = styled.button`
    all: unset;
    font-size: var(--font);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--blue-color);
        }
    }
`;

const StyledName = styled.strong`
    flex-shrink: 0;
    font-size: var(--font);
    font-weight: 500;
`;

const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

const StyledCheckbox = styled.input`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
`;

const StyledArrow = styled.span<{ $open?: boolean }>`
    position: absolute;
    right: 0;
    top: 50%;
    display: inline-block;
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 5px solid var(--dark-gray-color);
    transform: translateY(-50%) ${(p) => p.$open ? 'rotate(90deg)' : 'rotate(0deg)'};
    transition: transform 0.15s ease;
`;

const StyledSummaryRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 10px 0;
    padding-right: 16px;
    cursor: pointer;
    position: sticky;
    top: 52px;

    @media (hover: hover) and (pointer: fine) {
        &:hover ${StyledName},
        &:hover ${StyledNameButton} {
            color: var(--blue-color);
        }
    }
`;

// 데스크톱에선 이름·연락처만큼만 차지하고 남는 폭은 최근 서비스에 넘긴다.
const StyledInlineRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;

    @media (min-width: 841px) {
        flex: 0 1 auto;
    }
`;

const StyledTel = styled.span`
    flex-shrink: 0;
    font-size: var(--small-font);
    color: var(--dark-gray-color);
`;

// 모바일은 한 줄을 통째로 쓰고(3줄), 데스크톱은 폭이 남으니 이름·연락처 옆에 붙인다(2줄).
const StyledRecentService = styled.span`
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px 6px;
    flex-wrap: wrap;
    font-size: var(--small-font);

    @media (min-width: 841px) {
        width: auto;
        flex: 1;
    }
`;

// 시술명 하나가 공백에서 쪼개지지 않게. 칩이 줄 너비를 넘으면 칩 단위로 다음 줄.
const StyledServiceChips = styled(ServiceChipList)`
    ${StyledServiceText} {
        white-space: nowrap;
    }
`;

const StyledRecentServiceLabel = styled.span`
    flex-shrink: 0;
    font-weight: 500;
    color: var(--dark-gray-color);
`;

// 적립금·예약현황은 항상 자기 줄 — 데스크톱 2줄(이름+서비스 / 적립금), 모바일 3줄.
const StyledBlockRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    width: 100%;

    @media (max-width: 840px) {
        justify-content: space-between;
    }
`;

const StyledPrice = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledPriceLabel = styled.span`
    font-weight: 500;
    color: var(--dark-gray-color);
`;

const StyledStatusCounts = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
`;

