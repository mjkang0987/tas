import {useEffect, useMemo, useState} from 'react';

import {createPortal} from 'react-dom';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';
import {useCalendarStore} from '../../../store/calendarStore';

import type {PaymentEntry, PaymentMethod, Reservation, ReservationHistoryEntry, ReservationMap, ReservationStatus} from '../../../utils/reservations';
import {findOverlap, hasCompletedPayment} from '../../../utils/reservations';
import {isNewCustomerVisit} from '../../../utils/customers';
import type {CustomerMap} from '../../../utils/customers';
import {buildDesignerNameMap, getDesignerAvailabilityState, getDesignerColor, splitDesignersByStatus} from '../../../utils/designers';
import {
    parseServiceString,
    joinServiceNames,
    sumDurationMinutes,
    sumPrice,
    calcEndTime,
    buildCatalogMap,
    buildServiceColorMap,
    formatPrice,
} from '../../../utils/services';

import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitle,
    StyledFooter,
    StyledActionButton,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {
    ReservationDiffSection,
    ReservationEditSection,
    ReservationFooter,
    ReservationHistoryLayer,
    ReservationStaticDiffSection,
    ReservationViewSection,
    type ReservationDetailFormState,
    type ReservationFieldError,
} from './ReservationDetailSections';
import {ReservationDetailHeader} from './ReservationDetailHeader';
import {ReservationDetailFooterActions} from './ReservationDetailFooterActions';
import {ReservationDetailPaymentLayer} from './ReservationDetailPaymentLayer';
import type {PointAwardDraft, ReservationDetailMode} from './reservationDetailTypes';
import {
    formatPaymentEntries,
    formatTimestamp,
    getChangedFields,
    getHistoryDiffs,
    getPaymentEntries,
    getPaymentEntryDrafts,
    getPointAmount,
    PAYMENT_METHOD_OPTIONS,
    MODE_LABELS,
    resolveReservationPrice,
    buildReservationFormState,
    buildDraftReservation,
    buildSyncedPaidReservation,
} from './reservationDetailUtils';
import {
    StyledReservationOverlay,
    StyledRestoreOverlay,
    StyledRestoreModal,
    StyledRestoreBody,
    StyledRestoreList,
    StyledRestoreTerm,
    StyledRestoreDesc,
    StyledRestoreMessage,
} from './ReservationDetail.styles';

interface ReservationDetailProps {
    reservation: Reservation;
    customerMap: CustomerMap;
    reservationMap: ReservationMap;
    history: ReservationHistoryEntry[];
    onClose: () => void;
    onCustomerClick: (customerId: number) => void;
    onUpdate: (prev: Reservation, updated: Reservation) => void;
    onCancel: (reservation: Reservation, status?: ReservationStatus) => void;
    onRestore: (reservation: Reservation) => void;
    onDelete?: (reservation: Reservation) => void;
}

