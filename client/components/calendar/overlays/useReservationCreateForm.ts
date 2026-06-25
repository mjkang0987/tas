import {useMemo, useRef, useState} from 'react';

import type {CreateReservationInitial} from '../../../store/calendarStore';
import {useCalendarStore} from '../../../store/calendarStore';
import type {Reservation, ReservationChannel} from '../../../utils/reservations';
import {findOverlap} from '../../../utils/reservations';
import type {Customer, CustomerMap} from '../../../utils/customers';
import type {Assignee} from '../../../utils/assignees';
import {getAssigneeAvailabilityState, splitAssigneesByStatus} from '../../../utils/assignees';
import {buildCatalogMap, calcEndTime, joinServiceNames, sumDurationMinutes, sumPrice} from '../../../utils/services';
import type {ReservationDetailFormState, ReservationFieldError} from './ReservationDetailSections';
type CustomerMode = 'existing' | 'new';

const KOREAN_MOBILE_PHONE_PATTERN = /^01[016789]\d{7,8}$/;

type UseReservationCreateFormParams = {
    initial: CreateReservationInitial;
    customerMap: CustomerMap;
    reservationMap: Record<string, Reservation[]>;
    assignees: Assignee[];
    addCustomer: (customer: Customer) => void;
    onSave: (reservation: Reservation) => void;
};

function getNextNumericId(values: number[]): number {
    const max = values.reduce((currentMax, value) => (
        Number.isInteger(value) && value > currentMax ? value : currentMax
    ), 0);
    return max + 1;
}

