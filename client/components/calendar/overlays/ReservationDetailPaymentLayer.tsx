import React from 'react';

import styled, {css} from 'styled-components';

import type {PaymentMethod} from '../../../utils/reservations';
import {formatPrice} from '../../../utils/services';
import {computeCouponDiscount, describeCouponDiscount} from '../../../features/coupons/model';
import type {BenefitCoupon} from '../../../features/customers/benefits';
import {StyledBody, StyledBodyInner} from './ModalStyles';
import type {PaymentEntryDraft, PointAwardDraft} from './reservationDetailTypes';

type ReservationDetailPaymentLayerProps = {
    paymentEntries: PaymentEntryDraft[];
    pointAward: PointAwardDraft;
    customerPoints: number;
    showPointAward: boolean;
    error: string;
    paymentMethodOptions: PaymentMethod[];
    totalPrice: number;
    naverDeposit: number;
    onChangeEntryMethod: (index: number, value: PaymentMethod | '') => void;
    onChangeEntryAmount: (index: number, value: string) => void;
    onTogglePointAward: (enabled: boolean) => void;
    onChangePointAwardAmount: (value: string) => void;
    /** 이 고객이 쓸 수 있는 쿠폰(+이 예약에 이미 쓴 쿠폰). 비어 있으면 쿠폰 칸을 숨긴다 */
    couponOptions: BenefitCoupon[];
    selectedCouponId: string;
    onSelectCoupon: (couponId: string) => void;
    onRemoveEntry: (index: number) => void;
    onAddEntry: () => void;
    onNavigateToPoints: () => void;
};

