import React from 'react';

import styled from 'styled-components';

import type {PaymentMethod} from '../../../utils/reservations';
import {StyledBody, StyledBodyInner} from './ModalStyles';
import type {PaymentEntryDraft, PointAwardDraft} from './reservationDetailTypes';

type ReservationDetailPaymentLayerProps = {
    paymentEntries: PaymentEntryDraft[];
    pointAward: PointAwardDraft;
    showPointAward: boolean;
    error: string;
    paymentMethodOptions: PaymentMethod[];
    onChangeEntryMethod: (index: number, value: PaymentMethod | '') => void;
    onChangeEntryAmount: (index: number, value: string) => void;
    onTogglePointAward: (enabled: boolean) => void;
    onChangePointAwardAmount: (value: string) => void;
    onRemoveEntry: (index: number) => void;
    onAddEntry: () => void;
};

export function ReservationDetailPaymentLayer({
    paymentEntries,
    pointAward,
    showPointAward,
    error,
    paymentMethodOptions,
    onChangeEntryMethod,
    onChangeEntryAmount,
    onTogglePointAward,
    onChangePointAwardAmount,
    onRemoveEntry,
    onAddEntry,
}: ReservationDetailPaymentLayerProps) {
    return (
        <StyledBody>
            <StyledBodyInner>
                <StyledPaymentLayer>
                    <StyledPaymentMessage>결제 종류와 금액을 입력해 주세요.</StyledPaymentMessage>
                    <StyledPaymentEntryList>
                        {paymentEntries.map((entry, index) => (
                            <StyledPaymentEntryRow key={`payment-entry-${index}`}>
                                <select
                                    value={entry.method}
                                    onChange={(e) => onChangeEntryMethod(index, e.target.value as PaymentMethod | '')}
                                >
                                    <option value="">결제종류</option>
                                    {paymentMethodOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                <input
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
                            <StyledPointAwardToggle>
                                <input
                                    type="checkbox"
                                    checked={pointAward.enabled}
                                    onChange={(e) => onTogglePointAward(e.target.checked)}
                                />
                                <span>적립 적용</span>
                            </StyledPointAwardToggle>
                            <StyledPointAwardInput
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

const StyledPaymentEntryList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledPaymentEntryRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
    gap: 8px;

    select,
    input {
        height: 30px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
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
    cursor: pointer;
`;

const StyledPaymentRemoveButton = styled.button`
    min-width: 52px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: 8px;
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 12px;
    cursor: pointer;
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
