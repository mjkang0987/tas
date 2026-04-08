import {useState} from 'react';

import {createPortal} from 'react-dom';
import styled from 'styled-components';

import {useCalendarStore} from '../../../store/calendarStore';

import type {PaymentEntry, PaymentMethod, Reservation, ReservationHistoryEntry, ReservationMap, ReservationStatus} from '../../../utils/reservations';
import {findOverlap} from '../../../utils/reservations';
import type {CustomerMap} from '../../../utils/customers';
import {getDesignerColor, splitDesignersByStatus} from '../../../utils/designers';
import {
    parseServiceString,
    joinServiceNames,
    sumDurationMinutes,
    sumPrice,
    formatPrice,
    calcEndTime,
    buildServiceColorMap,
    getServiceColor,
} from '../../../utils/services';

import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledBody,
    StyledBodyInner,
    StyledActionButton,
    useLayerInstanceId,
} from './ModalStyles';
import {
    ReservationDiffSection,
    ReservationEditSection,
    ReservationFooter,
    ReservationHistoryLayer,
    ReservationStaticDiffSection,
    ReservationViewSection,
    type ReservationDetailFormState,
} from './ReservationDetailSections';

type Mode = 'view' | 'editing' | 'confirming' | 'pastConfirm' | 'noChanges' | 'cancelling' | 'noshow' | 'payment';

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['현금', '현금+현금영수증', '카드', '네이버페이', '지역화폐', '지역화폐+현금영수증', '상품권'];

function getPaymentEntries(reservation: Reservation): PaymentEntry[] {
    if (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0) {
        return reservation.paymentEntries;
    }

    if (reservation.paymentCompleted && reservation.paymentMethod) {
        return [{
            method: reservation.paymentMethod,
            amount: reservation.price ?? 0,
        }];
    }

    return [];
}

function formatPaymentEntries(entries: PaymentEntry[]): string[] {
    if (entries.length === 0) return ['미입력'];
    return entries.map((entry) => `${entry.method} · ${formatPrice(entry.amount)}`);
}

const MODE_LABELS: Partial<Record<Mode, string>> = {
    editing: '예약 수정',
    confirming: '변경 확인',
    pastConfirm: '변경 확인',
    noChanges: '알림',
    cancelling: '예약 취소',
    noshow: '노쇼 처리',
    payment: '결제 처리',
};

interface ReservationDetailProps {
    reservation: Reservation;
    customerMap: CustomerMap;
    reservationMap: ReservationMap;
    history: ReservationHistoryEntry[];
    onClose: () => void;
    onCustomerClick: (customerId: number) => void;
    onUpdate: (prev: Reservation, updated: Reservation) => void;
    onCancel: (reservation: Reservation, status?: ReservationStatus) => void;
}

const FIELD_LABELS: Record<keyof ReservationDetailFormState, string> = {
    service: '시술',
    designerId: '디자이너',
    date: '날짜',
    startTime: '시작시간',
    endTime: '종료시간',
    price: '가격',
    memo: '메모'
};

const getChangedFields = (before: Reservation, after: ReservationDetailFormState, designerNameMap: Record<number, string>) => {
    const fields: { label: string; before: string; after: string }[] = [];
    const beforePrice = before.price ?? sumPrice(parseServiceString(before.service));

    (Object.keys(FIELD_LABELS) as (keyof ReservationDetailFormState)[]).forEach((key) => {
        if (key === 'designerId') {
            const beforeDesignerId = before.designerId ?? 0;
            if (beforeDesignerId !== after.designerId) {
                fields.push({
                    label: FIELD_LABELS[key],
                    before: designerNameMap[beforeDesignerId] ?? '미지정',
                    after: designerNameMap[after.designerId] ?? '미지정'
                });
            }
        } else if (key === 'price') {
            if (beforePrice !== after.price) {
                fields.push({
                    label: FIELD_LABELS[key],
                    before: formatPrice(beforePrice),
                    after: formatPrice(after.price)
                });
            }
        } else if (before[key] !== after[key]) {
            fields.push({
                label: FIELD_LABELS[key],
                before: before[key] as string,
                after: after[key] as string
            });
        }
    });

    return fields;
};

