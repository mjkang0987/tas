import styled from 'styled-components';

import type {Customer} from '../../utils/customers';
import {formatTel} from '../../utils/customers';
import {formControlStyle} from '../ui/FormControls';
import {scrollContentStyle, scrollHintStyle} from '../calendar/overlays/ModalStyles';

interface CustomerAutocompleteProps {
    id: string;
    label?: string;
    placeholder?: string;
    query: string;
    showSuggestions: boolean;
    filteredCustomers: Customer[];
    selectedId: number;
    onChangeQuery: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onSelect: (id: number) => void;
}

// 고객명/연락처로 검색해 한 명을 고르는 자동완성 입력.
// 예약 생성·회원권 발급 등에서 공용으로 쓴다(셀렉트 대체).
export function CustomerAutocomplete({
    id,
    label = '고객',
    placeholder = '고객명 또는 연락처 검색',
    query,
    showSuggestions,
    filteredCustomers,
    selectedId,
    onChangeQuery,
    onFocus,
    onBlur,
    onSelect,
}: CustomerAutocompleteProps) {
    return (
        <StyledAutocomplete>
            <label htmlFor={id}>
                <strong>{label}</strong>
                <StyledInput
                    id={id}
                    type="text"
                    autoComplete="off"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => onChangeQuery(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
            </label>
            {showSuggestions && filteredCustomers.length > 0 && (
                <StyledSuggestionWrap>
                    <StyledSuggestionList role="listbox" id={`${id}-listbox`}>
                        {filteredCustomers.map((customer) => (
                            <StyledSuggestionItem
                                key={customer.id}
                                role="option"
                                aria-selected={customer.id === selectedId}
                                onMouseDown={() => onSelect(customer.id)}
                            >
                                <StyledSuggestionName>{customer.name}</StyledSuggestionName>
                                <StyledSuggestionTel>{formatTel(customer.tel)}</StyledSuggestionTel>
                            </StyledSuggestionItem>
                        ))}
                    </StyledSuggestionList>
                </StyledSuggestionWrap>
            )}
            {showSuggestions && query.trim() && filteredCustomers.length === 0 && (
                <StyledSuggestionWrap>
                    <StyledSuggestionList>
                        <StyledNoResult>검색 결과 없음</StyledNoResult>
                    </StyledSuggestionList>
                </StyledSuggestionWrap>
            )}
        </StyledAutocomplete>
    );
}

const StyledAutocomplete = styled.div`
  position: relative;
  min-width: 0;

  > label {
    display: flex;
    flex-direction: column;
    gap: 4px;

    > strong {
      font-size: 12px;
      font-weight: 600;
      color: var(--dark-gray-color);
    }
  }
`;

const StyledInput = styled.input`
  ${formControlStyle};
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--black-color);
  width: 100%;
  min-width: 0;
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
  background-color: var(--white-color);
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

  &[aria-selected="true"] {
    background-color: var(--black-color-10);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: var(--black-color-10);
    }
  }
`;

const StyledSuggestionName = styled.span`
  font-weight: 500;
`;

const StyledSuggestionTel = styled.span`
  font-size: 12px;
  color: var(--dark-gray-color2);
  font-variant-numeric: tabular-nums;
`;

const StyledNoResult = styled.li`
  padding: 8px 10px;
  font-size: 12px;
  color: var(--gray-color);
  text-align: center;
`;