export const ReservationDetail = ({
                                      reservation,
                                      customerMap,
                                      reservationMap: reservationMapProp,
                                      history,
                                      onClose,
                                      onCustomerClick,
                                      onUpdate,
                                      onCancel,
                                      onRestore,
                                      onDelete
                                  }: ReservationDetailProps) => {
    const router = useRouter();
    const {data: session} = useSession();
    const canDelete = !!onDelete && session?.user?.role === 'owner';
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
    const effectiveReservationMap = useMemo(
        () => Object.keys(storeReservationMap).length > 0 ? storeReservationMap : reservationMapProp,
        [reservationMapProp, storeReservationMap]
    );
    const sourceReservation = useMemo(() => {
        const sameDateReservation = (effectiveReservationMap[reservation.date] ?? []).find((item) => item.id === reservation.id);
        if (sameDateReservation) return sameDateReservation;

        for (const reservations of Object.values(effectiveReservationMap)) {
            const matched = reservations.find((item) => item.id === reservation.id);
            if (matched) return matched;
        }

        return reservation;
    }, [effectiveReservationMap, reservation]);
    const customer = customerMap[sourceReservation.customerId];
    const designers = useCalendarStore((s) => s.designers);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const {
        active: activeDesigners,
        onLeave: onLeaveDesigners,
        resigned: resignedDesigners
    } = splitDesignersByStatus(designers);
    const currentDesigner = sourceReservation.designerId
        ? designers.find((designer) => designer.id === sourceReservation.designerId) ?? null
        : null;
    const designerNameMap = buildDesignerNameMap(designers, true);
    const serviceColorMap = buildServiceColorMap(serviceCatalog, categoryBaseColorMap);
    const catalogMap = useMemo(() => buildCatalogMap(serviceCatalog), [serviceCatalog]);
    const knownServiceNames = useMemo(() => new Set(Object.keys(serviceColorMap)), [serviceColorMap]);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('reservation-detail');
    const getDefaultPointAwardAmount = (baseAmount: number) => Math.floor((baseAmount * storeSettings.pointSettings.serviceRate) / 100);
    const latestKnownDesignerId = sourceReservation.designerId ?? history.reduce<number | undefined>((found, entry) => {
        if (found) return found;
        const afterDesignerId = entry.after?.designerId;
        if (typeof afterDesignerId === 'number' && afterDesignerId > 0) return afterDesignerId;
        const beforeDesignerId = entry.before?.designerId;
        if (typeof beforeDesignerId === 'number' && beforeDesignerId > 0) return beforeDesignerId;
        return undefined;
    }, undefined);

    const [mode, setMode] = useState<ReservationDetailMode>('view');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isRestoringOpen, setIsRestoringOpen] = useState(false);
    const initialForm = buildReservationFormState(sourceReservation);
    const [form, setForm] = useState<ReservationDetailFormState>(initialForm);
    const [priceInputValue, setPriceInputValue] = useState(initialForm.price === 0 ? '' : String(initialForm.price));
    const [error, setError] = useState<ReservationFieldError | null>(null);
    const [selectedServices, setSelectedServices] = useState<string[]>(
        () => parseServiceString(sourceReservation.service, knownServiceNames)
    );
    const [isEndTimeManual, setIsEndTimeManual] = useState(false);
    const [isPriceManual, setIsPriceManual] = useState(false);
    const draftReservation = buildDraftReservation(sourceReservation, form);
    const displayPrice = resolveReservationPrice(draftReservation);
    const [paymentEntries, setPaymentEntries] = useState<Array<{ method: PaymentMethod | ''; amount: string }>>(
        () => getPaymentEntryDrafts(sourceReservation, displayPrice, sourceReservation.naverDeposit ?? 0)
    );
    const [isPointAwardManual, setIsPointAwardManual] = useState(false);
    const [pointAward, setPointAward] = useState<PointAwardDraft>(() => ({
        enabled: (sourceReservation.pointEarned ?? 0) > 0 || storeSettings.pointSettings.enableServiceRate,
        amount: String(sourceReservation.pointEarned ?? getDefaultPointAwardAmount(displayPrice)),
    }));

    useEffect(() => {
        const nextForm = buildReservationFormState(sourceReservation);
        const nextDisplayPrice = resolveReservationPrice(sourceReservation);

        setForm(nextForm);
        setPriceInputValue(nextForm.price === 0 ? '' : String(nextForm.price));
        setSelectedServices(parseServiceString(sourceReservation.service, knownServiceNames));
        setIsEndTimeManual(false);
        setIsPriceManual(false);
        setPaymentEntries(getPaymentEntryDrafts(sourceReservation, nextDisplayPrice, sourceReservation.naverDeposit ?? 0));
        setIsPointAwardManual(false);
        setPointAward({
            enabled: (sourceReservation.pointEarned ?? 0) > 0 || storeSettings.pointSettings.enableServiceRate,
            amount: String(sourceReservation.pointEarned ?? getDefaultPointAwardAmount(nextDisplayPrice)),
        });
        setError(null);
    }, [sourceReservation, storeSettings.pointSettings.enableServiceRate, storeSettings.pointSettings.serviceRate]);

    const changedFields = getChangedFields(sourceReservation, form, designerNameMap);
    const thisHistory = history.filter((h) => h.reservationId === sourceReservation.id);
    const totalDuration = sumDurationMinutes(selectedServices, catalogMap);
    const totalPrice = sumPrice(selectedServices, catalogMap);
    const displayDesignerName = draftReservation.designerId
        ? (designerNameMap[draftReservation.designerId] ?? '미지정')
        : '미지정';
    const displayDesignerColor = draftReservation.designerId
        ? getDesignerColor(designers.find((designer) => designer.id === draftReservation.designerId))
        : '#8E8E93';
    const normalizedPaymentEntries = getPaymentEntries(sourceReservation);
    const paymentCompleted = hasCompletedPayment(sourceReservation);
    const paymentLines = formatPaymentEntries(normalizedPaymentEntries);
    const showPointAward = storeSettings.pointSettings.enableServiceRate;

    const handleChange = (field: keyof ReservationDetailFormState, value: string) => {
        setForm((prev) => ({...prev, [field]: value}));
        setError(null);
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
                ? prev.filter((s) => s !== serviceName)
                : [...prev, serviceName];

            const serviceStr = joinServiceNames(next);
            const duration = sumDurationMinutes(next, catalogMap);
            const nextPrice = sumPrice(next, catalogMap);

            setForm((f) => {
                const updated = {...f, service: serviceStr};

                if (duration > 0) {
                    updated.endTime = calcEndTime(f.startTime, duration);
                }

                if (!isPriceManual) {
                    updated.price = nextPrice;
                }

                return updated;
            });

            if (!isPriceManual) {
                setPriceInputValue(nextPrice === 0 ? '' : String(nextPrice));
            }

            setIsEndTimeManual(false);
            setError(null);

            return next;
        });
    };

    const validateForm = (): ReservationFieldError | null => {
        if (activeDesigners.length > 0 && !form.designerId) return {field: 'designer', message: '디자이너를 선택해주세요.'};
        if (!form.service.trim()) return {field: 'service', message: '서비스를 선택해주세요.'};
        if (!form.date) return {field: 'date', message: '날짜를 선택해주세요.'};
        if (!form.startTime) return {field: 'time', message: '시작 시간을 입력해주세요.'};
        if (!form.endTime) return {field: 'time', message: '종료 시간을 입력해주세요.'};
        if (form.startTime >= form.endTime) return {field: 'time', message: '시작 시간은 종료 시간보다 앞서야 합니다.'};

        const availability = getDesignerAvailabilityState(
            designers,
            form.designerId,
            form.date,
            form.startTime,
            form.endTime
        );
        if (availability.kind === 'off-day') return {field: 'date', message: availability.message};
        if (availability.kind === 'outside-hours') return {field: 'time', message: availability.message};

        const overlap = findOverlap(effectiveReservationMap, form.date, form.startTime, form.endTime, sourceReservation.id);

        if (overlap) {
            const name = customerMap[overlap.customerId]?.name ?? '-';
            return {field: 'time', message: `${name} 예약(${overlap.startTime}~${overlap.endTime})과 시간이 겹칩니다.`};
        }

        return null;
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
            setError(null);
            setMode('view');
            return;
        }
        setError(null);
        if (isPastTime()) {
            setMode('pastConfirm');
            return;
        }
        setMode('confirming');
    };

    const handleConfirmSave = () => {
        if (mode === 'completing') {
            if (!hasCompletedPayment(sourceReservation)) {
                setError({field: 'general', message: '결제 완료된 예약만 완료 처리할 수 있습니다.'});
                setMode('view');
                return;
            }
            onUpdate(sourceReservation, {...sourceReservation, status: 'completed'});
            setMode('view');
            return;
        }
        const nextReservation = hasCompletedPayment(sourceReservation)
            ? buildSyncedPaidReservation(sourceReservation, draftReservation)
            : draftReservation;
        onUpdate(sourceReservation, nextReservation);
        setMode('view');
    };

    const syncPointAward = (entries: Array<{ method: PaymentMethod | ''; amount: string }>) => {
        if (!storeSettings.pointSettings.enableServiceRate || isPointAwardManual) return;

        const nonPointPaidAmount = entries.reduce((sum, entry) => {
            if (!entry.method || entry.method === '적립금') return sum;
            return sum + (Number(entry.amount.replace(/[^0-9]/g, '')) || 0);
        }, 0);

        setPointAward((prev) => ({
            ...prev,
            enabled: true,
            amount: String(Math.floor((nonPointPaidAmount * storeSettings.pointSettings.serviceRate) / 100)),
        }));
    };

    const handlePaymentEntriesChange = (nextEntries: Array<{ method: PaymentMethod | ''; amount: string }>) => {
        setPaymentEntries(nextEntries);
        syncPointAward(nextEntries);
        setError(null);
    };

    const handlePaymentSave = () => {
        const normalizedEntries = paymentEntries
            .map((entry) => ({
                method: entry.method,
                amount: Number(entry.amount.replace(/[^0-9]/g, '')) || 0,
            }))
            .filter((entry): entry is PaymentEntry => !!entry.method && entry.amount > 0);

        if (normalizedEntries.length === 0) {
            setError({field: 'general', message: '결제종류와 금액을 입력해주세요.'});
            return;
        }

        const paymentTotal = normalizedEntries.reduce((sum, entry) => sum + entry.amount, 0);
        const expectedAmount = displayPrice - (sourceReservation.naverDeposit ?? 0);

        if (paymentTotal !== expectedAmount) {
            setError({field: 'general', message: `결제 금액 합계(${formatPrice(paymentTotal)})가 서비스 금액(${formatPrice(expectedAmount)})과 일치하지 않습니다.`});
            return;
        }

        const previousPointAmount = getPointAmount(getPaymentEntries(sourceReservation));
        const nextPointAmount = getPointAmount(normalizedEntries);
        const pointUsageDiff = nextPointAmount - previousPointAmount;
        const nextPointEarned = pointAward.enabled
            ? Number(pointAward.amount.replace(/[^0-9]/g, '')) || 0
            : 0;
        const previousPointEarned = sourceReservation.pointEarned ?? 0;
        const pointEarnDiff = nextPointEarned - previousPointEarned;
        const currentCustomerPoints = customer?.points ?? 0;

        if (currentCustomerPoints - pointUsageDiff < 0) {
            setError({field: 'general', message: '고객 적립금이 부족합니다.'});
            return;
        }

        onUpdate(sourceReservation, {
            ...sourceReservation,
            paymentCompleted: true,
            paymentMethod: normalizedEntries[0].method,
            paymentEntries: normalizedEntries,
            pointEarned: nextPointEarned,
        });

        if (customer && (pointUsageDiff !== 0 || pointEarnDiff !== 0)) {
            const nextPointBalance = Math.max(currentCustomerPoints - pointUsageDiff + pointEarnDiff, 0);
            const pointHistories = [];

            if (pointUsageDiff !== 0) {
                pointHistories.push({
                    type: 'payment_use' as const,
                    delta: -pointUsageDiff,
                    description: '예약 결제 적립금 사용',
                    relatedReservationId: sourceReservation.id,
                });
            }

            if (pointEarnDiff !== 0) {
                pointHistories.push({
                    type: pointEarnDiff > 0 ? 'payment_earn' as const : 'payment_adjust' as const,
                    delta: pointEarnDiff,
                    description: pointEarnDiff > 0 ? '예약 결제 적립' : '예약 결제 적립 조정',
                    relatedReservationId: sourceReservation.id,
                });
            }

            updateCustomer(customer.id, {
                points: nextPointBalance,
            }, pointHistories);
        }

        setError(null);
        setMode('view');
    };

    const handleCancel = () => {
        const nextForm = buildReservationFormState(sourceReservation);
        const nextDisplayPrice = resolveReservationPrice(sourceReservation);

        setForm(nextForm);
        setPriceInputValue(nextForm.price === 0 ? '' : String(nextForm.price));
        setSelectedServices(parseServiceString(sourceReservation.service, knownServiceNames));
        setIsEndTimeManual(false);
        setIsPriceManual(false);
        setIsHistoryOpen(false);
        setPaymentEntries(getPaymentEntryDrafts(sourceReservation, nextDisplayPrice, sourceReservation.naverDeposit ?? 0));
        setIsPointAwardManual(false);
        setPointAward({
            enabled: (sourceReservation.pointEarned ?? 0) > 0 || storeSettings.pointSettings.enableServiceRate,
            amount: String(sourceReservation.pointEarned ?? getDefaultPointAwardAmount(nextDisplayPrice)),
        });
        setMode('view');
    };

    const handleBack = () => {
        if (isHistoryOpen) {
            setIsHistoryOpen(false);
            return;
        }

        if (mode === 'confirming' || mode === 'pastConfirm') {
            setMode('editing');
        } else if (mode === 'editing' || mode === 'cancelling' || mode === 'noshow' || mode === 'payment') {
            handleCancel();
        } else {
            onClose();
        }
    };

    const isCancelled = sourceReservation.status === 'cancelled';
    const isCompleted = sourceReservation.status === 'completed';
    const isNoshow = sourceReservation.status === 'noshow';
    const isInactive = isCancelled || isNoshow || isCompleted;
    const isNaverBooking = Boolean(sourceReservation.naverBookingId);
    const dialogLabel = MODE_LABELS[mode] ?? '예약 상세';
    const headerService = mode === 'view' ? draftReservation.service : form.service;
    const dialogTitle = mode === 'editing'
        ? (customer?.name ?? '예약 수정')
        : (MODE_LABELS[mode] ?? (customer?.name ?? '예약 상세'));
    const dialogRef = useDialogAccessibility<HTMLDivElement>(handleBack);

    if (!modalRoot) return null;

    return createPortal(<><StyledReservationOverlay onClick={handleBack}
                                                  role="dialog"
                                                  aria-modal="true"
                                                  aria-label={dialogLabel}
                                                  id={layerId}
                                                  data-layer-id={layerDataId}
                                                  $stacked={selectedCustomerId !== null}>
        <StyledDetail ref={dialogRef}
                      tabIndex={-1}
                      onClick={(e) => e.stopPropagation()}
                      $width={400}>
            <ReservationDetailHeader
                title={dialogTitle}
                service={headerService}
                serviceColorMap={serviceColorMap}
                onClose={handleBack}
            />

            {mode === 'view' && (
                <ReservationViewSection
                    reservation={draftReservation}
                    customerMap={customerMap}
                    displayPrice={displayPrice}
                    displayDesignerName={displayDesignerName}
                    displayDesignerColor={displayDesignerColor}
                    isNewCustomer={isNewCustomerVisit(customer?.firstVisitDate, sourceReservation.date)}
                    paymentCompleted={paymentCompleted}
                    paymentLines={paymentLines}
                    historyCount={thisHistory.length}
                    serviceColorMap={serviceColorMap}
                    onCustomerClick={onCustomerClick}
                    onOpenHistory={() => setIsHistoryOpen(true)}
                />
            )}

            {mode === 'editing' && (
                <ReservationEditSection
                    form={form}
                    priceInputValue={priceInputValue}
                    error={error}
                    customerMemoTags={customer?.memoTags ?? []}
                    activeDesigners={activeDesigners}
                    onLeaveDesigners={onLeaveDesigners}
                    resignedDesigners={resignedDesigners}
                    currentDesigner={currentDesigner}
                    selectedServices={selectedServices}
                    totalDuration={totalDuration}
                    totalPrice={totalPrice}
                    onServiceToggle={handleServiceToggle}
                    onPriceChange={(value) => {
                        const raw = value.replace(/[^0-9]/g, '');
                        const num = raw === '' ? 0 : parseInt(raw, 10);
                        setPriceInputValue(raw);
                        setForm((f) => ({...f, price: num}));
                        setIsPriceManual(true);
                        setError(null);
                    }}
                    onDesignerChange={(designerId) => {
                        setForm((prev) => ({...prev, designerId}));
                        setError(null);
                    }}
                    onFieldChange={handleChange}
                    onStartTimeChange={handleStartTimeChange}
                    onEndTimeChange={handleEndTimeChange}
                />
            )}

            {mode === 'confirming' && (
                <ReservationDiffSection message="수정하시겠습니까?" diffs={changedFields} />
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
                        {label: '서비스', value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                />
            )}

            {mode === 'deleting' && (
                <ReservationStaticDiffSection
                    message="이 예약을 영구 삭제하시겠습니까? (되돌릴 수 없습니다)"
                    color="var(--danger-color)"
                    items={[
                        {label: '서비스', value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                />
            )}

            {mode === 'completing' && (
                <ReservationStaticDiffSection
                    message="이 예약을 완료 처리하시겠습니까?"
                    color="var(--blue-color)"
                    items={[
                        {label: '서비스', value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                />
            )}

            {mode === 'payment' && (
                <ReservationDetailPaymentLayer
                    paymentEntries={paymentEntries}
                    pointAward={pointAward}
                    customerPoints={customer?.points ?? 0}
                    showPointAward={showPointAward}
                    error={error?.message ?? ''}
                    paymentMethodOptions={PAYMENT_METHOD_OPTIONS}
                    totalPrice={displayPrice}
                    naverDeposit={sourceReservation.naverDeposit ?? 0}
                    onChangeEntryMethod={(index, value) => {
                        handlePaymentEntriesChange(paymentEntries.map((item, itemIndex) => (
                            itemIndex === index ? {...item, method: value} : item
                        )));
                    }}
                    onChangeEntryAmount={(index, value) => {
                        const normalizedValue = value.replace(/[^0-9]/g, '');
                        handlePaymentEntriesChange(paymentEntries.map((item, itemIndex) => (
                            itemIndex === index ? {...item, amount: normalizedValue} : item
                        )));
                    }}
                    onTogglePointAward={(enabled) => {
                        setPointAward((prev) => ({
                            ...prev,
                            enabled,
                        }));
                        setError(null);
                    }}
                    onChangePointAwardAmount={(value) => {
                        setIsPointAwardManual(true);
                        setPointAward((prev) => ({
                            ...prev,
                            amount: value.replace(/[^0-9]/g, ''),
                        }));
                        setError(null);
                    }}
                    onRemoveEntry={(index) => {
                        handlePaymentEntriesChange(
                            paymentEntries.length > 1
                                ? paymentEntries.filter((_, itemIndex) => itemIndex !== index)
                                : [{method: '', amount: ''}]
                        );
                    }}
                    onAddEntry={() => handlePaymentEntriesChange([...paymentEntries, {method: '', amount: ''}])}
                    onNavigateToPoints={() => router.push('/settings/point')}
                />
            )}

            {mode === 'noshow' && (
                <ReservationStaticDiffSection
                    message="이 예약을 노쇼 처리하시겠습니까?"
                    color="var(--warning-color)"
                    items={[
                        {label: '서비스', value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                />
            )}

            <ReservationFooter
                actions={(
                    <ReservationDetailFooterActions
                        mode={mode}
                        isInactive={isInactive}
                        isCompleted={isCompleted}
                        paymentCompleted={paymentCompleted}
                        isNaverBooking={isNaverBooking}
                        onOpenCompleting={() => {
                            if (!hasCompletedPayment(sourceReservation)) {
                                setError({field: 'general', message: '결제 완료된 예약만 완료 처리할 수 있습니다.'});
                                return;
                            }
                            setError(null);
                            setMode('completing');
                        }}
                        onOpenCancelling={() => setMode('cancelling')}
                        onOpenNoshow={() => setMode('noshow')}
                        onOpenPayment={() => {
                            setPaymentEntries(getPaymentEntryDrafts(sourceReservation, displayPrice, sourceReservation.naverDeposit ?? 0));
                            setIsPointAwardManual(false);
                            setPointAward({
                                enabled: (sourceReservation.pointEarned ?? 0) > 0 || storeSettings.pointSettings.enableServiceRate,
                                amount: String(sourceReservation.pointEarned ?? getDefaultPointAwardAmount(displayPrice)),
                            });
                            setError(null);
                            setMode('payment');
                        }}
                        onOpenEditing={() => setMode('editing')}
                        onCancelEdit={handleCancel}
                        onConfirmRequest={handleConfirmRequest}
                        onConfirmSave={handleConfirmSave}
                        onCancelReservation={() => onCancel(sourceReservation)}
                        onNoshowReservation={() => onCancel(sourceReservation, 'noshow')}
                        onOpenRestoring={() => setIsRestoringOpen(true)}
                        onRestoreReservation={() => onRestore(sourceReservation)}
                        canDelete={canDelete}
                        onOpenDeleting={() => setMode('deleting')}
                        onDeleteReservation={() => {
                            onDelete?.(sourceReservation);
                            onClose();
                        }}
                        onPaymentSave={handlePaymentSave}
                        onBackToEditing={() => setMode('editing')}
                        onBackToView={() => setMode('view')}
                    />
                )}
            />
        </StyledDetail>
        <ReservationHistoryLayer
            history={thisHistory}
            designerNameMap={designerNameMap}
            getHistoryDiffs={getHistoryDiffs}
            formatTimestamp={formatTimestamp}
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
        />
    </StyledReservationOverlay>
    {isRestoringOpen && (
        <StyledRestoreOverlay onClick={() => setIsRestoringOpen(false)}>
            <StyledRestoreModal onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitle>예약 전환</StyledHeaderTitle>
                    <CloseIconButton onClick={() => setIsRestoringOpen(false)} />
                </StyledHeader>
                <StyledRestoreBody>
                    <StyledRestoreMessage>취소된 예약을 되돌리시겠습니까?</StyledRestoreMessage>
                    <StyledRestoreList>
                        <StyledRestoreTerm>서비스</StyledRestoreTerm>
                        <StyledRestoreDesc>{reservation.service}</StyledRestoreDesc>
                        <StyledRestoreTerm>날짜</StyledRestoreTerm>
                        <StyledRestoreDesc>{reservation.date}</StyledRestoreDesc>
                        <StyledRestoreTerm>시간</StyledRestoreTerm>
                        <StyledRestoreDesc>{reservation.startTime} ~ {reservation.endTime}</StyledRestoreDesc>
                        <StyledRestoreTerm>고객명</StyledRestoreTerm>
                        <StyledRestoreDesc>{customer?.name ?? '-'}</StyledRestoreDesc>
                    </StyledRestoreList>
                </StyledRestoreBody>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={() => setIsRestoringOpen(false)}>취소</StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={() => {
                        setIsRestoringOpen(false);
                        onRestore(sourceReservation);
                    }}>확인</StyledActionButton>
                </StyledFooter>
            </StyledRestoreModal>
        </StyledRestoreOverlay>
    )}
    </>, modalRoot);
};
