import React from 'react';

import styled from 'styled-components';

import type {CustomerMap} from '../../../utils/customers';
import type {Reservation} from '../../../utils/reservations';
import {formatPrice} from '../../../utils/services';
import {StyledBody, StyledBodyInner, StyledStatusBadge} from './ModalStyles';

interface ReservationViewSectionProps {
    reservation: Reservation;
    customerMap: CustomerMap;
    displayPrice: number;
    displayDesignerName: string;
    displayDesignerColor: string;
    paymentCompleted: boolean;
    paymentLines: string[];
    historyCount: number;
    onCustomerClick: (customerId: number) => void;
    onOpenHistory: () => void;
}

export function ReservationViewSection({
    reservation,
    customerMap,
    displayPrice,
    displayDesignerName,
    displayDesignerColor,
    paymentCompleted,
    paymentLines,
    historyCount,
    onCustomerClick,
    onOpenHistory,
}: ReservationViewSectionProps) {
    const customer = customerMap[reservation.customerId];
    const isCancelled = reservation.status === 'cancelled';
    const isNoshow = reservation.status === 'noshow';

    return (
        <StyledDetailBody>
            <StyledDetailBodyInner>
                <dl>
                    {isCancelled && (
                        <>
                            <dt>상태</dt>
                            <dd><StyledStatusBadge $variant="danger">취소됨</StyledStatusBadge></dd>
                        </>
                    )}
                    {isNoshow && (
                        <>
                            <dt>상태</dt>
                            <dd><StyledStatusBadge $variant="warning">노쇼</StyledStatusBadge></dd>
                        </>
                    )}
                    <dt>날짜</dt>
                    <dd>{reservation.date}</dd>
                    <dt>시간</dt>
                    <dd>{reservation.startTime} ~ {reservation.endTime}</dd>
                    <dt>가격</dt>
                    <dd>{formatPrice(displayPrice)}</dd>
                    <dt>결제</dt>
                    <dd>
                        <StyledPaymentValue>
                            <StyledPaymentBadge $completed={paymentCompleted}>
                                {paymentCompleted ? '결제완료' : '미결제'}
                            </StyledPaymentBadge>
                            <StyledPaymentLineList>
                                {paymentLines.map((line) => <span key={line}>{line}</span>)}
                            </StyledPaymentLineList>
                        </StyledPaymentValue>
                    </dd>
                    <dt>고객명</dt>
                    <dd>
                        <StyledCustomerButton type="button" onClick={() => onCustomerClick(reservation.customerId)}>
                            {customer?.name ?? '-'}
                        </StyledCustomerButton>
                    </dd>
                    <dt>연락처</dt>
                    <dd>{customer?.tel ?? '-'}</dd>
                    <dt>적립금</dt>
                    <dd>{formatPrice(customer?.points ?? 0)}</dd>
                    <dt>디자이너</dt>
                    <dd>
                        <StyledDesignerValue>
                            <StyledDesignerDot $color={displayDesignerColor} />
                            <span>{displayDesignerName}</span>
                        </StyledDesignerValue>
                    </dd>
                </dl>
                {historyCount > 0 && (
                    <StyledHistorySection>
                        <StyledHistoryButton type="button" onClick={onOpenHistory}>
                            변경 이력 ({historyCount})
                        </StyledHistoryButton>
                    </StyledHistorySection>
                )}
            </StyledDetailBodyInner>
        </StyledDetailBody>
    );
}

const StyledDetailBody = styled(StyledBody)``;

const StyledDetailBodyInner = styled(StyledBodyInner)`
    dl {
        display: grid;
        grid-template-columns: 60px 1fr;
        gap: 8px 12px;
        margin: 0;
    }

    dt {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 500;
    }

    dd {
        margin: 0;
        font-size: 13px;
    }
`;

const StyledCustomerButton = styled.button`
    border: none;
    background: none;
    padding: 0;
    font-size: 13px;
    color: #4285F4;
    cursor: pointer;
    text-decoration: underline;

    &:hover {
        color: #1a73e8;
    }
`;

const StyledDesignerValue = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const StyledDesignerDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    flex-shrink: 0;
`;

const StyledPaymentValue = styled.span`
    display: inline-flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
`;

const StyledPaymentLineList = styled.span`
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
`;

const StyledPaymentBadge = styled.span<{ $completed: boolean }>`
    display: inline-block;
    padding: 2px var(--gap-md);
    border-radius: var(--radius-sm);
    border: 1px solid ${(props) => props.$completed ? '#CDEAD6' : 'var(--light-gray-color)'};
    background-color: ${(props) => props.$completed ? '#E6F4EA' : 'var(--black-color-10)'};
    color: ${(props) => props.$completed ? '#137333' : 'var(--dark-gray-color2)'};
    font-size: var(--small-font);
    font-weight: 600;
`;

const StyledHistorySection = styled.div`
    margin-top: 16px;
    border-top: 1px solid var(--light-gray-color);
    padding-top: 12px;
`;

const StyledHistoryButton = styled.button`
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: 6px;
    background: var(--white-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);
    cursor: pointer;
    text-align: left;

    &::after {
        content: "\\203A";
        float: right;
        font-size: 16px;
        line-height: 1;
        color: var(--gray-color);
    }

    &:hover {
        background-color: var(--black-color-10);
    }
`;
