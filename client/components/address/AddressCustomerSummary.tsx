import React from 'react';

import styled from 'styled-components';

import {LabelBadge} from '../ui/LabelBadge';
import {ServiceChipList} from '../ui/ServiceChip';
import type {Customer} from '../../utils/customers';
import {formatTel} from '../../utils/customers';
import {formatPrice} from '../../utils/services';

const STATUS_COLORS: Record<string, string> = {
    booked: '#4285F4',
    cancelled: '#999',
    completed: '#34A853',
    noshow: '#EA4335',
};

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
                    <strong>{customer.name}</strong>
                )}
                <StyledTel><StyledTelLink href={`tel:${customer.tel}`} onClick={(e) => e.stopPropagation()}>{formatTel(customer.tel)}</StyledTelLink></StyledTel>
                <StyledRecentService>
                    <StyledRecentServiceLabel>최근 서비스</StyledRecentServiceLabel>
                    {stats?.recentService && stats.recentService !== '-'
                        ? <ServiceChipList service={stats.recentService} serviceColorMap={serviceColorMap} keyPrefix={customer.id} />
                        : '-'}
                </StyledRecentService>
                <StyledArrow $open={open} />
            </StyledInlineRow>
            <StyledBlockRow>
                <StyledPrice><StyledPriceLabel>적립금</StyledPriceLabel>{formatPrice(customer.points ?? 0)}</StyledPrice>
                <StyledStatusCounts>
                    <StyledStatusBadge $type="booked">예약({stats?.booked || 0})</StyledStatusBadge>
                    <StyledStatusBadge $type="cancelled">예약취소({stats?.cancelled || 0})</StyledStatusBadge>
                    <StyledStatusBadge $type="completed">완료({stats?.completed || 0})</StyledStatusBadge>
                    <StyledStatusBadge $type="noshow">노쇼({stats?.noshow || 0})</StyledStatusBadge>
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
        &:hover strong,
        &:hover ${StyledNameButton} {
            color: var(--blue-color);
        }
    }
`;

const StyledInlineRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;

    > strong {
        flex-shrink: 0;
        font-size: var(--font);
        font-weight: 500;
    }
`;

const StyledTel = styled.span`
    flex-shrink: 0;
    font-size: var(--small-font);
    color: var(--dark-gray-color);
`;

const StyledRecentService = styled.span`
    flex: 1;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--small-font);
    overflow: hidden;
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

const StyledStatusBadge = styled(LabelBadge).attrs<{ $type: string }>((props) => ({
    $tone:
        props.$type === 'completed'
            ? 'success'
            : props.$type === 'noshow'
                ? 'danger'
                : props.$type === 'booked'
                    ? 'info'
                    : 'neutral',
    $shape: 'soft',
    $size: 'sm',
}))<{ $type: string }>`
    font-size: var(--tiny-font);
    font-weight: 500;
    color: ${(props) => STATUS_COLORS[props.$type] || 'var(--gray-color)'};
`;
