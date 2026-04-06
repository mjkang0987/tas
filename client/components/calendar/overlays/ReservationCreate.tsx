import {useState, useRef, useEffect} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';
import type {CreateReservationInitial} from '../../../store/calendarStore';

import type {Reservation} from '../../../utils/reservations';
import {findOverlap} from '../../../utils/reservations';
import type {Customer, CustomerMap} from '../../../utils/customers';
import {splitDesignersByStatus} from '../../../utils/designers';

import {
    joinServiceNames,
    sumDurationMinutes,
    sumPrice,
    calcEndTime,
} from '../../../utils/services';

import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledBody,
    StyledError,
    StyledFooter,
    StyledActionButton,
} from './ModalStyles';
import {ReservationFormFields, type ReservationDetailFormState} from './ReservationDetailSections';

interface ReservationCreateProps {
    initial: CreateReservationInitial;
    customerMap: CustomerMap;
    onClose: () => void;
    onSave: (reservation: Reservation) => void;
}

type CustomerMode = 'existing' | 'new';

export const ReservationCreate = ({initial, customerMap, onClose, onSave}: ReservationCreateProps) => {
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const designers = useCalendarStore((s) => s.designers);
    const addCustomer = useCalendarStore((s) => s.addCustomer);
    const modalRoot = document.getElementById('modal-root');
    const {active: activeDesigners, onLeave: onLeaveDesigners, resigned: resignedDesigners} = splitDesignersByStatus(designers);
    const selectableDesigners = [...activeDesigners, ...onLeaveDesigners, ...resignedDesigners];

    const customers = Object.values(customerMap);

    const [customerId, setCustomerId] = useState<number>(0);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [customerMode, setCustomerMode] = useState<CustomerMode>('existing');
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerTel, setNewCustomerTel] = useState('');
    const [designerId, setDesignerId] = useState<number>(selectableDesigners[0]?.id ?? 0);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isPriceManual, setIsPriceManual] = useState(false);
    const [form, setForm] = useState<ReservationDetailFormState>({
        date: initial.date,
        startTime: initial.startTime,
        endTime: calcEndTime(initial.startTime, 30),
        service: '',
        designerId: selectableDesigners[0]?.id ?? 0,
        price: 0,
        memo: '',
    });
    const [isEndTimeManual, setIsEndTimeManual] = useState(false);
    const [error, setError] = useState('');

    const filteredCustomers = customerQuery.trim()
        ? customers.filter((c) =>
            c.name.includes(customerQuery) || c.tel.includes(customerQuery)
        )
        : customers;

    useEffect(() => {
        if (designerId === 0 && selectableDesigners.length > 0) {
            setDesignerId(selectableDesigners[0].id);
            setForm((prev) => ({...prev, designerId: selectableDesigners[0].id}));
        }
    }, [designerId, selectableDesigners]);

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

            const nextService = joinServiceNames(next);
            const duration = sumDurationMinutes(next);

            setForm((f) => {
                const updated = {...f, service: nextService};
                if (duration > 0) {
                    updated.endTime = calcEndTime(f.startTime, duration);
                }
                return updated;
            });

            if (!isPriceManual) {
                setForm((prev) => ({...prev, price: sumPrice(next)}));
            }

            setIsEndTimeManual(false);
            setError('');
            return next;
        });
    };

    const validate = (): string => {
        if (selectableDesigners.length > 0 && !designerId) return '디자이너를 선택해주세요.';
        if (customerMode === 'existing' && !customerId) return '고객을 선택해주세요.';
        if (customerMode === 'new' && !newCustomerName.trim()) return '신규 고객명을 입력해주세요.';
        if (customerMode === 'new' && !newCustomerTel.trim()) return '신규 고객 연락처를 입력해주세요.';
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

        let nextCustomerId = customerId;

        if (customerMode === 'new') {
            const nextCustomer: Customer = {
                id: Date.now(),
                name: newCustomerName.trim(),
                tel: newCustomerTel.trim(),
            };

            addCustomer(nextCustomer);
            nextCustomerId = nextCustomer.id;
        }

        const reservation: Reservation = {
            id: Date.now(),
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            service: form.service,
            customerId: nextCustomerId,
            ...(designerId ? {designerId} : {}),
            status: 'active',
            price: form.price,
            ...(form.memo.trim() && {memo: form.memo.trim()}),
        };

        onSave(reservation);
    };

    if (!modalRoot) return null;

    return createPortal(<StyledCreateOverlay onClick={onClose}
                                             role="dialog"
                                             aria-modal="true"
                                             aria-label="예약 추가">
        <StyledDetail onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <h3>예약 추가</h3>
                <button type="button" onClick={onClose} aria-label="닫기">&#x2715;</button>
            </StyledHeader>

            <StyledBody>
                <StyledCreateForm>
                    <StyledCustomerModeTabs>
                        <StyledCustomerModeButton
                            type="button"
                            $active={customerMode === 'existing'}
                            onClick={() => {
                                setCustomerMode('existing');
                                setError('');
                            }}
                        >
                            기존 고객
                        </StyledCustomerModeButton>
                        <StyledCustomerModeButton
                            type="button"
                            $active={customerMode === 'new'}
                            onClick={() => {
                                setCustomerMode('new');
                                setError('');
                            }}
                        >
                            신규 고객
                        </StyledCustomerModeButton>
                    </StyledCustomerModeTabs>
                    {customerMode === 'existing' ? (
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
                    ) : (
                        <StyledNewCustomerFields>
                            <label htmlFor="create-new-customer-name">
                                <strong>고객명</strong>
                                <input
                                    id="create-new-customer-name"
                                    type="text"
                                    placeholder="신규 고객명"
                                    value={newCustomerName}
                                    onChange={(e) => {
                                        setNewCustomerName(e.target.value);
                                        setError('');
                                    }}
                                />
                            </label>
                            <label htmlFor="create-new-customer-tel">
                                <strong>연락처</strong>
                                <input
                                    id="create-new-customer-tel"
                                    type="tel"
                                    placeholder="01012345678"
                                    value={newCustomerTel}
                                    onChange={(e) => {
                                        setNewCustomerTel(e.target.value);
                                        setError('');
                                    }}
                                />
                            </label>
                        </StyledNewCustomerFields>
                    )}
                    <ReservationFormFields
                        idPrefix="create"
                        form={{...form, designerId}}
                        selectableDesigners={selectableDesigners}
                        activeDesigners={activeDesigners}
                        onLeaveDesigners={onLeaveDesigners}
                        resignedDesigners={resignedDesigners}
                        selectedServices={selectedServices}
                        totalDuration={totalDuration}
                        totalPrice={totalPrice}
                        onServiceToggle={handleServiceToggle}
                        onPriceChange={(value) => {
                            const raw = value.replace(/[^0-9]/g, '');
                            const num = raw === '' ? 0 : parseInt(raw, 10);
                            setForm((prev) => ({...prev, price: num}));
                            setIsPriceManual(true);
                            setError('');
                        }}
                        onDesignerChange={(nextDesignerId) => {
                            setDesignerId(nextDesignerId);
                            setForm((prev) => ({...prev, designerId: nextDesignerId}));
                            setError('');
                        }}
                        onFieldChange={(field, value) => {
                            setForm((prev) => ({...prev, [field]: value}));
                            setError('');
                        }}
                        onStartTimeChange={handleStartTimeChange}
                        onEndTimeChange={handleEndTimeChange}
                    />
                </StyledCreateForm>
                {error && <StyledError>{error}</StyledError>}
            </StyledBody>

            <StyledFooter>
                <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                <StyledActionButton type="button" $primary onClick={handleSave}>저장</StyledActionButton>
            </StyledFooter>
        </StyledDetail>
    </StyledCreateOverlay>, modalRoot);
};

const StyledCreateOverlay = styled(StyledOverlay)`
  z-index: ${OVERLAY_Z_INDEX.base};
`;

const StyledCreateForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

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
  cursor: pointer;
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
  overscroll-behavior: auto;
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