export function useReservationCreateForm({
    initial,
    customerMap,
    reservationMap,
    assignees,
    addCustomer,
    onSave,
}: UseReservationCreateFormParams) {
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const catalogMap = useMemo(() => buildCatalogMap(serviceCatalog), [serviceCatalog]);

    const {active: activeAssignees, onLeave: onLeaveAssignees, resigned: resignedAssignees} = splitAssigneesByStatus(assignees);
    const defaultAssigneeId = activeAssignees[0]?.id ?? 0;
    const customers = Object.values(customerMap);
    const nextCustomerId = getNextNumericId(customers.map((customer) => customer.id));
    const nextReservationId = getNextNumericId(
        Object.values(reservationMap).flat().map((reservation) => reservation.id)
    );

    const [customerId, setCustomerId] = useState<number>(0);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [customerMode, setCustomerMode] = useState<CustomerMode>('existing');
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerTel, setNewCustomerTel] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isPriceManual, setIsPriceManual] = useState(false);
    const [form, setForm] = useState({
        date: initial.date,
        startTime: initial.startTime,
        endTime: calcEndTime(initial.startTime, 30),
        service: '',
        assigneeId: defaultAssigneeId,
        price: 0,
        memo: '',
        channel: '전화예약' as ReservationChannel,
    });
    const [isEndTimeManual, setIsEndTimeManual] = useState(false);
    const [error, setError] = useState<ReservationFieldError | null>(null);

    const filteredCustomers = customerQuery.trim()
        ? customers.filter((customer) => customer.name.includes(customerQuery) || customer.tel.includes(customerQuery))
        : customers;

    const totalDuration = sumDurationMinutes(selectedServices, catalogMap);
    const totalPrice = sumPrice(selectedServices, catalogMap);

    const handleCustomerSelect = (id: number) => {
        const customer = customerMap[id];
        if (customer) {
            setCustomerId(id);
            setCustomerQuery(customer.name);
        }
        setShowSuggestions(false);
        setError(null);
    };

    const handleCustomerInputChange = (value: string) => {
        setCustomerQuery(value);
        setCustomerId(0);
        setShowSuggestions(true);
        setError(null);
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
                const duration = sumDurationMinutes(selectedServices, catalogMap);
                if (duration > 0) {
                    next.endTime = calcEndTime(value, duration);
                }
            }

            return next;
        });
        setError(null);
    };

    const handleEndTimeChange = (value: string) => {
        setIsEndTimeManual(true);
        setForm((prev) => ({...prev, endTime: value}));
        setError(null);
    };

    const handleServiceToggle = (serviceName: string) => {
        setSelectedServices((prev) => {
            const next = prev.includes(serviceName)
                ? prev.filter((service) => service !== serviceName)
                : [...prev, serviceName];

            const nextService = joinServiceNames(next);
            const duration = sumDurationMinutes(next, catalogMap);

            setForm((currentForm) => {
                const updated = {...currentForm, service: nextService};
                if (duration > 0) {
                    updated.endTime = calcEndTime(currentForm.startTime, duration);
                }
                return updated;
            });

            if (!isPriceManual) {
                setForm((prevForm) => ({...prevForm, price: sumPrice(next, catalogMap)}));
            }

            setIsEndTimeManual(false);
            setError(null);
            return next;
        });
    };

    const validate = (): ReservationFieldError | null => {
        const normalizedNewCustomerTel = newCustomerTel.replace(/\D/g, '');

        if (activeAssignees.length > 0 && !form.assigneeId) return {field: 'assignee', message: '담당자를 선택해주세요.'};
        if (customerMode === 'existing' && !customerId) return {field: 'customer', message: '고객을 선택해주세요.'};
        if (customerMode === 'new' && !newCustomerName.trim()) return {field: 'customer', message: '신규 고객명을 입력해주세요.'};
        if (customerMode === 'new' && !newCustomerTel.trim()) return {field: 'customer', message: '신규 고객 연락처를 입력해주세요.'};
        if (customerMode === 'new' && !KOREAN_MOBILE_PHONE_PATTERN.test(normalizedNewCustomerTel)) {
            return {field: 'customer', message: '신규 고객 연락처 형식을 확인해주세요.'};
        }
        if (selectedServices.length === 0) return {field: 'service', message: '서비스를 선택해주세요.'};
        if (!form.date) return {field: 'date', message: '날짜를 선택해주세요.'};
        if (!form.startTime) return {field: 'time', message: '시작 시간을 입력해주세요.'};
        if (!form.endTime) return {field: 'time', message: '종료 시간을 입력해주세요.'};
        if (form.startTime >= form.endTime) return {field: 'time', message: '시작 시간은 종료 시간보다 앞서야 합니다.'};

        const availability = getAssigneeAvailabilityState(
            assignees,
            form.assigneeId,
            form.date,
            form.startTime,
            form.endTime
        );
        if (availability.kind === 'off-day') return {field: 'date', message: availability.message};
        if (availability.kind === 'outside-hours') return {field: 'time', message: availability.message};

        const overlap = findOverlap(reservationMap, form.date, form.startTime, form.endTime);
        if (overlap) {
            const name = customerMap[overlap.customerId]?.name ?? '-';
            return {field: 'time', message: `${name} 예약(${overlap.startTime}~${overlap.endTime})과 시간이 겹칩니다.`};
        }

        return null;
    };

    const handleSave = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        // 신규 고객은 훅 상단에서 계산한 nextCustomerId(max+1)를 사용한다.
        // (과거엔 여기서 customerId(미선택=0)로 섀도잉해 모든 신규 고객이
        //  legacyId 0 한 칸에 덮어써지는 치명적 버그가 있었음)
        let resolvedCustomerId = customerId;

        if (customerMode === 'new') {
            const nextCustomer: Customer = {
                id: nextCustomerId,
                name: newCustomerName.trim(),
                tel: newCustomerTel.trim(),
                points: 0,
                pointHistories: [],
            };

            // 신규 고객을 서버에 먼저 저장(await)한 뒤 예약을 POST해야
            // 'Customer not found'(400)가 나지 않는다. (단건 저장이라 빠름)
            await addCustomer(nextCustomer);
            resolvedCustomerId = nextCustomer.id;
        }

        const reservation: Reservation = {
            id: nextReservationId,
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            service: form.service,
            customerId: resolvedCustomerId,
            ...(form.assigneeId ? {assigneeId: form.assigneeId} : {}),
            status: 'active',
            price: form.price,
            ...(form.memo.trim() && {memo: form.memo.trim()}),
            channel: form.channel,
        };

        onSave(reservation);
    };

    return {
        activeAssignees,
        onLeaveAssignees,
        resignedAssignees,
        customerId,
        customerQuery,
        showSuggestions,
        customerMode,
        newCustomerName,
        newCustomerTel,
        assigneeId: form.assigneeId,
        selectedServices,
        form,
        error,
        filteredCustomers,
        totalDuration,
        totalPrice,
        setCustomerMode: (mode: CustomerMode) => {
            setCustomerMode(mode);
            setError(null);
        },
        setNewCustomerName: (value: string) => {
            setNewCustomerName(value);
            setError(null);
        },
        setNewCustomerTel: (value: string) => {
            setNewCustomerTel(value);
            setError(null);
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
            setError(null);
        },
        handleAssigneeChange: (nextAssigneeId: number) => {
            setForm((prev) => ({...prev, assigneeId: nextAssigneeId}));
            setError(null);
        },
        handleFieldChange: (field: keyof ReservationDetailFormState, value: string) => {
            setForm((prev) => ({...prev, [field]: value}));
            setError(null);
        },
        handleSave,
    };
}
