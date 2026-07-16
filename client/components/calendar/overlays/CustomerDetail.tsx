import {useCallback, useEffect, useMemo, useState} from 'react';

import {createPortal} from 'react-dom';
import {useSession} from 'next-auth/react';

import {ConfirmDialog} from '../../ui/ConfirmDialog';
import type {Customer, CustomerMemoTag, PointHistoryEntry} from '../../../utils/customers';
import type {Reservation, ReservationMap} from '../../../utils/reservations';
import {groupByDate} from '../../../utils/reservations';

import {
    StyledHeader,
    StyledHeaderTitle,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';

import {buildAssigneeColorMap, buildAssigneeNameMap} from '../../../utils/assignees';
import {buildServiceColorMap, formatPrice} from '../../../utils/services';
import {formatTel, normalizeTel, toCustomerMap} from '../../../utils/customers';
import {shouldUseLocalDb} from '../../../lib/local-db';
import type {Customer as CustomerType} from '../../../utils/customers';
import {useCalendarStore} from '../../../store/calendarStore';
import {useToastStore} from '../../../store/toastStore';
import {CustomerReservationCards} from '../../ui/CustomerReservationCards';
import {
    CustomerMemoTagSection,
    CustomerPointHistoryModal,
    CustomerUnmergeModal,
    MEMO_TAG_COLORS,
    PointHistoryItem,
    type MergeHistorySummary,
} from './CustomerDetailSections';
import {
    StyledCustomerOverlay,
    StyledCustomerDetail,
    StyledCustomerContent,
    StyledHeaderActions,
    StyledHeaderActionButton,
    StyledHeaderCloseButton,
    StyledInfo,
    StyledInfoList,
    StyledInfoTerm,
    StyledInfoDesc,
    StyledTelLink,
    StyledNoshowCount,
    StyledEditFields,
    StyledEditFieldLabel,
    StyledEditFieldLabelText,
    StyledEditFieldInput,
    StyledPointInfo,
    StyledDupWarning,
    StyledDupWarningText,
    StyledDupWarningActions,
    StyledDupWarningButton,
    StyledReservationSection,
    StyledPointHistorySection,
    StyledPointHistoryTitle,
    StyledPointHistoryHeader,
    StyledPointHistoryMoreButton,
    StyledEmptyText,
    StyledPointHistoryList,
    StyledReservationScroll,
    StyledReservationTitle,
    StyledMoreButton,
} from './CustomerDetail.styles';

const PAGE_SIZE = 5;

interface CustomerDetailProps {
    customer: Customer;
    reservationMap: ReservationMap;
    onClose: () => void;
    onReservationClick?: (reservation: Reservation) => void;
}

type CustomerEditForm = {
    name: string;
    tel: string;
    memoTags: CustomerMemoTag[];
};

function buildCustomerEditForm(customer: Customer): CustomerEditForm {
    return {
        name: customer.name ?? '',
        tel: customer.tel ?? '',
        memoTags: [...(customer.memoTags ?? [])],
    };
}

export const CustomerDetail = ({customer, reservationMap, onClose, onReservationClick}: CustomerDetailProps) => {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [isPointHistoryOpen, setIsPointHistoryOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<CustomerEditForm>(() => buildCustomerEditForm(customer));
    const [newTagText, setNewTagText] = useState('');
    const [selectedTagColor, setSelectedTagColor] = useState(MEMO_TAG_COLORS[0]);
    const [editError, setEditError] = useState('');
    const [mergeHistories, setMergeHistories] = useState<MergeHistorySummary[]>([]);
    const [isUnmergeConfirm, setIsUnmergeConfirm] = useState(false);
    const [isUnmerging, setIsUnmerging] = useState(false);
    // 수정 저장 시 같은 번호를 쓰는 다른 고객이 있으면 여기 담아 경고·병합 유도.
    const [dupWarning, setDupWarning] = useState<{match: Customer; name: string; tel: string} | null>(null);
    const [isMergingDup, setIsMergingDup] = useState(false);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const deleteCustomer = useCalendarStore((s) => s.deleteCustomer);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const {data: session} = useSession();
    const isOwner = session?.user?.role === 'owner';
    const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
    const toast = useToastStore((s) => s.show);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('customer-detail');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const assigneeColorMap = useMemo(() => buildAssigneeColorMap(assignees), [assignees]);
    const assigneeNameMap = useMemo(() => buildAssigneeNameMap(assignees), [assignees]);

    const customerReservations = useMemo(() => {
        const list: Reservation[] = [];

        for (const items of Object.values(reservationMap)) {
            for (const r of items) {
                if (r.customerId === customer.id) {
                    list.push(r);
                }
            }
        }

        list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
        return list;
    }, [reservationMap, customer.id]);

    const noshowCount = useMemo(() => customerReservations.filter((r) => r.status === 'noshow').length, [customerReservations]);
    const visibleList = customerReservations.slice(0, visibleCount);
    const hasMore = visibleCount < customerReservations.length;
    const pointHistories = [...(customer.pointHistories ?? [])].reverse();
    const allReservations = useMemo(() => Object.values(reservationMap).flat(), [reservationMap]);
    const handlePointHistoryClick = (entry: PointHistoryEntry) => {
        if (!entry.relatedReservationId || !onReservationClick) return;
        const reservation = allReservations.find((r) => r.id === entry.relatedReservationId);
        if (reservation) onReservationClick(reservation);
    };
    const displayMemoTags = isEditing ? editForm.memoTags : (customer.memoTags ?? []);
    const today = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/customers/merge-history?customerId=${customer.id}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (!cancelled && data?.histories) {
                    setMergeHistories(data.histories);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [customer.id]);

    const handleUnmerge = useCallback(async () => {
        if (mergeHistories.length === 0 || isUnmerging) return;
        setIsUnmerging(true);

        try {
            const resp = await fetch('/api/customers/unmerge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({mergeHistoryIds: mergeHistories.map((h) => h.id)}),
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => null);
                toast(err?.error || '분리에 실패했습니다.', 'error');
                return;
            }

            // 고객 데이터 리로드
            const custRes = await fetch('/api/customers');
            if (custRes.ok) {
                const custData = await custRes.json() as {customers: CustomerType[]};
                setCustomerMap(toCustomerMap(custData.customers));
            }

            onClose();
        } catch {
            toast('분리 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsUnmerging(false);
            setIsUnmergeConfirm(false);
        }
    }, [mergeHistories, isUnmerging, setCustomerMap, onClose]);

    const handleFieldChange = (field: keyof Omit<CustomerEditForm, 'memoTags'>, value: string) => {
        setEditForm((prev) => ({...prev, [field]: value}));
        setEditError('');
        setDupWarning(null);
    };

    const handleStartEdit = () => {
        setEditForm(buildCustomerEditForm(customer));
        setNewTagText('');
        setSelectedTagColor(MEMO_TAG_COLORS[0]);
        setEditError('');
        setDupWarning(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditForm(buildCustomerEditForm(customer));
        setNewTagText('');
        setSelectedTagColor(MEMO_TAG_COLORS[0]);
        setEditError('');
        setDupWarning(null);
        setIsEditing(false);
    };

    const handleAddTag = () => {
        const value = newTagText.trim();
        if (!value) return;
        if (editForm.memoTags.some((tag) => tag.text === value)) {
            setEditError('같은 메모 태그가 이미 있습니다.');
            return;
        }

        setEditForm((prev) => ({
            ...prev,
            memoTags: [...prev.memoTags, {text: value, color: selectedTagColor}],
        }));
        setNewTagText('');
        setEditError('');
    };

    const handleRemoveTag = (text: string) => {
        setEditForm((prev) => ({
            ...prev,
            memoTags: prev.memoTags.filter((tag) => tag.text !== text),
        }));
        setEditError('');
    };

    const commitEdit = (nextName: string, nextTel: string) => {
        updateCustomer(customer.id, {
            name: nextName,
            tel: nextTel,
            memoTags: editForm.memoTags,
        });
        setEditError('');
        setDupWarning(null);
        setIsEditing(false);
    };

    const handleSaveEdit = () => {
        const nextName = editForm.name.trim();
        const nextTel = normalizeTel(editForm.tel);

        if (!nextName) {
            setEditError('고객명을 입력해 주세요.');
            return;
        }

        if (!nextTel) {
            setEditError('연락처를 입력해 주세요.');
            return;
        }

        // 같은 매장 내 다른 고객이 이미 이 번호를 쓰면 하드 차단 대신 경고·병합 유도.
        // (가족 공유번호 등 정상 케이스가 있어 차단하지 않는다. 이름 중복은 검증 안 함.)
        const telDup = Object.values(customerMap).find(
            (c) => c.id !== customer.id && !!c.tel && normalizeTel(c.tel) === nextTel,
        );
        if (telDup) {
            setEditError('');
            setDupWarning({match: telDup, name: nextName, tel: nextTel});
            return;
        }

        commitEdit(nextName, nextTel);
    };

    // "같은 분이에요" → 편집 중 고객을 기존 번호 보유 고객으로 병합.
    // target = 기존 번호 보유 고객, source = 현재(편집 중) 고객. 예약·포인트·메모 이전 후
    // source 삭제(분리로 복원 가능). 현재 레이어의 고객은 사라지므로 병합 후 닫는다.
    const handleMergeDuplicate = async () => {
        if (!dupWarning || isMergingDup) return;
        setIsMergingDup(true);
        try {
            const res = await fetch('/api/customers/merge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sourceIds: [customer.id], targetId: dupWarning.match.id}),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null) as {error?: string} | null;
                toast(err?.error ? `병합 실패: ${err.error}` : `병합 실패 (오류 ${res.status})`, 'error');
                return;
            }

            // 고객·예약 데이터 리로드 후 레이어 닫기.
            const [custRes, resRes] = await Promise.all([
                fetch('/api/customers'),
                fetch('/api/reservations'),
            ]);
            if (custRes.ok) {
                const custData = await custRes.json() as {customers: Customer[]};
                setCustomerMap(toCustomerMap(custData.customers));
            }
            if (resRes.ok) {
                const resData = await resRes.json() as {reservations: Reservation[]};
                setReservationMap(groupByDate(resData.reservations));
            }

            toast('병합 완료', 'success');
            setDupWarning(null);
            onClose();
        } catch {
            toast('병합 중 네트워크 오류가 발생했습니다.', 'error');
        } finally {
            setIsMergingDup(false);
        }
    };

    if (!modalRoot) return null;

    return createPortal(<><StyledCustomerOverlay onClick={onClose}
                                               role="dialog"
                                               aria-modal="true"
                                               aria-label="고객 정보"
                                               id={layerId}
                                               data-layer-id={layerDataId}>
        <StyledCustomerDetail ref={dialogRef}
                              tabIndex={-1}
                              onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <StyledHeaderTitle>{customer.name}</StyledHeaderTitle>
                <StyledHeaderActions>
                    {isEditing ? (
                        <>
                            <StyledHeaderActionButton type="button"
                                                      onClick={handleCancelEdit}>취소</StyledHeaderActionButton>
                            <StyledHeaderActionButton type="button"
                                                      $primary
                                                      onClick={handleSaveEdit}>저장</StyledHeaderActionButton>
                        </>
                    ) : (
                        <>
                            {mergeHistories.length > 0 && (
                                <StyledHeaderActionButton type="button"
                                                          $danger
                                                          onClick={() => setIsUnmergeConfirm(true)}>분리</StyledHeaderActionButton>
                            )}
                            <StyledHeaderActionButton type="button"
                                                      onClick={handleStartEdit}>수정</StyledHeaderActionButton>
                            {isOwner && (
                                <StyledHeaderActionButton type="button"
                                                          $danger
                                                          onClick={() => setIsDeleteConfirm(true)}>삭제</StyledHeaderActionButton>
                            )}
                        </>
                    )}
                    <StyledHeaderCloseButton onClick={onClose} />
                </StyledHeaderActions>
            </StyledHeader>
            <StyledCustomerContent>
                <StyledInfo>
                    {isEditing ? (
                        <StyledEditFields>
                            <StyledEditFieldLabel htmlFor="customer-edit-name">
                                <StyledEditFieldLabelText>고객명</StyledEditFieldLabelText>
                                <StyledEditFieldInput
                                    id="customer-edit-name"
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                />
                            </StyledEditFieldLabel>
                            <StyledEditFieldLabel htmlFor="customer-edit-tel">
                                <StyledEditFieldLabelText>연락처</StyledEditFieldLabelText>
                                <StyledEditFieldInput
                                    id="customer-edit-tel"
                                    type="text"
                                    value={editForm.tel}
                                    onChange={(e) => handleFieldChange('tel', e.target.value)}
                                />
                            </StyledEditFieldLabel>
                            <StyledPointInfo>적립금 {formatPrice(customer.points ?? 0)}</StyledPointInfo>
                            {dupWarning && (
                                <StyledDupWarning role="alert">
                                    <StyledDupWarningText>
                                        이 번호는 이미 <strong>{dupWarning.match.name}</strong> 고객에게 등록되어 있습니다. 같은 분이면 병합하고, 다른 분(가족 공유번호 등)이면 그대로 저장하세요.
                                    </StyledDupWarningText>
                                    <StyledDupWarningActions>
                                        {!shouldUseLocalDb() && (
                                            <StyledDupWarningButton type="button"
                                                                    $variant="merge"
                                                                    disabled={isMergingDup}
                                                                    onClick={handleMergeDuplicate}>
                                                {isMergingDup ? '병합 중…' : `${dupWarning.match.name} 고객과 병합`}
                                            </StyledDupWarningButton>
                                        )}
                                        <StyledDupWarningButton type="button"
                                                                $variant="keep"
                                                                disabled={isMergingDup}
                                                                onClick={() => commitEdit(dupWarning.name, dupWarning.tel)}>
                                            다른 분 — 그대로 저장
                                        </StyledDupWarningButton>
                                        <StyledDupWarningButton type="button"
                                                                $variant="cancel"
                                                                disabled={isMergingDup}
                                                                onClick={() => setDupWarning(null)}>
                                            취소
                                        </StyledDupWarningButton>
                                    </StyledDupWarningActions>
                                </StyledDupWarning>
                            )}
                        </StyledEditFields>
                    ) : (
                        <StyledInfoList>
                            <StyledInfoTerm>연락처</StyledInfoTerm>
                            <StyledInfoDesc><StyledTelLink href={`tel:${customer.tel}`}>{formatTel(customer.tel)}</StyledTelLink></StyledInfoDesc>
                            <StyledInfoTerm>적립금</StyledInfoTerm>
                            <StyledInfoDesc>{formatPrice(customer.points ?? 0)}</StyledInfoDesc>
                            <StyledInfoTerm>노쇼</StyledInfoTerm>
                            <StyledInfoDesc><StyledNoshowCount $hasNoshow={noshowCount > 0}>{noshowCount}회</StyledNoshowCount></StyledInfoDesc>
                        </StyledInfoList>
                    )}
                </StyledInfo>
                <CustomerMemoTagSection customerId={customer.id}
                                        isEditing={isEditing}
                                        tags={displayMemoTags}
                                        newTagText={newTagText}
                                        selectedTagColor={selectedTagColor}
                                        editError={editError}
                                        onNewTagTextChange={(value) => {
                                            setNewTagText(value);
                                            setEditError('');
                                        }}
                                        onSelectTagColor={setSelectedTagColor}
                                        onAddTag={handleAddTag}
                                        onRemoveTag={handleRemoveTag} />
                <StyledPointHistorySection>
                    <StyledPointHistoryHeader>
                        <StyledPointHistoryTitle>적립금 이력 ({pointHistories.length})</StyledPointHistoryTitle>
                        {pointHistories.length > 1 && (
                            <StyledPointHistoryMoreButton type="button" onClick={() => setIsPointHistoryOpen(true)}>
                                더보기
                            </StyledPointHistoryMoreButton>
                        )}
                    </StyledPointHistoryHeader>
                    {pointHistories.length === 0 ? (
                        <StyledEmptyText>적립금 이력이 없습니다.</StyledEmptyText>
                    ) : (
                        <StyledPointHistoryList>
                            <PointHistoryItem entry={pointHistories[0]} onClick={handlePointHistoryClick} />
                        </StyledPointHistoryList>
                    )}
                </StyledPointHistorySection>
                <StyledReservationSection>
                    <StyledReservationScroll>
                        <StyledReservationTitle>예약 내역 ({customerReservations.length})</StyledReservationTitle>
                        <CustomerReservationCards reservations={visibleList}
                                                  assigneeColorMap={assigneeColorMap}
                                                  assigneeNameMap={assigneeNameMap}
                                                  serviceColorMap={serviceColorMap}
                                                  today={today}
                                                  onReservationClick={onReservationClick} />
                        {hasMore && <StyledMoreButton type="button"
                                                      onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                            더보기
                        </StyledMoreButton>}
                    </StyledReservationScroll>
                </StyledReservationSection>
            </StyledCustomerContent>
        </StyledCustomerDetail>
    </StyledCustomerOverlay>
    {isPointHistoryOpen && pointHistories.length > 0 && (
        <CustomerPointHistoryModal pointHistories={pointHistories}
                                   onEntryClick={handlePointHistoryClick}
                                   onClose={() => setIsPointHistoryOpen(false)} />
    )}
    {isUnmergeConfirm && mergeHistories.length > 0 && (
        <CustomerUnmergeModal customerName={customer.name}
                              histories={mergeHistories}
                              isUnmerging={isUnmerging}
                              onConfirm={handleUnmerge}
                              onClose={() => setIsUnmergeConfirm(false)} />
    )}
    {isDeleteConfirm && (
        <ConfirmDialog title="고객 삭제"
                       message={customerReservations.length > 0
                           ? `${customer.name} 고객을 삭제하면 예약 ${customerReservations.length}건과 적립금·메모도 함께 영구 삭제됩니다. 되돌릴 수 없습니다.`
                           : `${customer.name} 고객을 영구 삭제합니다. 되돌릴 수 없습니다.`}
                       confirmLabel="삭제"
                       confirmVariant="danger"
                       onConfirm={() => {
                           deleteCustomer(customer.id);
                           setIsDeleteConfirm(false);
                           onClose();
                       }}
                       onClose={() => setIsDeleteConfirm(false)} />
    )}
    </>, modalRoot);
};
