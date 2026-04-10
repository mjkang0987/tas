import {useEffect, useRef, useState} from 'react';

import type {CreateReservationInitial} from '../../../store/calendarStore';
import type {Reservation} from '../../../utils/reservations';
import {findOverlap} from '../../../utils/reservations';
import type {Customer, CustomerMap} from '../../../utils/customers';
import type {Designer} from '../../../utils/designers';
import {getDesignerAvailabilityError, splitDesignersByStatus} from '../../../utils/designers';
import {calcEndTime, joinServiceNames, sumDurationMinutes, sumPrice} from '../../../utils/services';
import type {ReservationDetailFormState} from './ReservationDetailSections';

type CustomerMode = 'existing' | 'new';

type UseReservationCreateFormParams = {
    initial: CreateReservationInitial;
    customerMap: CustomerMap;
    reservationMap: Record<string, Reservation[]>;
    designers: Designer[];
    addCustomer: (customer: Customer) => void;
    onSave: (reservation: Reservation) => void;
};

export function useReservationCreateForm({
    initial,
    customerMap,
    reservationMap,
    designers,
    addCustomer,
    onSave,
}: UseReservationCreateFormParams) {
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
        ? customers.filter((customer) => customer.name.includes(customerQuery) || customer.tel.includes(customerQuery))
        : customers;

    useEffect(() => {
        if (designerId === 0 && selectableDesigners.length > 0) {
            setDesignerId(selectableDesigners[0].id);
            setForm((prev) => ({...prev, designerId: selectableDesigners[0].id}));
        }
    }, [designerId, selectableDesigners]);

    const totalDuration = sumDurationMinutes(selectedServices);
    const totalPrice = sumPrice(selectedServices);

    const handleCustomerSelect = (id: number) => {
        const customer = customerMap[id];
        if (customer) {
            setCustomerId(id);
            setCustomerQuery(customer.name);
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
                ? prev.filter((service) => service !== serviceName)
                : [...prev, serviceName];

            const nextService = joinServiceNames(next);
            const duration = sumDurationMinutes(next);

            setForm((currentForm) => {
                const updated = {...currentForm, service: nextService};
                if (duration > 0) {
                    updated.endTime = calcEndTime(currentForm.startTime, duration);
                }
                return updated;
            });

            if (!isPriceManual) {
                setForm((prevForm) => ({...prevForm, price: sumPrice(next)}));
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

        const availabilityError = getDesignerAvailabilityError(
            designers,
            designerId,
            form.date,
            form.startTime,
            form.endTime
        );
        if (availabilityError) return availabilityError;

        const overlap = findOverlap(reservationMap, form.date, form.startTime, form.endTime);
        if (overlap) {
            const name = customerMap[overlap.customerId]?.name ?? '-';
            return `${name} 예약(${overlap.startTime}~${overlap.endTime})과 시간이 겹칩니다.`;
        }

        return '';
    };

    const handleSave = () => {
        const message = validate();
        if (message) {
            setError(message);
            return;
        }

        let nextCustomerId = customerId;

        if (customerMode === 'new') {
            const nextCustomer: Customer = {
                id: Date.now(),
                name: newCustomerName.trim(),
                tel: newCustomerTel.trim(),
                points: 0,
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

    return {
        activeDesigners,
        onLeaveDesigners,
        resignedDesigners,
        selectableDesigners,
        customerId,
        customerQuery,
        showSuggestions,
        customerMode,
        newCustomerName,
        newCustomerTel,
        designerId,
        selectedServices,
        form,
        error,
        filteredCustomers,
        totalDuration,
        totalPrice,
        setCustomerMode: (mode: CustomerMode) => {
            setCustomerMode(mode);
            setError('');
        },
        setNewCustomerName: (value: string) => {
            setNewCustomerName(value);
            setError('');
        },
        setNewCustomerTel: (value: string) => {
            setNewCustomerTel(value);
            setError('');
        },
        handleCustomerSelect,
        handleCustomerInputChange,
        handleCustomerFocus,
        handleCustomerBlur,
        handleServiceToggle,
        handleStartTimeChange,
        handleEndTimeChange,
        handlePriceChange: (value: string) => {
            const raw = value.replace(/[^0-9]/g, '');
            const num = raw === '' ? 0 : parseInt(raw, 10);
            setForm((prev) => ({...prev, price: num}));
            setIsPriceManual(true);
            setError('');
        },
        handleDesignerChange: (nextDesignerId: number) => {
            setDesignerId(nextDesignerId);
            setForm((prev) => ({...prev, designerId: nextDesignerId}));
            setError('');
        },
        handleFieldChange: (field: keyof ReservationDetailFormState, value: string) => {
            setForm((prev) => ({...prev, [field]: value}));
            setError('');
        },
        handleSave,
    };
}