const getHistoryDiffs = (entry: ReservationHistoryEntry, designerNameMap: Record<number, string>) => {
    const diffs: { label: string; before: string; after: string }[] = [];

    if (entry.after.status === 'cancelled' && entry.before.status !== 'cancelled') {
        diffs.push({label: '상태', before: '활성', after: '취소됨'});
        return diffs;
    }

    if (entry.after.status === 'noshow' && entry.before.status !== 'noshow') {
        diffs.push({label: '상태', before: '활성', after: '노쇼'});
        return diffs;
    }

    if ((entry.before.paymentCompleted ?? false) !== (entry.after.paymentCompleted ?? false)) {
        diffs.push({
            label: '결제상태',
            before: entry.before.paymentCompleted ? '결제완료' : '미결제',
            after: entry.after.paymentCompleted ? '결제완료' : '미결제'
        });
    }

    const beforePaymentLines = formatPaymentEntries(getPaymentEntries(entry.before)).join(', ');
    const afterPaymentLines = formatPaymentEntries(getPaymentEntries(entry.after)).join(', ');

    if (beforePaymentLines !== afterPaymentLines) {
        diffs.push({
            label: '결제수단',
            before: beforePaymentLines,
            after: afterPaymentLines
        });
    }

    (Object.keys(FIELD_LABELS) as (keyof ReservationDetailFormState)[]).forEach((key) => {
        if (key === 'designerId') {
            const beforeDesignerId = entry.before.designerId ?? 0;
            const afterDesignerId = entry.after.designerId ?? 0;
            if (beforeDesignerId !== afterDesignerId) {
                diffs.push({
                    label: FIELD_LABELS[key],
                    before: designerNameMap[beforeDesignerId] ?? '미지정',
                    after: designerNameMap[afterDesignerId] ?? '미지정'
                });
            }
        } else if (key === 'price') {
            const beforePrice = entry.before.price ?? sumPrice(parseServiceString(entry.before.service));
            const afterPrice = entry.after.price ?? sumPrice(parseServiceString(entry.after.service));
            if (beforePrice !== afterPrice) {
                diffs.push({
                    label: FIELD_LABELS[key],
                    before: formatPrice(beforePrice),
                    after: formatPrice(afterPrice)
                });
            }
        } else if (entry.before[key] !== entry.after[key]) {
            diffs.push({
                label: FIELD_LABELS[key],
                before: entry.before[key] as string,
                after: entry.after[key] as string
            });
        }
    });

    return diffs;
};

