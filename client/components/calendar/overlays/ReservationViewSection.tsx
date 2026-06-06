import React from 'react';

import styled from 'styled-components';

import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {DesignerLabel} from '../../ui/DesignerLabel';
import {LabelBadge} from '../../ui/LabelBadge';
import {ServiceChipList} from '../../ui/ServiceChip';
import type {CustomerMap} from '../../../utils/customers';
import {formatTel} from '../../../utils/customers';
import type {Reservation} from '../../../utils/reservations';
import {formatPrice} from '../../../utils/services';
import {StyledBody, StyledBodyInner, StyledStatusBadge} from './ModalStyles';

interface ReservationViewSectionProps {
    reservation: Reservation;
    customerMap: CustomerMap;
    displayPrice: number;
    displayDesignerName: string;
    displayDesignerColor: string;
    isNewCustomer: boolean;
    paymentCompleted: boolean;
    paymentLines: string[];
    historyCount: number;
    serviceColorMap: Record<string, string>;
    onCustomerClick: (customerId: number) => void;
    onOpenHistory: () => void;
}

export function ReservationViewSection({
    reservation,
    customerMap,
    displayPrice,
    displayDesignerName,
    displayDesignerColor,
    isNewCustomer,
    paymentCompleted,
    paymentLines,
    historyCount,
    serviceColorMap,
    onCustomerClick,
    onOpenHistory,
}: ReservationViewSectionProps) {
    const customer = customerMap[reservation.customerId];
    const isCancelled = reservation.status === 'cancelled';
    const isCompleted = reservation.status === 'completed';
    const isNoshow = reservation.status === 'noshow';
    const customerMemoTags = customer?.memoTags ?? [];

    return (
        <StyledDetailBody>
            <StyledDetailBodyInner>
                <dl>
                    {isCancelled && (
                        <>
                            <dt>상태</dt>
                            <dd><StyledStatusBadge $variant="neutral">예약취소</StyledStatusBadge></dd>
                        </>
                    )}
                    {isNoshow && (
                        <>
                            <dt>상태</dt>
                            <dd><StyledStatusBadge $variant="danger">노쇼</StyledStatusBadge></dd>
                        </>
                    )}
                    {isCompleted && (
                        <>
                            <dt>상태</dt>
                            <dd><StyledStatusBadge $variant="success">완료</StyledStatusBadge></dd>
                        </>
                    )}
                    <dt>날짜</dt>
                    <dd>{reservation.date}</dd>
                    <dt>시간</dt>
                    <dd>{reservation.startTime} ~ {reservation.endTime}</dd>
                    <dt>서비스</dt>
                    <dd>
                        <StyledServiceChipList service={reservation.service}
                                              serviceColorMap={serviceColorMap}
                                              keyPrefix={reservation.id} />
                    </dd>
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
                        {reservation.naverBookingId && reservation.naverDeposit != null && reservation.naverDeposit > 0 && (
                            <StyledNaverDepositLine>
                                <StyledNaverLogo viewBox="0 0 20 20" width="14" height="14">
                                    <rect width="20" height="20" rx="4" fill="#03C75A" />
                                    <path d="M11.7 13.1L8.1 8.2V13.1H6V6h2.4l3.5 4.8V6H14v7.1h-2.3z" fill="#fff" />
                                </StyledNaverLogo>
                                <span>네이버 예약 확정 예약금</span>
                                <span>{formatPrice(reservation.naverDeposit)}</span>
                            </StyledNaverDepositLine>
                        )}
                    </dd>
                    <dt>고객명</dt>
                    <dd>
                        <StyledCustomerButton type="button" onClick={() => onCustomerClick(reservation.customerId)}>
                            {isNewCustomer && <NewCustomerBadge>N</NewCustomerBadge>}
                            {customer?.name ?? '-'}
                        </StyledCustomerButton>
                    </dd>
                    <dt>연락처</dt>
                    <dd>{customer?.tel ? <StyledTelLink href={`tel:${customer.tel}`}>{formatTel(customer.tel)}</StyledTelLink> : '-'}</dd>
                    {customerMemoTags.length > 0 && (
                        <>
                            <dt>고객 메모</dt>
                            <dd>
                                <StyledMemoTagList>
                                    {customerMemoTags.map((tag) => (
                                        <StyledMemoTag key={`${reservation.id}-${tag.text}`} $color={tag.color}>
                                            {tag.text}
                                        </StyledMemoTag>
                                    ))}
                                </StyledMemoTagList>
                            </dd>
                        </>
                    )}
                    {reservation.memo?.trim() && (
                        <>
                            <dt>요청사항</dt>
                            <dd>{reservation.memo.trim()}</dd>
                        </>
                    )}
                    <dt>적립금</dt>
                    <dd>{formatPrice(customer?.points ?? 0)}</dd>
                    <dt>디자이너</dt>
                    <dd>
                        <DesignerLabel color={displayDesignerColor} name={displayDesignerName} />
                    </dd>
                    <dt>예약경로</dt>
                    <dd>
                        {reservation.naverBookingId ? (
                            <>
                                <StyledBookingInfo>
                                    <StyledPlatformTag>네이버예약</StyledPlatformTag>
                                    <span>{reservation.naverBookingId}</span>
                                    {reservation.naverBookingUrl && (
                                        <StyledBookingLink href={reservation.naverBookingUrl} target="_blank" rel="noopener noreferrer">
                                            바로가기 ↗
                                        </StyledBookingLink>
                                    )}
                                </StyledBookingInfo>
                                <StyledBookingNotice>
                                    네이버예약의 실제 변경/취소는 스마트플레이스 통해서 가능합니다.
                                </StyledBookingNotice>
                            </>
                        ) : (
                            <StyledChannelTag>{reservation.channel === '현장방문' ? '현장방문' : '전화예약'}</StyledChannelTag>
                        )}
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

const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

const StyledCustomerButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: none;
    padding: 0;
    font-size: 13px;
    color: #4285F4;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        color: #1a73e8;
    }
    }
