import React from 'react';

import styled from 'styled-components';

import type {Customer} from '../../../utils/customers';
import {formatTel} from '../../../utils/customers';
import {scrollContentStyle, scrollHintStyle, StyledInlineError} from './ModalStyles';

type CustomerMode = 'existing' | 'new';

interface ReservationCreateCustomerFieldsProps {
    customerMode: CustomerMode;
    customerId: number;
    customerQuery: string;
    showSuggestions: boolean;
    filteredCustomers: Customer[];
    newCustomerName: string;
    newCustomerTel: string;
    customerErrorMessage?: string;
    onChangeCustomerMode: (mode: CustomerMode) => void;
    onChangeCustomerQuery: (value: string) => void;
    onFocusCustomerQuery: () => void;
    onBlurCustomerQuery: () => void;
    onSelectCustomer: (id: number) => void;
    onChangeNewCustomerName: (value: string) => void;
    onChangeNewCustomerTel: (value: string) => void;
}

export function ReservationCreateCustomerFields({
    customerMode,
    customerId,
    customerQuery,
    showSuggestions,
    filteredCustomers,
    newCustomerName,
    newCustomerTel,
    customerErrorMessage,
    onChangeCustomerMode,
    onChangeCustomerQuery,
    onFocusCustomerQuery,
    onBlurCustomerQuery,
    onSelectCustomer,
    onChangeNewCustomerName,
    onChangeNewCustomerTel,
}: ReservationCreateCustomerFieldsProps) {
    return (
        <>
            <StyledCustomerModeTabs>
                <StyledCustomerModeButton
                    type="button"
                    $active={customerMode === 'existing'}
                    onClick={() => onChangeCustomerMode('existing')}
                >
                    기존 고객
                </StyledCustomerModeButton>
                <StyledCustomerModeButton
                    type="button"
                    $active={customerMode === 'new'}
                    onClick={() => onChangeCustomerMode('new')}
                >
                    신규 고객
                </StyledCustomerModeButton>
            </StyledCustomerModeTabs>
            {customerMode === 'existing' ? (
                <StyledAutocomplete>
                    <label htmlFor="create-customer">
                        <strong>고객</strong>
                        <input
                            id="create-customer"
                            type="text"
                            autoComplete="off"
                            placeholder="고객명 또는 연락처 검색"
                            value={customerQuery}
                            onChange={(e) => onChangeCustomerQuery(e.target.value)}
                            onFocus={onFocusCustomerQuery}
                            onBlur={onBlurCustomerQuery}
                        />
                    </label>
                    {showSuggestions && filteredCustomers.length > 0 && (
                        <StyledSuggestionWrap>
                            <StyledSuggestionList role="listbox" id="create-customer-listbox">
                                {filteredCustomers.map((customer) => (
                                    <StyledSuggestionItem
                                        key={customer.id}
                                        role="option"
                                        aria-selected={customer.id === customerId}
                                        onMouseDown={() => onSelectCustomer(customer.id)}
                                    >
                                        <span>{customer.name}</span>
                                        <span>{formatTel(customer.tel)}</span>
                                    </StyledSuggestionItem>
                                ))}
                            </StyledSuggestionList>
                        </StyledSuggestionWrap>
                    )}
                    {showSuggestions && customerQuery.trim() && filteredCustomers.length === 0 && (
                        <StyledSuggestionWrap>
                            <StyledSuggestionList>
                                <StyledNoResult>검색 결과 없음</StyledNoResult>
                            </StyledSuggestionList>
                        </StyledSuggestionWrap>
                    )}
                    {customerErrorMessage && <StyledInlineError>{customerErrorMessage}</StyledInlineError>}
                </StyledAutocomplete>
            ) : (
                <StyledNewCustomerFields>
                    <label htmlFor="create-new-customer-name">
                        <strong>고객명</strong>
                        <input
                            id="create-new-customer-name"
                            type="text"
                            placeholder="신규 고객명"
                            value={newCustomerName}
                            onChange={(e) => onChangeNewCustomerName(e.target.value)}
                        />
                    </label>
                    <label htmlFor="create-new-customer-tel">
                        <strong>연락처</strong>
                        <input
                            id="create-new-customer-tel"
                            type="tel"
                            placeholder="01012345678"
                            value={newCustomerTel}
                            onChange={(e) => onChangeNewCustomerTel(e.target.value)}
                        />
                    </label>
                    {customerErrorMessage && <StyledInlineError>{customerErrorMessage}</StyledInlineError>}
                </StyledNewCustomerFields>
            )}
        </>
    );
}

const StyledCustomerModeTabs = styled.div`
  display: flex;
  gap: 8px;
`;

const StyledCustomerModeButton = styled.button<{ $active: boolean }>`
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid ${({$active}) => $active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
  border-radius: 999px;
  background: ${({$active}) => $active ? 'var(--blue-color)' : 'var(--white-color)'};
  color: ${({$active}) => $active ? '#fff' : 'var(--dark-gray-color)'};
  font-size: 12px;
`;

const StyledNewCustomerFields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StyledAutocomplete = styled.div`
  position: relative;
`;

const StyledSuggestionWrap = styled.div`
  ${scrollHintStyle};
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  z-index: 10;
  margin: 4px 0 0;
  max-height: 160px;
  background-color: #fff;
  border: 1px solid var(--light-gray-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const StyledSuggestionList = styled.ul`
  ${scrollContentStyle};
  padding: 4px 0;
  list-style: none;
`;

const StyledSuggestionItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;

  > span:last-child {
    font-size: 11px;
    color: var(--gray-color);
  }

  &[aria-selected="true"] {
    background-color: var(--black-color-10);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: var(--black-color-10);
    }
  }
`;

const StyledNoResult = styled.li`
  padding: 8px 10px;
  font-size: 12px;
  color: var(--gray-color);
  text-align: center;
`;
