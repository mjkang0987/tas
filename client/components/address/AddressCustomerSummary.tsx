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

// 모바일만 한 줄을 통째로 써서 이름 줄과 분리(3줄). 데스크톱은 작업 이전 그대로 이름·연락처 옆.
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
        /* 줄어들지 않는다. 자리가 모자라면 이게 짜부라지는 대신
           옆의 적립금·예약상태 블록이 부모의 flex-wrap 을 타고 아랫줄로 내려간다. */
        flex: 1 0 auto;
        max-width: 100%;
        flex-wrap: nowrap;
        gap: 4px;
        overflow: hidden;
    }
`;

// 시술명이 공백에서 쪼개지지 않게 — 모바일 한정. 데스크톱은 작업 이전 동작 유지.
// 이 목록에선 시술명을 **어떤 폭에서도 한 줄**로 둔다.
//
// 글자 단위로 쪼개지는 것 자체는 공용 칩(`StyledServiceText`)의 `word-break: keep-all`
// 이 막는다. 여기서 `nowrap` 을 더하는 이유는 한 행에 여러 정보가 나란히 놓이는
// 목록이라 시술명이 두 줄이 되면 행 높이가 들쭉날쭉해지기 때문이다.
// 예전엔 이 nowrap 이 `max-width: 840px` 안에만 있어 그 위 구간(841~980px)이 비었고,
// 사이드바를 연 좁은 데스크톱에서 행 높이가 19px → 98px 로 터졌다.
//
// 폭이 모자라면 대신 예약 상태 배지가 아랫줄로 내려간다(`StyledStatusCounts`).
const StyledServiceChips = styled(ServiceChipList)`
    ${StyledServiceText} {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const StyledRecentServiceLabel = styled.span`
    flex-shrink: 0;
    font-weight: 500;
    color: var(--dark-gray-color);
`;

const StyledBlockRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    /* 데스크톱에선 이 래퍼를 없애 적립금·상태배지를 부모의 직접 자식으로 만든다.
       그래야 적립금은 첫 줄에 남고 상태 배지'만' 아랫줄로 내려간다.
       (래퍼째 내려가면 적립금까지 같이 끌려 내려간다.) */
    @media (min-width: 841px) {
        display: contents;
    }

    @media (max-width: 840px) {
        width: 100%;
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

    /* 래퍼가 display: contents 라 여기서 직접 우측으로 민다. */
    @media (min-width: 841px) {
        margin-left: auto;
        flex-shrink: 0;
    }
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

    /* 자리가 모자라면 이것만 아랫줄로 내려간다(부모가 flex-wrap: wrap). */
    @media (min-width: 841px) {
        flex-shrink: 0;
        margin-left: auto;
    }
`;

