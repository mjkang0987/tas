import {useCallback, useEffect, useMemo, useState} from 'react';

import {createPortal} from 'react-dom';
import {useSession} from 'next-auth/react';

import {ConfirmDialog} from '../../ui/ConfirmDialog';
import type {Customer, CustomerMemoTag, PointHistoryEntry} from '../../../utils/customers';
import type {Reservation, ReservationMap} from '../../../utils/reservations';

import {
    StyledHeader,
    StyledHeaderTitle,
    useDialogAccessibility,
    useLayerInstanceId,
} from './ModalStyles';

import {buildAssigneeColorMap, buildAssigneeNameMap} from '../../../utils/assignees';
import {buildServiceColorMap, formatPrice} from '../../../utils/services';
import {formatTel, normalizeTel, toCustomerMap} from '../../../utils/customers';
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
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const deleteCustomer = useCalendarStore((s) => s.deleteCustomer);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
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
    };

    const handleStartEdit = () => {
        setEditForm(buildCustomerEditForm(customer));
        setNewTagText('');
        setSelectedTagColor(MEMO_TAG_COLORS[0]);
        setEditError('');
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditForm(buildCustomerEditForm(customer));
        setNewTagText('');
        setSelectedTagColor(MEMO_TAG_COLORS[0]);
        setEditError('');
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

        updateCustomer(customer.id, {
            name: nextName,
            tel: nextTel,
            memoTags: editForm.memoTags,
        });
        setEditError('');
        setIsEditing(false);
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
