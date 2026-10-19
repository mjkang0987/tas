import React from 'react';

import styled from 'styled-components';

import {NewCustomerBadge} from '../../ui/NewCustomerBadge';
import {AssigneeLabel} from '../../ui/AssigneeLabel';
import {LabelBadge} from '../../ui/LabelBadge';
import {NaverBookingInfo} from '../../ui/NaverBookingInfo';
import {ServiceChipList} from '../../ui/ServiceChip';
import type {CustomerMap} from '../../../utils/customers';
import {formatTel} from '../../../utils/customers';
import type {PaymentEntry, Reservation} from '../../../utils/reservations';
import {formatPrice} from '../../../utils/services';
import {ReservationStatusBadge} from '../../ui/ReservationStatusBadge';
import {useStoreLabels} from '../../../hooks/useStoreLabels';
import {useCustomerBenefits} from '../../../hooks/useCustomerBenefits';
import {describeBenefitCoupon, describeBenefitMembership} from '../../../features/customers/benefits';
import {StyledBody, StyledBodyInner} from './ModalStyles';

interface ReservationViewSectionProps {
    reservation: Reservation;
    customerMap: CustomerMap;
    displayPrice: number;
    displayAssigneeName: string;
    displayAssigneeColor: string;
    isNewCustomer: boolean;
    paymentCompleted: boolean;
    paymentEntries: PaymentEntry[];
    historyCount: number;
    serviceColorMap: Record<string, string>;
    onCustomerClick: (customerId: number) => void;
    onOpenHistory: () => void;
}