`;

const StyledPaymentValue = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    padding-bottom: 2px;
`;

const StyledPaymentLineList = styled.span`
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
`;

const StyledPaymentBadge = styled(LabelBadge).attrs<{ $completed: boolean }>((props) => ({
    $tone: props.$completed ? 'success' : 'warning',
    $shape: 'soft',
    $size: 'md',
}))<{ $completed: boolean }>`
    font-size: var(--small-font);
    font-weight: 600;
`;

const StyledServiceChipList = styled(ServiceChipList)``;

const StyledMemoTagList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const StyledBookingNotice = styled.p`
    margin: 8px 0 0;
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(3, 199, 90, 0.08);
    color: #0f5132;
    font-size: 12px;
    line-height: 1.45;
    word-break: keep-all;
`;

const StyledMemoTag = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 2px 8px;
    border-radius: 999px;
    background-color: ${(props) => props.$color};
    color: #fff;
    font-size: 11px;
    font-weight: 600;
`;

const StyledNaverDepositLine = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px 7px;
    border-radius: 6px;
    background: #f0faf4;
    border: 1px solid #d4edda;
    font-size: 12px;
    font-weight: 600;
    color: #333;
`;

const StyledNaverLogo = styled.svg`
    flex-shrink: 0;
`;

const StyledBookingInfo = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const StyledPlatformTag = styled(LabelBadge).attrs({
    $tone: 'brand',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

const StyledChannelTag = styled(LabelBadge).attrs({
    $tone: 'info',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

const StyledBookingLink = styled.a`
    font-size: 11px;
    color: #03C75A;
    font-weight: 600;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            text-decoration: underline;
        }
    }
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
    text-align: left;

    &::after {
        content: "\\203A";
        float: right;
        font-size: 16px;
        line-height: 1;
        color: var(--gray-color);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--black-color-10);
    }
    }
`;
