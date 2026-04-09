import React from 'react';

import styled from 'styled-components';

import type {PaymentMethod} from '../../../utils/reservations';
import {StyledBody, StyledBodyInner} from './ModalStyles';
import type {PaymentEntryDraft} from './reservationDetailTypes';

type ReservationDetailPaymentLayerProps = {
    paymentEntries: PaymentEntryDraft[];
    error: string;
    paymentMethodOptions: PaymentMethod[];
    onChangeEntryMethod: (index: number, value: PaymentMethod | '') => void;
    onChangeEntryAmount: (index: number, value: string) => void;
    onRemoveEntry: (index: number) => void;
    onAddEntry: () => void;
};

export function ReservationDetailPaymentLayer({
    paymentEntries,
    error,
    paymentMethodOptions,
    onChangeEntryMethod,
    onChangeEntryAmount,
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