export function ReservationViewSection({
    reservation,
    customerMap,
    displayPrice,
    displayAssigneeName,
    displayAssigneeColor,
    isNewCustomer,
    paymentCompleted,
    paymentEntries,
    historyCount,
    serviceColorMap,
    onCustomerClick,
    onOpenHistory,
}: ReservationViewSectionProps) {
    const labels = useStoreLabels();
    const customer = customerMap[reservation.customerId];
    const {benefits} = useCustomerBenefits(customer?.id);
    const isCancelled = reservation.status === 'cancelled';
    const isCompleted = reservation.status === 'completed';
    const isNoshow = reservation.status === 'noshow';
    const isRequested = reservation.status === 'requested';
    const customerMemoTags = customer?.memoTags ?? [];

    return (
        <StyledDetailBody>
            <StyledDetailBodyInner>
                <StyledDetailList>
                    {isCancelled && (
                        <>
                            <StyledTerm>상태</StyledTerm>
                            <StyledDesc><ReservationStatusBadge $type="cancelled">취소</ReservationStatusBadge></StyledDesc>
                        </>
                    )}
                    {isNoshow && (
                        <>
                            <StyledTerm>상태</StyledTerm>
                            <StyledDesc><ReservationStatusBadge $type="noshow">노쇼</ReservationStatusBadge></StyledDesc>
                        </>
                    )}
                    {isCompleted && (
                        <>
                            <StyledTerm>상태</StyledTerm>
                            <StyledDesc><ReservationStatusBadge $type="completed">완료</ReservationStatusBadge></StyledDesc>
                        </>
                    )}
                    {isRequested && (
                        <>
                            <StyledTerm>상태</StyledTerm>
                            <StyledDesc><ReservationStatusBadge $type="requested">확정대기</ReservationStatusBadge></StyledDesc>
                        </>
                    )}
                    <StyledTerm>날짜</StyledTerm>
                    <StyledDesc>{reservation.date}</StyledDesc>
                    <StyledTerm>시간</StyledTerm>
                    <StyledDesc>{reservation.startTime} ~ {reservation.endTime}</StyledDesc>
                    <StyledTerm>{labels.service}</StyledTerm>
                    <StyledDesc>
                        <StyledServiceChipList service={reservation.service}
                                              serviceColorMap={serviceColorMap}
                                              keyPrefix={reservation.id} />
                    </StyledDesc>
                    <StyledTerm>가격</StyledTerm>
                    <StyledDesc>{formatPrice(displayPrice)}</StyledDesc>
                    <StyledTerm>결제</StyledTerm>
                    <StyledDesc>
                        <StyledPaymentValue>
                            <ReservationStatusBadge $type={paymentCompleted ? 'paid' : 'unpaid'}>
                                {paymentCompleted ? '결제완료' : '미결제'}
                            </ReservationStatusBadge>
                            {/* 결제종류 왼쪽 · 금액 오른쪽으로 줄을 맞춘다. 미결제면 줄이 없다('미입력'은 배지와 같은 말이라 뺀다). */}
                            {paymentEntries.length > 0 && (
                                <StyledPaymentEntryList>
                                    {paymentEntries.map((entry, index) => (
                                        <StyledPaymentEntry key={`${entry.method}-${index}`}>
                                            <span>{entry.method}</span>
                                            <StyledPaymentAmount>{formatPrice(entry.amount)}</StyledPaymentAmount>
                                        </StyledPaymentEntry>
                                    ))}
                                </StyledPaymentEntryList>
                            )}
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
                    </StyledDesc>
                    <StyledTerm>고객명</StyledTerm>
                    <StyledDesc>
                        <StyledCustomerButton type="button" onClick={() => onCustomerClick(reservation.customerId)}>
                            {isNewCustomer && <NewCustomerBadge>신규</NewCustomerBadge>}
                            {customer?.name ?? '-'}
                        </StyledCustomerButton>
                    </StyledDesc>
                    <StyledTerm>연락처</StyledTerm>
                    <StyledDesc>{customer?.tel ? <StyledTelLink href={`tel:${customer.tel}`}>{formatTel(customer.tel)}</StyledTelLink> : '-'}</StyledDesc>
                    {customerMemoTags.length > 0 && (
                        <>
                            <StyledTerm>고객 메모</StyledTerm>
                            <StyledDesc>
                                <StyledMemoTagList>
                                    {customerMemoTags.map((tag) => (
                                        <StyledMemoTag key={`${reservation.id}-${tag.text}`} $color={tag.color}>
                                            {tag.text}
                                        </StyledMemoTag>
                                    ))}
                                </StyledMemoTagList>
                            </StyledDesc>
                        </>
                    )}
                    {reservation.memo?.trim() && (
                        <>
                            <StyledTerm>요청사항</StyledTerm>
                            <StyledDesc>{reservation.memo.trim()}</StyledDesc>
                        </>
                    )}
                    <StyledTerm>적립금</StyledTerm>
                    <StyledDesc>{formatPrice(customer?.points ?? 0)}</StyledDesc>
                    {benefits && benefits.memberships.length > 0 && (
                        <>
                            <StyledTerm>회원권</StyledTerm>
                            <StyledDesc>
                                {benefits.memberships.map((m) => <StyledBenefitLine key={m.id}><StyledBenefitName>{m.name}</StyledBenefitName><StyledBenefitDetail>{describeBenefitMembership(m)}</StyledBenefitDetail></StyledBenefitLine>)}
                            </StyledDesc>
                        </>
                    )}
                    {benefits && benefits.coupons.length > 0 && (
                        <>
                            <StyledTerm>쿠폰</StyledTerm>
                            <StyledDesc>
                                {benefits.coupons.map((c) => <StyledBenefitLine key={c.id}><StyledBenefitName>{c.name}</StyledBenefitName><StyledBenefitDetail>{describeBenefitCoupon(c)}</StyledBenefitDetail></StyledBenefitLine>)}
                            </StyledDesc>
                        </>
                    )}
                    <StyledTerm>{labels.assignee}</StyledTerm>
                    <StyledDesc>
                        <AssigneeLabel color={displayAssigneeColor} name={displayAssigneeName} />
                    </StyledDesc>
                    <StyledTerm>예약경로</StyledTerm>
                    <StyledDesc>
                        {reservation.naverBookingId ? (
                            <>
                                <NaverBookingInfo reservation={reservation} />
                                <StyledBookingNotice>
                                    네이버예약의 실제 변경/취소는 스마트플레이스 통해서 가능합니다.
                                </StyledBookingNotice>
                            </>
                        ) : (
                            <StyledChannelTag>{reservation.channel ?? '전화예약'}</StyledChannelTag>
                        )}
                    </StyledDesc>
                </StyledDetailList>
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

const StyledDetailBodyInner = styled(StyledBodyInner)``;

const StyledDetailList = styled.dl`
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr); /* 긴 값(회원권·쿠폰 한 줄)이 말줄임되도록 열이 내용만큼 늘지 않게 */
    gap: 8px 12px;
    margin: 0;
`;

const StyledTerm = styled.dt`
    font-size: var(--medium-font);
    color: var(--dark-gray-color);
    font-weight: 500;
`;

const StyledDesc = styled.dd`
    margin: 0;
    font-size: var(--medium-font);
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
    font-size: var(--medium-font);
    color: #4285F4;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        color: #1a73e8;
    }
    }
`;

const StyledPaymentValue = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding-bottom: 2px;
`;

const StyledPaymentEntryList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    max-width: 220px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const StyledPaymentEntry = styled.li`
    display: flex;
    justify-content: space-between;
    gap: 12px;
`;

const StyledPaymentAmount = styled.span`
    font-variant-numeric: tabular-nums;
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
    font-size: var(--small-font);
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
    font-size: var(--xsmall-font);
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
    font-size: var(--small-font);
    font-weight: 600;
    color: #333;
`;

const StyledNaverLogo = styled.svg`
    flex-shrink: 0;
`;

const StyledChannelTag = styled(LabelBadge).attrs({
    $tone: 'info',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: var(--tiny-font);
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
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    text-align: left;

    &::after {
        content: "\\203A";
        float: right;
        font-size: var(--large-font);
        line-height: 1;
        color: var(--gray-color);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        background-color: var(--black-color-10);
    }
    }
`;

/* 회원권·쿠폰 항목 하나 = 박스 하나: 이름(굵게) + 아래 할인·만료(작게). 무엇인지 알아야 쓰므로 자르지 않는다 */
const StyledBenefitLine = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--gray-color2);
    overflow-wrap: anywhere;

    & + & {
        margin-top: 6px;
    }
`;

const StyledBenefitName = styled.strong`
    font-weight: 600;
`;

const StyledBenefitDetail = styled.span`
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;