const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ReservationDetail = ({
                                      reservation,
                                      customerMap,
                                      reservationMap,
                                      history,
                                      onClose,
                                      onCustomerClick,
                                      onUpdate,
                                      onCancel
                                  }: ReservationDetailProps) => {
    const customer = customerMap[reservation.customerId];
    const designers = useCalendarStore((s) => s.designers);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const {
        active: activeDesigners,
        onLeave: onLeaveDesigners,
        resigned: resignedDesigners
    } = splitDesignersByStatus(designers);
    const selectableDesigners = [...activeDesigners, ...onLeaveDesigners, ...resignedDesigners];
    const designerNameMap = designers.reduce<Record<number, string>>((acc, designer) => {
        acc[designer.id] = designer.name;
        return acc;
    }, {0: '미지정'});
    const serviceColorMap = buildServiceColorMap(serviceCatalog, categoryBaseColorMap);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('reservation-detail');

    const [mode, setMode] = useState<Mode>('view');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const initialPrice = reservation.price ?? sumPrice(parseServiceString(reservation.service));
    const initialDesignerId = reservation.designerId ?? (selectableDesigners[0]?.id ?? 0);
    const [form, setForm] = useState<ReservationDetailFormState>({
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        service: reservation.service,
        designerId: initialDesignerId,
        price: initialPrice,
        memo: reservation.memo ?? ''
    });
    const [error, setError] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>(
        () => parseServiceString(reservation.service)
    );
    const [isEndTimeManual, setIsEndTimeManual] = useState(false);
    const [isPriceManual, setIsPriceManual] = useState(false);
    const displayPrice = reservation.price ?? sumPrice(parseServiceString(reservation.service));
    const [paymentEntries, setPaymentEntries] = useState<Array<{ method: PaymentMethod | ''; amount: string }>>(
        () => {
            const entries = getPaymentEntries(reservation);
            return entries.length > 0
                ? entries.map((entry) => ({method: entry.method, amount: String(entry.amount)}))
                : [{method: '', amount: String(displayPrice)}];
        }
    );

    const changedFields = getChangedFields(reservation, form, designerNameMap);
    const thisHistory = history.filter((h) => h.reservationId === reservation.id);
    const totalDuration = sumDurationMinutes(selectedServices);
    const totalPrice = sumPrice(selectedServices);
    const displayDesignerName = reservation.designerId ? (designerNameMap[reservation.designerId] ?? '미지정') : '미지정';
    const displayDesignerColor = reservation.designerId
        ? getDesignerColor(designers.find((designer) => designer.id === reservation.designerId))
        : '#8E8E93';
    const normalizedPaymentEntries = getPaymentEntries(reservation);
    const paymentCompleted = normalizedPaymentEntries.length > 0 || reservation.paymentCompleted === true;
    const paymentLines = formatPaymentEntries(normalizedPaymentEntries);

    const handleChange = (field: keyof ReservationDetailFormState, value: string) => {
        setForm((prev) => ({...prev, [field]: value}));
        setError('');
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
                ? prev.filter((s) => s !== serviceName)
                : [...prev, serviceName];

            const serviceStr = joinServiceNames(next);
            const duration = sumDurationMinutes(next);

            setForm((f) => {
                const updated = {...f, service: serviceStr};

                if (duration > 0) {
                    updated.endTime = calcEndTime(f.startTime, duration);
                }

                if (!isPriceManual) {
                    updated.price = sumPrice(next);
                }

                return updated;
            });

            setIsEndTimeManual(false);
            setError('');

            return next;
        });
    };

    const validateForm = (): string => {
        if (selectableDesigners.length > 0 && !form.designerId) return '디자이너를 선택해주세요.';
        if (!form.service.trim()) return '시술을 선택해주세요.';
        if (!form.date) return '날짜를 선택해주세요.';
        if (!form.startTime) return '시작 시간을 입력해주세요.';
        if (!form.endTime) return '종료 시간을 입력해주세요.';
        if (form.startTime >= form.endTime) return '시작 시간은 종료 시간보다 앞서야 합니다.';

        const overlap = findOverlap(reservationMap, form.date, form.startTime, form.endTime, reservation.id);

        if (overlap) {
            const name = customerMap[overlap.customerId]?.name ?? '-';
            return `${name} 예약(${overlap.startTime}~${overlap.endTime})과 시간이 겹칩니다.`;
        }

        return '';
    };

    const isPastTime = () => {
        const now = new Date();
        const startDateTime = new Date(`${form.date}T${form.startTime}`);
        return startDateTime < now;
    };

    const handleConfirmRequest = () => {
        const msg = validateForm();
        if (msg) {
            setError(msg);
            return;
        }
        if (changedFields.length === 0) {
            setMode('noChanges');
            return;
        }
        setError('');
        if (isPastTime()) {
            setMode('pastConfirm');
            return;
        }
        setMode('confirming');
    };

    const handleConfirmSave = () => {
        onUpdate(reservation, {...reservation, ...form});
        setMode('view');
    };

    const handlePaymentSave = () => {
        const normalizedEntries = paymentEntries
            .map((entry) => ({
                method: entry.method,
                amount: Number(entry.amount.replace(/[^0-9]/g, '')) || 0,
            }))
            .filter((entry): entry is PaymentEntry => !!entry.method && entry.amount > 0);

        if (normalizedEntries.length === 0) {
            setError('결제종류와 금액을 입력해주세요.');
            return;
        }

        onUpdate(reservation, {
            ...reservation,
            paymentCompleted: true,
            paymentMethod: normalizedEntries[0].method,
            paymentEntries: normalizedEntries,
        });
        setError('');
        setMode('view');
    };

    const handleCancel = () => {
        setForm({
            date: reservation.date,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            service: reservation.service,
            designerId: initialDesignerId,
            price: initialPrice,
            memo: reservation.memo ?? ''
        });
        setSelectedServices(parseServiceString(reservation.service));
        setIsEndTimeManual(false);
        setIsPriceManual(false);
        setIsHistoryOpen(false);
        setPaymentEntries(
            getPaymentEntries(reservation).length > 0
                ? getPaymentEntries(reservation).map((entry) => ({method: entry.method, amount: String(entry.amount)}))
                : [{method: '', amount: String(displayPrice)}]
        );
        setMode('view');
    };

    const handleBack = () => {
        if (isHistoryOpen) {
            setIsHistoryOpen(false);
            return;
        }

        if (mode === 'confirming' || mode === 'pastConfirm' || mode === 'noChanges') {
            setMode('editing');
        } else if (mode === 'editing' || mode === 'cancelling' || mode === 'noshow' || mode === 'payment') {
            handleCancel();
        } else {
            onClose();
        }
    };

    const isCancelled = reservation.status === 'cancelled';
    const isNoshow = reservation.status === 'noshow';
    const isInactive = isCancelled || isNoshow;
    const dialogLabel = MODE_LABELS[mode] ?? '예약 상세';
    const dialogTitle = MODE_LABELS[mode] ?? `${reservation.service} - ${customer?.name}`;
    const footerActions = mode === 'view'
        ? (!isInactive ? (
            <>
                <StyledActionButton type="button"
                                    $danger
                                    onClick={() => setMode('cancelling')}>예약취소</StyledActionButton>
                <StyledActionButton type="button"
                                    $warning
                                    onClick={() => setMode('noshow')}>노쇼</StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={() => {
                                        setPaymentEntries(
                                            getPaymentEntries(reservation).length > 0
                                                ? getPaymentEntries(reservation).map((entry) => ({method: entry.method, amount: String(entry.amount)}))
                                                : [{method: '', amount: String(displayPrice)}]
                                        );
                                        setError('');
                                        setMode('payment');
                                    }}>
                    {paymentCompleted ? '결제수단 변경' : '결제완료'}
                </StyledActionButton>
                <StyledActionButton type="button"
                                    $primary
                                    onClick={() => setMode('editing')}>수정</StyledActionButton>
            </>
        ) : null)
        : mode === 'editing'
            ? (
                <>
                    <StyledActionButton type="button"
                                        onClick={handleCancel}>취소</StyledActionButton>
                    <StyledActionButton type="button"
                                        $primary
                                        onClick={handleConfirmRequest}>저장</StyledActionButton>
                </>
            )
            : mode === 'confirming'
                ? (
                    <>
                        <StyledActionButton type="button"
                                            onClick={() => setMode('editing')}>돌아가기</StyledActionButton>
                        <StyledActionButton type="button"
                                            $primary
                                            onClick={handleConfirmSave}>확인</StyledActionButton>
                    </>
                )
                : mode === 'noChanges'
                    ? (
                        <StyledActionButton type="button"
                                            $primary
                                            onClick={() => setMode('editing')}>확인</StyledActionButton>
                    )
                    : mode === 'pastConfirm'
                        ? (
                            <>
                                <StyledActionButton type="button"
                                                    onClick={() => setMode('editing')}>아니오</StyledActionButton>
                                <StyledActionButton type="button"
                                                    $primary
                                                    onClick={handleConfirmSave}>네</StyledActionButton>
                            </>
                        )
                        : mode === 'cancelling'
                            ? (
                                <>
                                    <StyledActionButton type="button"
                                                        onClick={() => setMode('view')}>돌아가기</StyledActionButton>
                                    <StyledActionButton type="button"
                                                        $danger
                                                        onClick={() => onCancel(reservation)}>예약취소</StyledActionButton>
                                </>
                            )
                            : mode === 'noshow'
                                ? (
                                    <>
                                        <StyledActionButton type="button"
                                                            onClick={() => setMode('view')}>돌아가기</StyledActionButton>
                                        <StyledActionButton type="button"
                                                            $warning
                                                            onClick={() => onCancel(reservation, 'noshow')}>노쇼 처리</StyledActionButton>
                                    </>
                                )
                                : mode === 'payment'
                                    ? (
                                        <>
                                            <StyledActionButton type="button"
                                                                onClick={() => setMode('view')}>취소</StyledActionButton>
                                            <StyledActionButton type="button"
                                                                $primary
                                                                onClick={handlePaymentSave}>결제 저장</StyledActionButton>
                                        </>
                                    )
                                : null;

    if (!modalRoot) return null;

    return createPortal(<StyledReservationOverlay onClick={handleBack}
                                                  role="dialog"
                                                  aria-modal="true"
                                                  aria-label={dialogLabel}
                                                  id={layerId}
                                                  data-layer-id={layerDataId}
                                                  $stacked={selectedCustomerId !== null}>
        <StyledDetail onClick={(e) => e.stopPropagation()}
                      $width={400}>
            <StyledReservationHeader>
                <StyledReservationTitleGroup>
                    <StyledServiceBadgeList>
                        {parseServiceString(reservation.service).map((serviceName) => (
                            <StyledServiceDotBadge key={serviceName}
                                                   $color={getServiceColor(serviceName, serviceColorMap)}
                                                   aria-label={serviceName}
                                                   title={serviceName} />
                        ))}
                    </StyledServiceBadgeList>
                    <h3>{dialogTitle}</h3>
                </StyledReservationTitleGroup>
                <button type="button"
                        onClick={handleBack}
                        aria-label="닫기">닫기</button>
            </StyledReservationHeader>

            {mode === 'view' && (
                <ReservationViewSection
                    reservation={reservation}
                    customerMap={customerMap}
                    displayPrice={displayPrice}
                    displayDesignerName={displayDesignerName}
                    displayDesignerColor={displayDesignerColor}
                    paymentCompleted={paymentCompleted}
                    paymentLines={paymentLines}
                    historyCount={thisHistory.length}
                    onCustomerClick={onCustomerClick}
                    onOpenHistory={() => setIsHistoryOpen(true)}
                />
            )}

            {mode === 'editing' && (
                <ReservationEditSection
                    form={form}
                    error={error}
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
                        setForm((f) => ({...f, price: num}));
                        setIsPriceManual(true);
                        setError('');
                    }}
                    onDesignerChange={(designerId) => {
                        setForm((prev) => ({...prev, designerId}));
                        setError('');
                    }}
                    onFieldChange={handleChange}
                    onStartTimeChange={handleStartTimeChange}
                    onEndTimeChange={handleEndTimeChange}
                />
            )}

            {mode === 'confirming' && (
                <ReservationDiffSection message="수정하시겠습니까?" diffs={changedFields} />
            )}

            {mode === 'noChanges' && (
                <ReservationDiffSection message="변경내역이 없습니다." diffs={[]} />
            )}

            {mode === 'pastConfirm' && (
                <ReservationDiffSection
                    message="현재 시간보다 과거입니다. 변경하시겠습니까?"
                    color="var(--caution-color)"
                    diffs={changedFields}
                />
            )}

            {mode === 'cancelling' && (
                <ReservationStaticDiffSection
                    message="이 예약을 취소하시겠습니까?"
                    color="var(--danger-color)"
                    items={[
                        {label: '시술', value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                />
            )}

            {mode === 'payment' && (
                <StyledBody><StyledBodyInner>
                    <StyledPaymentLayer>
                        <StyledPaymentMessage>결제 종류와 금액을 입력해 주세요.</StyledPaymentMessage>
                        <StyledPaymentEntryList>
                            {paymentEntries.map((entry, index) => (
                                <StyledPaymentEntryRow key={`payment-entry-${index}`}>
                                    <select
                                        value={entry.method}
                                        onChange={(e) => {
                                            const value = e.target.value as PaymentMethod | '';
                                            setPaymentEntries((prev) => prev.map((item, itemIndex) => (
                                                itemIndex === index ? {...item, method: value} : item
                                            )));
                                            setError('');
                                        }}
                                    >
                                        <option value="">결제종류</option>
                                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={entry.amount}
                                        placeholder="금액"
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                            setPaymentEntries((prev) => prev.map((item, itemIndex) => (
                                                itemIndex === index ? {...item, amount: value} : item
                                            )));
                                            setError('');
                                        }}
                                    />
                                    <StyledPaymentRemoveButton
                                        type="button"
                                        onClick={() => {
                                            setPaymentEntries((prev) => prev.length > 1 ? prev.filter((_, itemIndex) => itemIndex !== index) : [{method: '', amount: ''}]);
                                            setError('');
                                        }}
                                    >
                                        삭제
                                    </StyledPaymentRemoveButton>
                                </StyledPaymentEntryRow>
                            ))}
                        </StyledPaymentEntryList>
                        <StyledPaymentAddButton
                            type="button"
                            onClick={() => setPaymentEntries((prev) => [...prev, {method: '', amount: ''}])}
                        >
                            결제수단 추가
                        </StyledPaymentAddButton>
                        {error && <StyledPaymentError>{error}</StyledPaymentError>}
                    </StyledPaymentLayer>
                </StyledBodyInner></StyledBody>
            )}

            {mode === 'noshow' && (
                <ReservationStaticDiffSection
                    message="이 예약을 노쇼 처리하시겠습니까?"
                    color="var(--warning-color)"
                    items={[
                        {label: '시술', value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                />
            )}

            <ReservationFooter actions={footerActions} />
        </StyledDetail>
        <ReservationHistoryLayer
            history={thisHistory}
            designerNameMap={designerNameMap}
            getHistoryDiffs={getHistoryDiffs}
            formatTimestamp={formatTimestamp}
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
        />
    </StyledReservationOverlay>, modalRoot);
};

const StyledReservationOverlay = styled(StyledOverlay)<{ $stacked: boolean }>`
    z-index: ${(props) => props.$stacked ? OVERLAY_Z_INDEX.confirm : OVERLAY_Z_INDEX.detail};
`;

const StyledReservationHeader = styled(StyledHeader)``;

const StyledReservationTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;

    h3 {
        margin: 0;
    }
`;

const StyledServiceBadgeList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const StyledServiceDotBadge = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background-color: ${(props) => props.$color};
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
`;

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

const StyledPaymentOptionGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
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

const StyledPaymentOptionButton = styled.button<{ $active: boolean }>`
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid ${(props) => props.$active ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 8px;
    background: ${(props) => props.$active ? 'rgba(45, 127, 249, 0.12)' : 'var(--white-color)'};
    color: var(--dark-gray-color);
    font-size: 12px;
    font-weight: ${(props) => props.$active ? 600 : 500};
    cursor: pointer;
    text-align: center;
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
