import React from 'react';

import styled from 'styled-components';

import {LabelBadge} from '../ui/LabelBadge';
import type {Customer} from '../../utils/customers';
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
};

export function AddressCustomerSummary({customer, stats}: AddressCustomerSummaryProps) {
    return (
        <StyledSummary>
            <strong>{customer.name}</strong>
            <span>{customer.tel.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</span>
            <span>{stats?.recentService || '-'}</span>
            <span>{formatPrice(customer.points ?? 0)}</span>
            <StyledStatusCounts>
                <StyledStatusBadge $type="booked">예약({stats?.booked || 0})</StyledStatusBadge>
                <StyledStatusBadge $type="cancelled">취소({stats?.cancelled || 0})</StyledStatusBadge>
                <StyledStatusBadge $type="completed">완료({stats?.completed || 0})</StyledStatusBadge>
                <StyledStatusBadge $type="noshow">노쇼({stats?.noshow || 0})</StyledStatusBadge>
            </StyledStatusCounts>
        </StyledSummary>
    );
}

const StyledSummary = styled.summary`
    display: grid;
    grid-template-columns: 80px 130px 1fr 100px auto;
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    list-style: none;
    position: relative;

    &::-webkit-details-marker {
        display: none;
    }

    &::before {
        content: "";
        position: absolute;
        left: 0;
        display: inline-block;
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-left: 5px solid var(--dark-gray-color);
        transition: transform 0.15s ease;
    }

    > strong {
        font-size: var(--font);
        font-weight: 500;
    }

    > span:first-of-type {
        font-size: var(--small-font);
        color: var(--dark-gray-color);
    }

    > span:nth-of-type(2) {
        font-size: var(--small-font);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    > span:nth-of-type(3) {
        font-size: var(--small-font);
        text-align: right;
        color: var(--dark-gray-color);
        font-weight: 600;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover > strong {
            color: var(--blue-color);
        }
    }

    @media (max-width: 600px) {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 10px;

        > strong {
            min-width: 60px;
        }

        > span:nth-of-type(2) {
            width: 100%;
        }

        > span:nth-of-type(3) {
            text-align: left;
        }
    }
`;

const StyledStatusCounts = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
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