export function ReservationDetailPaymentLayer({
    paymentEntries,
    pointAward,
    customerPoints,
    showPointAward,
    error,
    paymentMethodOptions,
    totalPrice,
    naverDeposit,
    couponOptions,
    selectedCouponId,
    onSelectCoupon,
    onChangeEntryMethod,
    onChangeEntryAmount,
    onTogglePointAward,
    onChangePointAwardAmount,
    onRemoveEntry,
    onAddEntry,
    onNavigateToPoints,
}: ReservationDetailPaymentLayerProps) {
    const expectedAmount = totalPrice - naverDeposit;

    return (
        <StyledBody>
            <StyledBodyInner>
                <StyledPaymentLayer>
                    <StyledPaymentSummary>
                        <StyledPaymentMessage>결제 종류와 금액을 입력해 주세요.</StyledPaymentMessage>
                        <StyledPointBalance type="button" onClick={onNavigateToPoints}>보유 적립금 {formatPrice(customerPoints)}</StyledPointBalance>
                    </StyledPaymentSummary>
                    <StyledExpectedAmount>
                        <span>서비스 금액 {formatPrice(totalPrice)}</span>
                        {naverDeposit > 0 && (
                            <>
                                <StyledNaverDeposit>네이버 예약금 -{formatPrice(naverDeposit)}</StyledNaverDeposit>
                                <StyledExpectedTotal>실결제 {formatPrice(expectedAmount)}</StyledExpectedTotal>
                            </>
                        )}
                    </StyledExpectedAmount>
                    {couponOptions.length > 0 && (
                        <StyledCouponField htmlFor="payment-coupon">
                            <span>쿠폰</span>
                            <StyledPaymentEntrySelect
                                id="payment-coupon"
                                value={selectedCouponId}
                                onChange={(e) => onSelectCoupon(e.target.value)}
                            >
                                <option value="">쿠폰 사용 안 함</option>
                                {couponOptions.map((coupon) => {
                                    // 최소 결제금액에 못 미치면 고를 수 없게 이유와 함께 막는다.
                                    const usable = computeCouponDiscount(coupon, expectedAmount) != null;
                                    return (
                                        <option key={coupon.id} value={coupon.id} disabled={!usable}>
                                            {coupon.name} · {describeCouponDiscount(coupon)}
                                            {!usable && coupon.minOrderAmount != null ? ` (${formatPrice(coupon.minOrderAmount)} 이상)` : ''}
                                        </option>
                                    );
                                })}
                            </StyledPaymentEntrySelect>
                        </StyledCouponField>
                    )}
                    <StyledPaymentEntryList>
                        {paymentEntries.map((entry, index) => (
                            <StyledPaymentEntryRow key={`payment-entry-${index}`}>
                                <StyledPaymentEntrySelect
                                    id={`payment-entry-${index}-method`}
                                    value={entry.method}
                                    // 쿠폰 줄은 종류·금액을 쿠폰이 정한다 — 바꾸려면 위 쿠폰 칸에서.
                                    disabled={!!entry.couponId}
                                    aria-label={entry.couponId ? '쿠폰 할인' : undefined}
                                    onChange={(e) => onChangeEntryMethod(index, e.target.value as PaymentMethod | '')}
                                >
                                    <option value="">결제종류</option>
                                    {paymentMethodOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </StyledPaymentEntrySelect>
                                <StyledPaymentEntryInput
                                    id={`payment-entry-${index}-amount`}
                                    type="text"
                                    inputMode="numeric"
                                    value={entry.amount}
                                    placeholder="금액"
                                    readOnly={!!entry.couponId}
                                    onChange={(e) => onChangeEntryAmount(index, e.target.value)}
                                />
                                <StyledPaymentRemoveButton
                                    type="button"
                                    onClick={() => onRemoveEntry(index)}
                                >
                                    삭제
                                </StyledPaymentRemoveButton>
                            </StyledPaymentEntryRow>
                        ))}
                    </StyledPaymentEntryList>
                    <StyledPaymentAddButton type="button" onClick={onAddEntry}>
                        결제수단 추가
                    </StyledPaymentAddButton>
                    {showPointAward && (
                        <StyledPointAwardBox>
                            <StyledPointAwardToggle htmlFor="payment-point-award-toggle">
                                <input
                                    id="payment-point-award-toggle"
                                    type="checkbox"
                                    checked={pointAward.enabled}
                                    onChange={(e) => onTogglePointAward(e.target.checked)}
                                />
                                <span>적립 적용</span>
                            </StyledPointAwardToggle>
                            <StyledPointAwardInput
                                id="payment-point-award-amount"
                                type="text"
                                inputMode="numeric"
                                value={pointAward.amount}
                                placeholder="적립 금액"
                                disabled={!pointAward.enabled}
                                onChange={(e) => onChangePointAwardAmount(e.target.value)}
                            />
                        </StyledPointAwardBox>
                    )}
                    {error && <StyledPaymentError>{error}</StyledPaymentError>}
                </StyledPaymentLayer>
            </StyledBodyInner>
        </StyledBody>
    );
}

const StyledCouponField = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledPaymentLayer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const StyledPaymentMessage = styled.p`
    margin: 0;
    font-size: var(--medium-font);
    color: var(--dark-gray-color);
`;

const StyledPaymentSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

const StyledPointBalance = styled.button`
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border: none;
    border-radius: 999px;
    background: #f5efe3;
    color: #8a5a00;
    font-size: var(--small-font);
    font-weight: 700;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: #efe5d4;
        }
    }
`;

const StyledPaymentEntryList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledPaymentEntryRow = styled.div`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 4px;

    /* 모바일: 결제종류는 윗줄 전체, 금액과 삭제는 아랫줄에 나란히 (삭제가 한 줄 전체 빨간 블록이 되지 않게) */
    @media (max-width: 640px) {
        grid-template-columns: minmax(0, 1fr) auto;
    }
`;

const paymentEntryFieldStyles = css`
    height: 30px;
    padding: 0 10px 0 4px;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    background: var(--white-color);
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    box-sizing: border-box;
`;

const StyledPaymentEntrySelect = styled.select`
    ${paymentEntryFieldStyles}

    @media (max-width: 640px) {
        grid-column: 1 / -1;
    }
`;

const StyledPaymentEntryInput = styled.input`
    ${paymentEntryFieldStyles}
`;

const StyledPaymentAddButton = styled.button`
    height: 30px;
    border: 1px dashed var(--light-gray-color);
    border-radius: 8px;
    background: none;
    color: var(--dark-gray-color);
    font-size: var(--small-font);
    font-weight: 600;
`;

const StyledPaymentRemoveButton = styled.button`
    min-width: 52px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: var(--small-font);
`;

const StyledPaymentError = styled.p`
    margin: 0;
    font-size: var(--small-font);
    color: var(--danger-color);
`;

const StyledPointAwardBox = styled.div`
    display: grid;
    grid-template-columns: auto minmax(0, 140px);
    gap: 8px;
    align-items: center;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledPointAwardToggle = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledPointAwardInput = styled.input`
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    box-sizing: border-box;
`;

const StyledExpectedAmount = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: var(--small-font);
    color: var(--dark-gray-color);
    font-weight: 600;
`;

const StyledNaverDeposit = styled.span`
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    background: #e8f5e9;
    color: #2e7d32;
    font-size: var(--xsmall-font);
    font-weight: 700;
`;

const StyledExpectedTotal = styled.span`
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    background: #e3f2fd;
    color: #1565c0;
    font-size: var(--xsmall-font);
    font-weight: 700;
`;
