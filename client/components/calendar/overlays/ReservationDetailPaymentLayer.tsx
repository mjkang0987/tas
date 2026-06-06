import React from 'react';

import styled from 'styled-components';

import type {PaymentMethod} from '../../../utils/reservations';
import {formatPrice} from '../../../utils/services';
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
                    <StyledPaymentEntryList>
                        {paymentEntries.map((entry, index) => (
                            <StyledPaymentEntryRow key={`payment-entry-${index}`}>
                                <select
                                    id={`payment-entry-${index}-method`}
                                    value={entry.method}
                                    onChange={(e) => onChangeEntryMethod(index, e.target.value as PaymentMethod | '')}
                                >
                                    <option value="">결제종류</option>
                                    {paymentMethodOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                <input
                                    id={`payment-entry-${index}-amount`}
                                    type="text"
                                    inputMode="numeric"
                                    value={entry.amount}
                                    placeholder="금액"
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

const StyledPaymentLayer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const StyledPaymentMessage = styled.p`
    margin: 0;
    font-size: 13px;
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
    font-size: 12px;
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

    select,
    input {
        height: 30px;
        padding: 0 10px 0 4px;
        border: 1px solid var(--light-gray-color);
        border-radius: 4px;
        background: var(--white-color);
        font-size: 12px;
        color: var(--dark-gray-color);
        box-sizing: border-box;
    }

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StyledPaymentAddButton = styled.button`
    height: 30px;
    border: 1px dashed var(--light-gray-color);
    border-radius: 8px;
    background: none;
    color: var(--dark-gray-color);
    font-size: 12px;
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
    font-size: 12px;
`;

const StyledPaymentError = styled.p`
    margin: 0;
    font-size: 12px;
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
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledPointAwardInput = styled.input`
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    font-size: 12px;
    color: var(--dark-gray-color);
    box-sizing: border-box;
`;

const StyledExpectedAmount = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
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
    font-size: 11px;
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
    font-size: 11px;
    font-weight: 700;
`;
