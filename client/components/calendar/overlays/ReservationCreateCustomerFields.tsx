import React from 'react';

import styled from 'styled-components';

import type {Customer} from '../../../utils/customers';
import {StyledInlineError} from './ModalStyles';
import {CustomerAutocomplete} from '../../customers/CustomerAutocomplete';
import {formControlStyle} from '../../ui/FormControls';

interface ReservationCreateCustomerFieldsProps {
    customerId: number;
    customerQuery: string;
    showSuggestions: boolean;
    filteredCustomers: Customer[];
    customerTel: string;
    customerErrorMessage?: string;
    onChangeCustomerQuery: (value: string) => void;
    onFocusCustomerQuery: () => void;
    onBlurCustomerQuery: () => void;
    onSelectCustomer: (id: number) => void;
    onChangeCustomerTel: (value: string) => void;
}

// 예약 추가 고객 입력. 기존/신규 탭 없이 단일 입력으로 통합.
// - 고객명: 자동완성. 추천에서 고르면 기존 고객(연락처 자동 채움), 새 이름을 쓰면 신규.
// - 연락처: 항상 노출. 기존 선택 시 자동 채움, 신규 시 수동 입력.
export function ReservationCreateCustomerFields({
    customerId,
    customerQuery,
    showSuggestions,
    filteredCustomers,
    customerTel,
    customerErrorMessage,
    onChangeCustomerQuery,
    onFocusCustomerQuery,
    onBlurCustomerQuery,
    onSelectCustomer,
    onChangeCustomerTel,
}: ReservationCreateCustomerFieldsProps) {
    return (
        <StyledCustomerFields>
            <CustomerAutocomplete
                id="create-customer"
                label="고객명"
                placeholder="고객명 검색 또는 신규 입력"
                query={customerQuery}
                showSuggestions={showSuggestions}
                filteredCustomers={filteredCustomers}
                selectedId={customerId}
                onChangeQuery={onChangeCustomerQuery}
                onFocus={onFocusCustomerQuery}
                onBlur={onBlurCustomerQuery}
                onSelect={onSelectCustomer}
            />
            <StyledTelField htmlFor="create-customer-tel">
                <strong>연락처</strong>
                <StyledTelInput
                    id="create-customer-tel"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="01012345678"
                    value={customerTel}
                    onChange={(e) => onChangeCustomerTel(e.target.value)}
                />
            </StyledTelField>
            {customerErrorMessage && <StyledInlineError>{customerErrorMessage}</StyledInlineError>}
        </StyledCustomerFields>
    );
}

const StyledCustomerFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StyledTelField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;

  > strong {
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);
  }
`;

const StyledTelInput = styled.input`
  ${formControlStyle};
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--black-color);
  width: 100%;
  min-width: 0;
`;
