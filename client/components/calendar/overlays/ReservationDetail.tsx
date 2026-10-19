import {useEffect, useMemo, useState} from 'react';

import {createPortal} from 'react-dom';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';
import {serverReservationId, useCalendarStore} from '../../../store/calendarStore';
import {useStoreLabels} from '../../../hooks/useStoreLabels';

import type {PaymentEntry, Reservation, ReservationHistoryEntry, ReservationMap, ReservationStatus} from '../../../utils/reservations';
import {findOverlap, hasCompletedPayment, isOnlineReservation, isRevenuePaymentMethod} from '../../../utils/reservations';
import {useCustomerBenefits} from '../../../hooks/useCustomerBenefits';
import {useToastStore} from '../../../store/toastStore';
import {useSingleFlight} from '../../../hooks/useSingleFlight';
import {computeCouponDiscount} from '../../../features/coupons/model';
import type {BenefitCoupon, BenefitMembership} from '../../../features/customers/benefits';
import {isNewCustomerVisit} from '../../../utils/customers';
import type {CustomerMap} from '../../../utils/customers';
import {buildAssigneeNameMap, getAssigneeAvailabilityState, getAssigneeColor, splitAssigneesByStatus} from '../../../utils/assignees';
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
import type {PaymentEntryDraft, PointAwardDraft, ReservationDetailMode} from './reservationDetailTypes';
import {
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
    onCancel: (reservation: Reservation, status?: ReservationStatus, reason?: string) => void;
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
    const labels = useStoreLabels();
    const {data: session} = useSession();
    const canDelete = !!onDelete && (session?.user?.role === 'owner' || session?.user?.role === 'manager');
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
    const assignees = useCalendarStore((s) => s.assignees);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const storeSettings = useCalendarStore((s) => s.storeSettings);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const {
        active: activeAssignees,
        onLeave: onLeaveAssignees,
        resigned: resignedAssignees
    } = splitAssigneesByStatus(assignees);
    const currentAssignee = sourceReservation.assigneeId
        ? assignees.find((assignee) => assignee.id === sourceReservation.assigneeId) ?? null
        : null;
    const assigneeNameMap = buildAssigneeNameMap(assignees, true);
    const serviceColorMap = buildServiceColorMap(serviceCatalog, categoryBaseColorMap);
    const catalogMap = useMemo(() => buildCatalogMap(serviceCatalog), [serviceCatalog]);
    const knownServiceNames = useMemo(() => new Set(Object.keys(serviceColorMap)), [serviceColorMap]);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('reservation-detail');
    const getDefaultPointAwardAmount = (baseAmount: number) => Math.floor((baseAmount * storeSettings.pointSettings.serviceRate) / 100);
    const latestKnownAssigneeId = sourceReservation.assigneeId ?? history.reduce<number | undefined>((found, entry) => {
        if (found) return found;
        const afterAssigneeId = entry.after?.assigneeId;
        if (typeof afterAssigneeId === 'number' && afterAssigneeId > 0) return afterAssigneeId;
        const beforeAssigneeId = entry.before?.assigneeId;
        if (typeof beforeAssigneeId === 'number' && beforeAssigneeId > 0) return beforeAssigneeId;
        return undefined;
    }, undefined);

    const [mode, setMode] = useState<ReservationDetailMode>('view');
    // 온라인 예약 승인/거절/취소 사유(선택). 확인 레이어를 열 때 초기화한다.
    const [decisionReason, setDecisionReason] = useState('');
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
    const [paymentEntries, setPaymentEntries] = useState<PaymentEntryDraft[]>(
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

    const changedFields = getChangedFields(sourceReservation, form, assigneeNameMap);
    const thisHistory = history.filter((h) => h.reservationId === sourceReservation.id);
    const totalDuration = sumDurationMinutes(selectedServices, catalogMap);
    const totalPrice = sumPrice(selectedServices, catalogMap);
    const displayAssigneeName = draftReservation.assigneeId
        ? (assigneeNameMap[draftReservation.assigneeId] ?? '미지정')
        : '미지정';
    const displayAssigneeColor = draftReservation.assigneeId
        ? getAssigneeColor(assignees.find((assignee) => assignee.id === draftReservation.assigneeId))
        : '#8E8E93';
    const normalizedPaymentEntries = getPaymentEntries(sourceReservation);
    const paymentCompleted = hasCompletedPayment(sourceReservation);
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
        if (activeAssignees.length > 0 && !form.assigneeId) return {field: 'assignee', message: `${labels.assignee}를 선택해주세요.`};
        if (!form.service.trim()) return {field: 'service', message: `${labels.service}를 선택해주세요.`};
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

    const syncPointAward = (entries: PaymentEntryDraft[]) => {
        if (!storeSettings.pointSettings.enableServiceRate || isPointAwardManual) return;

        // 받은 돈에만 적립한다 — 적립금·할인(쿠폰)으로 낸 만큼은 빼고 계산.
        const nonPointPaidAmount = entries.reduce((sum, entry) => {
            if (!entry.method || !isRevenuePaymentMethod(entry.method)) return sum;
            return sum + (Number(entry.amount.replace(/[^0-9]/g, '')) || 0);
        }, 0);

        setPointAward((prev) => ({
            ...prev,
            enabled: true,
            amount: String(Math.floor((nonPointPaidAmount * storeSettings.pointSettings.serviceRate) / 100)),
        }));
    };

    const handlePaymentEntriesChange = (nextEntries: PaymentEntryDraft[]) => {
        setPaymentEntries(nextEntries);
        syncPointAward(nextEntries);
        setError(null);
    };

    // ── 쿠폰 ── 이 고객이 쓸 수 있는 쿠폰 + 이 예약에 이미 쓴 쿠폰(사용됨이라 목록엔 없다)
    const {benefits} = useCustomerBenefits(customer?.id);
    const usedCoupon = sourceReservation.usedCoupon;
    const couponOptions = useMemo<BenefitCoupon[]>(() => {
        const usable = benefits?.coupons ?? [];
        return usedCoupon && !usable.some((c) => c.id === usedCoupon.id) ? [usedCoupon, ...usable] : usable;
    }, [benefits, usedCoupon]);
    const paymentExpectedAmount = displayPrice - (sourceReservation.naverDeposit ?? 0);
    // 결제 줄 합계가 맞춰야 할 금액. '네이버 예약금' 줄이 있으면 그 줄이 예약금을 이미 담으니 서비스 금액 전체,
    // 없으면 예약금을 뺀 실결제 금액. (기본 줄은 예약금 줄을 넣어 전체 금액이 되는데, 검사는 실결제만 받아 저장이 막혔다.)
    // 금액이 0 인 줄은 저장 때 빠지므로 판정에서도 뺀다 — 자동 채우기와 저장 검사가 같은 기준을 쓰게.
    const paymentTargetFor = (entries: Array<{method: string; amount: string | number}>) => (
        entries.some((entry) => entry.method === '네이버 예약금' && Number(String(entry.amount).replace(/[^0-9]/g, '')) > 0)
            ? displayPrice
            : paymentExpectedAmount
    );
    const selectedCouponId = paymentEntries.find((entry) => entry.couponId)?.couponId ?? '';

    // ── 회원권 ── 쓸 수 있는 회원권 + 이 예약에 이미 쓴 회원권
    const usedMembership = sourceReservation.usedMembership;
    const membershipOptions = useMemo<BenefitMembership[]>(() => {
        const usable = benefits?.memberships ?? [];
        return usedMembership && !usable.some((m) => m.id === usedMembership.id) ? [usedMembership, ...usable] : usable;
    }, [benefits, usedMembership]);
    const selectedMembershipId = paymentEntries.find((entry) => entry.membershipId)?.membershipId ?? '';
    const toAmount = (value: string) => Number(value.replace(/[^0-9]/g, '')) || 0;

    // 회원권을 고르면 남은 금액 전부를 '회원권' 줄로 낸다(쿠폰·네이버 예약금 줄은 그대로, 직접 입력 줄은 걷음).
    // 빼면 남은 금액을 직접 입력 줄 하나로 돌려 놓는다.
    const handleSelectMembership = (membershipId: string) => {
        const kept = paymentEntries.filter((entry) => !entry.membershipId && (entry.couponId || entry.method === '네이버 예약금'));
        const keptTotal = kept.reduce((sum, entry) => sum + toAmount(entry.amount), 0);
        const remainder = String(Math.max(paymentTargetFor(kept) - keptTotal, 0));
        handlePaymentEntriesChange(membershipId
            ? [...kept, {method: '회원권', amount: remainder, membershipId}]
            : [...kept, {method: '', amount: remainder}]);
    };

    // 쿠폰 줄을 넣거나 빼고, 직접 입력하는 결제 줄이 하나뿐이면 남은 금액으로 맞춘다(네이버 예약금·쿠폰 줄은 그대로).
    const handleSelectCoupon = (couponId: string) => {
        const others = paymentEntries.filter((entry) => !entry.couponId);
        let discountEntry: PaymentEntryDraft | null = null;
        if (couponId) {
            const coupon = couponOptions.find((c) => c.id === couponId);
            const discount = coupon ? computeCouponDiscount(coupon, paymentExpectedAmount) : null;
            if (!coupon || discount == null) {
                setError({field: 'general', message: '이 결제 금액에는 쓸 수 없는 쿠폰입니다.'});
                return;
            }
            discountEntry = {method: '할인', amount: String(discount), couponId};
        }
        const editable = others.filter((entry) => entry.method !== '네이버 예약금');
        const next = [...others];
        if (editable.length === 1) {
            const fixed = next
                .filter((entry) => entry !== editable[0])
                .reduce((sum, entry) => sum + (Number(entry.amount.replace(/[^0-9]/g, '')) || 0), 0);
            const remainder = paymentTargetFor(next) - fixed - (discountEntry ? Number(discountEntry.amount) : 0);
            next[next.indexOf(editable[0])] = {...editable[0], amount: String(Math.max(remainder, 0))};
        }
        handlePaymentEntriesChange(discountEntry ? [...next, discountEntry] : next);
    };

    // 결제 저장 중 연타 방지(쿠폰 사용 요청이 두 번 가지 않게).
    const paymentFlight = useSingleFlight();
    const toast = useToastStore((s) => s.show);
    const postMembershipUse = async (membershipId: string, action: 'use' | 'restore') => {
        // 방금 만든 예약이면 서버 번호가 정해질 때까지 기다린다 — 화면 번호가 다른 예약의 번호일 수 있다.
        const reservationId = await serverReservationId(sourceReservation.id);
        if (reservationId == null) return '예약이 아직 저장되지 않았습니다. 새로고침 후 다시 시도해 주세요.';
        const res = await fetch('/api/membership-use', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({membershipId, action, reservationId}),
        });
        if (res.ok) return null;
        const err = await res.json().catch(() => null) as {error?: string} | null;
        return err?.error ?? '회원권 처리에 실패했습니다.';
    };
    const postCouponUse = async (couponId: string, action: 'use' | 'restore') => {
        const reservationId = await serverReservationId(sourceReservation.id);
        if (reservationId == null) return '예약이 아직 저장되지 않았습니다. 새로고침 후 다시 시도해 주세요.';
        const res = await fetch('/api/coupon-use', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            // 되돌릴 때도 예약을 보낸다 — 서버가 이 예약에 쓴 쿠폰인지 확인한다(다른 예약에 다시 쓴 쿠폰을 풀지 않게).
            body: JSON.stringify({couponId, action, reservationId}),
        });
        if (res.ok) return null;
        const err = await res.json().catch(() => null) as {error?: string} | null;
        return err?.error ?? '쿠폰 처리에 실패했습니다.';
    };

    const handlePaymentSave = () => paymentFlight.run(async () => {
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
        const expectedAmount = paymentTargetFor(normalizedEntries);
        // 예약금 줄은 실제 네이버 예약금과 같아야 한다 — 다르면 합계는 맞아도 받은 돈이 틀린다.
        const depositRows = normalizedEntries.filter((entry) => entry.method === '네이버 예약금');
        const naverDeposit = sourceReservation.naverDeposit ?? 0;
        if (naverDeposit > 0 && depositRows.length > 0 && depositRows.reduce((sum, entry) => sum + entry.amount, 0) !== naverDeposit) {
            setError({field: 'general', message: `네이버 예약금은 ${formatPrice(naverDeposit)}입니다.`});
            return;
        }

        if (paymentTotal !== expectedAmount) {
            setError({field: 'general', message: `결제 금액 합계(${formatPrice(paymentTotal)})가 ${labels.service} 금액(${formatPrice(expectedAmount)})과 일치하지 않습니다.`});
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

        // 쿠폰이 바뀌었으면 새 쿠폰을 먼저 쓰고(실패하면 저장 중단), 그다음 예전 쿠폰을 되돌린다.
        // 금액이 0 인 줄은 저장되지 않는다 — 그 줄의 쿠폰·회원권을 쓰면 결제 줄 없이 소모만 된다.
        const nextCouponId = paymentEntries.find((entry) => entry.couponId && toAmount(entry.amount) > 0)?.couponId;
        const prevCouponId = usedCoupon?.id;
        if (nextCouponId !== prevCouponId) {
            if (nextCouponId) {
                const useError = await postCouponUse(nextCouponId, 'use');
                if (useError) {
                    setError({field: 'general', message: useError});
                    return;
                }
            }
            if (prevCouponId) {
                const restoreError = await postCouponUse(prevCouponId, 'restore');
                if (restoreError) toast(`이전 쿠폰을 되돌리지 못했습니다: ${restoreError}`, 'error');
            }
        }

        // 회원권도 같은 순서 — 새 회원권 1회 사용(실패하면 저장 중단) → 예전 회원권 되돌리기.
        const nextMembershipId = paymentEntries.find((entry) => entry.membershipId && toAmount(entry.amount) > 0)?.membershipId;
        const prevMembershipId = usedMembership?.id;
        if (nextMembershipId !== prevMembershipId) {
            if (nextMembershipId) {
                const useError = await postMembershipUse(nextMembershipId, 'use');
                if (useError) {
                    setError({field: 'general', message: useError});
                    return;
                }
            }
            if (prevMembershipId) {
                const restoreError = await postMembershipUse(prevMembershipId, 'restore');
                if (restoreError) toast(`이전 회원권을 되돌리지 못했습니다: ${restoreError}`, 'error');
            }
        }

        onUpdate(sourceReservation, {
            ...sourceReservation,
            paymentCompleted: true,
            paymentMethod: normalizedEntries[0].method,
            paymentEntries: normalizedEntries,
            pointEarned: nextPointEarned,
            usedCoupon: nextCouponId ? couponOptions.find((c) => c.id === nextCouponId) : undefined,
            usedMembership: nextMembershipId ? membershipOptions.find((m) => m.id === nextMembershipId) : undefined,
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
    });

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
        } else if (mode === 'editing' || mode === 'cancelling' || mode === 'noshow' || mode === 'payment' || mode === 'approving' || mode === 'rejecting') {
            handleCancel();
        } else {
            onClose();
        }
    };

    const isCancelled = sourceReservation.status === 'cancelled';
    const isCompleted = sourceReservation.status === 'completed';
    const isNoshow = sourceReservation.status === 'noshow';
    const isInactive = isCancelled || isNoshow || isCompleted;
    // 온라인 예약 신청(확정 대기). 상세 레이어에서 바로 확정/거절할 수 있게 한다.
    const isRequested = sourceReservation.status === 'requested';

    // 예약확정/거절 → 오너 승인 API(book-requests) 재사용. legacyId로 대상 지정.
    // 성공 시 새로고침으로 캘린더·요청벨을 갱신(오너 벨과 동일 패턴).
    const decideBooking = (decision: 'approve' | 'reject') => {
        const reason = decisionReason.trim();
        fetch('/api/book-requests', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({legacyId: sourceReservation.id, decision, ...(reason ? {reason} : {})}),
        })
            .then((res) => { if (res.ok) window.location.reload(); else setError({field: 'general', message: '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'}); })
            .catch(() => setError({field: 'general', message: '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'}));
    };
    const isNaverBooking = Boolean(sourceReservation.naverBookingId);
    // 온라인 예약(고객 예약 페이지 경유)만 사유가 고객 조회 페이지에 노출된다.
    const isOnlineBooking = isOnlineReservation(sourceReservation);
    // 승인/거절/취소 확인 레이어의 사유 입력(선택). 미입력 시 고객 페이지가 기본문구로 대체.
    const decisionReasonInput = {
        label: '사유 (선택)',
        placeholder: '고객 조회 페이지에 표시됩니다. 미입력 시 기본 안내로 대체됩니다.',
        value: decisionReason,
        onChange: setDecisionReason,
    };
    // 확인 레이어를 열 때 사유를 초기화한다.
    const openWithReason = (next: ReservationDetailMode) => { setDecisionReason(''); setMode(next); };
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
                    displayAssigneeName={displayAssigneeName}
                    displayAssigneeColor={displayAssigneeColor}
                    isNewCustomer={isNewCustomerVisit(customer?.firstVisitDate, sourceReservation.date)}
                    paymentCompleted={paymentCompleted}
                    paymentEntries={normalizedPaymentEntries}
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
                    activeAssignees={activeAssignees}
                    onLeaveAssignees={onLeaveAssignees}
                    resignedAssignees={resignedAssignees}
                    currentAssignee={currentAssignee}
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
                    onAssigneeChange={(assigneeId) => {
                        setForm((prev) => ({...prev, assigneeId}));
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
                        {label: labels.service, value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                    reason={isOnlineBooking ? decisionReasonInput : undefined}
                />
            )}

            {mode === 'deleting' && (
                <ReservationStaticDiffSection
                    message="이 예약을 영구 삭제하시겠습니까? (되돌릴 수 없습니다)"
                    color="var(--danger-color)"
                    items={[
                        {label: labels.service, value: reservation.service},
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
                        {label: labels.service, value: reservation.service},
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
                    couponOptions={couponOptions}
                    selectedCouponId={selectedCouponId}
                    onSelectCoupon={handleSelectCoupon}
                    membershipOptions={membershipOptions}
                    selectedMembershipId={selectedMembershipId}
                    onSelectMembership={handleSelectMembership}
                    onRemoveEntry={(index) => {
                        // 쿠폰 줄을 지우면 쿠폰 선택도 푼다(남은 금액 다시 맞춤).
                        if (paymentEntries[index]?.couponId) {
                            handleSelectCoupon('');
                            return;
                        }
                        if (paymentEntries[index]?.membershipId) {
                            handleSelectMembership('');
                            return;
                        }
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
                        {label: labels.service, value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                />
            )}

            {mode === 'approving' && (
                <ReservationStaticDiffSection
                    message="이 예약 신청을 확정할까요?"
                    color="var(--blue-color)"
                    items={[
                        {label: labels.service, value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                    reason={decisionReasonInput}
                />
            )}

            {mode === 'rejecting' && (
                <ReservationStaticDiffSection
                    message="이 예약 신청을 거절하시겠습니까? 거절하면 취소됩니다."
                    color="var(--danger-color)"
                    items={[
                        {label: labels.service, value: reservation.service},
                        {label: '날짜', value: reservation.date},
                        {label: '시간', value: `${reservation.startTime} ~ ${reservation.endTime}`},
                        {label: '고객명', value: customer?.name ?? '-'},
                    ]}
                    reason={decisionReasonInput}
                />
            )}

            <ReservationFooter
                actions={(
                    <ReservationDetailFooterActions
                        mode={mode}
                        isInactive={isInactive}
                        isRequested={isRequested}
                        isCompleted={isCompleted}
                        paymentCompleted={paymentCompleted}
                        isNaverBooking={isNaverBooking}
                        isCustomerDeleted={!!customer?.deleted}
                        onConfirmBooking={() => openWithReason('approving')}
                        onApproveReservation={() => decideBooking('approve')}
                        onRejectBooking={() => openWithReason('rejecting')}
                        onRejectReservation={() => decideBooking('reject')}
                        onOpenCompleting={() => {
                            if (!hasCompletedPayment(sourceReservation)) {
                                setError({field: 'general', message: '결제 완료된 예약만 완료 처리할 수 있습니다.'});
                                return;
                            }
                            setError(null);
                            setMode('completing');
                        }}
                        onOpenCancelling={() => openWithReason('cancelling')}
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
                        onCancelReservation={() => onCancel(sourceReservation, 'cancelled', isOnlineBooking ? (decisionReason.trim() || undefined) : undefined)}
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
            assigneeNameMap={assigneeNameMap}
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
                        <StyledRestoreTerm>{labels.service}</StyledRestoreTerm>
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
                    }}>예약전환</StyledActionButton>
                </StyledFooter>
            </StyledRestoreModal>
        </StyledRestoreOverlay>
    )}
    </>, modalRoot);
};
