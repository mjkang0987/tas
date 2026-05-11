import styled from 'styled-components';

import {formatPrice} from '../../../utils/services';

export type RevenueMetricKey = 'sales' | 'count' | 'new' | 'returning' | 'paid';

interface RevenueKpiGridProps {
    total: number;
    count: number;
    newCustomerCount: number;
    returningCustomerCount: number;
    paidTotal: number;
    onMetricClick: (key: RevenueMetricKey) => void;
}

export const RevenueKpiGrid = ({
    total,
    count,
    newCustomerCount,
    returningCustomerCount,
    paidTotal,
    onMetricClick,
}: RevenueKpiGridProps) => (
    <StyledKpiGrid>
        <StyledKpiCard onClick={() => onMetricClick('sales')}>
            <span>총 매출</span>
            <strong>{formatPrice(total)}</strong>
        </StyledKpiCard>
        <StyledKpiCard onClick={() => onMetricClick('count')}>
            <span>예약 건수</span>
            <strong>{count}건</strong>
        </StyledKpiCard>
        <StyledKpiCard onClick={() => onMetricClick('new')}>
            <span>신규 고객 수</span>
            <strong>{newCustomerCount}명</strong>
        </StyledKpiCard>
        <StyledKpiCard onClick={() => onMetricClick('returning')}>
            <span>재방문 고객 수</span>
            <strong>{returningCustomerCount}명</strong>
        </StyledKpiCard>
        <StyledKpiCard onClick={() => onMetricClick('paid')}>
            <span>결제완료</span>
            <strong>{formatPrice(paidTotal)}</strong>
        </StyledKpiCard>
    </StyledKpiGrid>
);

/* ── Styled ── */

const StyledKpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 1080px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 640px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`;

const StyledKpiCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: 14px;
    background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background: linear-gradient(180deg, #f5f8ff 0%, #edf2ff 100%);
    }
    }

    span {
        font-size: 11px;
        color: var(--dark-gray-color2);
    }

    strong {
        font-size: 18px;
        color: var(--black-color);
    }
`;
