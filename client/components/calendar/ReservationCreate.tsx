import {useState, useRef} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {CreateReservationInitial} from '../../store/calendarStore';

import type {Reservation} from '../../utils/reservations';
import {findOverlap} from '../../utils/reservations';
import type {CustomerMap} from '../../utils/customers';

import {
    joinServiceNames,
    sumDurationMinutes,
    sumPrice,
    formatPrice,
    calcEndTime,
} from '../../utils/services';

import {
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledBody,
    StyledForm,
    StyledFieldRow,
    StyledError,
    StyledFooter,
    StyledActionButton,
    StyledPriceRow,
    StyledPriceUnit,
} from './ModalStyles';

import {ServiceFields} from './ServiceFields';

interface ReservationCreateProps {
    initial: CreateReservationInitial;
    customerMap: CustomerMap;
    onClose: () => void;
    onSave: (reservation: Reservation) => void;
}

export const ReservationCreate = ({initial, customerMap, onClose, onSave}: ReservationCreateProps) => {
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const modalRoot = document.getElementById('modal-root');

    const customers = Object.values(customerMap);

    const [customerId, setCustomerId] = useState<number>(0);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [price, setPrice] = useState(0);
    const [isPriceManual, setIsPriceManual] = useState(false);
    const [form, setForm] = useState({
        date: initial.date,
        startTime: initial.startTime,
        endTime: calcEndTime(initial.startTime, 30),
    });
    const [memo, setMemo] = useState('');
    const [isEndTimeManual, setIsEndTimeManual] = useState(false);
    const [error, setError] = useState('');

    const filteredCustomers = customerQuery.trim()
        ? customers.filter((c) =>
            c.name.includes(customerQuery) || c.tel.includes(customerQuery)
        )
        : customers;

    const handleCustomerSelect = (id: number) => {
        const c = customerMap[id];
        if (c) {
            setCustomerId(id);
            setCustomerQuery(c.name);
        }
        setShowSuggestions(false);
        setError('');
    };

    const handleCustomerInputChange = (value: string) => {
        setCustomerQuery(value);
        setCustomerId(0);
        setShowSuggestions(true);
        setError('');
    };

    const handleCustomerFocus = () => {
        clearTimeout(blurTimerRef.current);
        setShowSuggestions(true);
    };

    const handleCustomerBlur = () => {
        blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 150);
    };

    const totalDuration = sumDurationMinutes(selectedServices);
    const totalPrice = sumPrice(selectedServices);

    const handleStartTimeChange = (value: string) => {
        setForm((prev) => {
            const next = {...prev, startTime: value};

            if (!isEndTimeManual && selectedServices.length > 0) {
                const duration = sumDurationMinutes(selectedServices);
                if (duration > 0) {
                    next.endTime = calcEndTime(value, duration);
                }
            }

            return next;
        });
        setError('');
    };

    const handleEndTimeChange = (value: string) => {
        setIsEndTimeManual(true);
        setForm((prev) => ({...prev, endTime: value}));
        setError('');
    };

    const handleServiceToggle = (serviceName: string) => {
        setSelectedServices((prev) => {
            const next = prev.includes(serviceName)
                ? prev.filter((s) => s !== serviceName)
                : [...prev, serviceName];

            const duration = sumDurationMinutes(next);

            setForm((f) => {
                const updated = {...f};
                if (duration > 0) {
                    updated.endTime = calcEndTime(f.startTime, duration);
                }
                return updated;
            });

            if (!isPriceManual) {
                setPrice(sumPrice(next));
            }

            setIsEndTimeManual(false);
            setError('');
            return next;
        });
    };

    const validate = (): string => {
        if (!customerId) return '고객을 선택해주세요.';
        if (selectedServices.length === 0) return '시술을 선택해주세요.';
        if (!form.date) return '날짜를 선택해주세요.';
        if (!form.startTime) return '시작 시간을 입력해주세요.';
        if (!form.endTime) return '종료 시간을 입력해주세요.';
        if (form.startTime >= form.endTime) return '시작 시간은 종료 시간보다 앞서야 합니다.';

        const overlap = findOverlap(reservationMap, form.date, form.startTime, form.endTime);

        if (overlap) {
            const name = customerMap[overlap.customerId]?.name ?? '-';
            return `${name} 예약(${overlap.startTime}~${overlap.endTime})과 시간이 겹칩니다.`;
        }

        return '';
    };

    const handleSave = () => {
        const msg = validate();
        if (msg) {
            setError(msg);
            return;
        }

        const reservation: Reservation = {
            id: Date.now(),
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            service: joinServiceNames(selectedServices),
            customerId,
            status: 'active',
            price,
            ...(memo.trim() && {memo: memo.trim()}),
        };

        onSave(reservation);
    };

    if (!modalRoot) return null;

    return createPortal(<StyledOverlay onClick={onClose}
                                       role="dialog"
                                       aria-modal="true"
                                       aria-label="예약 추가">
        <StyledDetail onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <h3>예약 추가</h3>
                <button type="button" onClick={onClose} aria-label="닫기">&#x2715;</button>
            </StyledHeader>

            <StyledBody>
                <StyledForm>
                    <StyledAutocomplete>
                        <label htmlFor="create-customer">
                            <strong>고객</strong>
                            <input id="create-customer"
                                   type="text"
                                   autoComplete="off"
                                   placeholder="고객명 또는 연락처 검색"
                                   value={customerQuery}
                                   onChange={(e) => handleCustomerInputChange(e.target.value)}
                                   onFocus={handleCustomerFocus}
                                   onBlur={handleCustomerBlur}/>
                        </label>
                        {showSuggestions && filteredCustomers.length > 0 && (
                            <StyledSuggestionList role="listbox" id="create-customer-listbox">
                                {filteredCustomers.map((c) => (
                                    <StyledSuggestionItem key={c.id}
                                                          role="option"
                                                          aria-selected={c.id === customerId}
                                                          onMouseDown={() => handleCustomerSelect(c.id)}>
                                        <span>{c.name}</span>
                                        <span>{c.tel}</span>
                                    </StyledSuggestionItem>
                                ))}
                            </StyledSuggestionList>
                        )}
                        {showSuggestions && customerQuery.trim() && filteredCustomers.length === 0 && (
                            <StyledSuggestionList>
                                <StyledNoResult>검색 결과 없음</StyledNoResult>
                            </StyledSuggestionList>
                        )}
                    </StyledAutocomplete>
                    <StyledFieldRow role="group" aria-labelledby="create-service-label">
                        <strong id="create-service-label">시술</strong>
                        <ServiceFields idPrefix="create"
                                       selectedServices={selectedServices}
                                       onServiceToggle={handleServiceToggle}
                                       totalDuration={totalDuration}
                                       totalPrice={totalPrice}/>
                    </StyledFieldRow>
                    <label htmlFor="create-price">
                        <strong>가격</strong>
                        <StyledPriceRow>
                            <input id="create-price"
                                   type="text"
                                   inputMode="numeric"
                                   value={price.toLocaleString('ko-KR')}
                                   onChange={(e) => {
                                       const raw = e.target.value.replace(/[^0-9]/g, '');
                                       const num = raw === '' ? 0 : parseInt(raw, 10);
                                       setPrice(num);
                                       setIsPriceManual(true);
                                       setError('');
                                   }}/>
                            <StyledPriceUnit>원</StyledPriceUnit>
                        </StyledPriceRow>
                    </label>
                    <label htmlFor="create-date">
                        <strong>날짜</strong>
                        <input id="create-date"
                               type="date"
                               value={form.date}
                               onChange={(e) => { setForm((f) => ({...f, date: e.target.value})); setError(''); }}/>
                    </label>
                    <label htmlFor="create-startTime">
                        <strong>시작</strong>
                        <input id="create-startTime"
                               type="time"
                               value={form.startTime}
                               onChange={(e) => handleStartTimeChange(e.target.value)}/>
                    </label>
                    <label htmlFor="create-endTime">
                        <strong>종료</strong>
                        <input id="create-endTime"
                               type="time"
                               value={form.endTime}
                               onChange={(e) => handleEndTimeChange(e.target.value)}/>
                    </label>
                    <label htmlFor="create-memo">
                        <strong>메모</strong>
                        <StyledMemo id="create-memo"
                                    placeholder="특이사항, 요청사항 등"
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    rows={2}/>
                    </label>
                </StyledForm>
                {error && <StyledError>{error}</StyledError>}
            </StyledBody>

            <StyledFooter>
                <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={handleSave}>저장</StyledActionButton>
            </StyledFooter>
        </StyledDetail>
    </StyledOverlay>, modalRoot);
};

const StyledAutocomplete = styled.div`
  position: relative;
`;

const StyledSuggestionList = styled.ul`
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  z-index: 10;
  margin: 4px 0 0;
  padding: 4px 0;
  list-style: none;
  background-color: #fff;
  border: 1px solid var(--light-gray-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 160px;
  overflow-y: auto;
  overscroll-behavior: contain;
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

  &:hover,
  &[aria-selected="true"] {
    background-color: var(--black-color-10);
  }
`;

const StyledNoResult = styled.li`
  padding: 8px 10px;
  font-size: 12px;
  color: var(--gray-color);
  text-align: center;
`;

const StyledMemo = styled.textarea`
  width: 100%;
  padding: var(--gap-md);
  border: 1px solid var(--light-gray-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  outline: none;

  &:focus {
    border-color: var(--blue-color);
  }

  &::placeholder {
    color: var(--gray-color);
  }
`;

