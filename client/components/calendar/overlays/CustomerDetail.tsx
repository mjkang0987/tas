import {useCallback, useEffect, useMemo, useState} from 'react';

import {createPortal} from 'react-dom';

import type {Customer, CustomerMemoTag, PointHistoryEntry} from '../../../utils/customers';
import type {Reservation, ReservationMap} from '../../../utils/reservations';

import {
    OVERLAY_Z_INDEX,
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    useDialogAccessibility,
    useLayerInstanceId,
    scrollHintStyle,
    scrollContentStyle,
} from './ModalStyles';

import {buildDesignerColorMap, buildDesignerNameMap} from '../../../utils/designers';
import {buildServiceColorMap, formatPrice} from '../../../utils/services';
import {formatTel, toCustomerMap, POINT_HISTORY_LABELS} from '../../../utils/customers';
import type {Customer as CustomerType} from '../../../utils/customers';
import {useCalendarStore} from '../../../store/calendarStore';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {CustomerReservationCards} from '../../ui/CustomerReservationCards';
import {ColorTag} from '../../ui/ColorTag';
import {ColorPickerButton} from '../../ui/ColorPickerButton';
import {useToastStore} from '../../../store/toastStore';
import {
    StyledCustomerOverlay,
    StyledCustomerDetail,
    StyledCustomerContent,
    StyledHeaderActions,
    StyledHeaderActionButton,
    StyledHeaderCloseButton,
    StyledInfo,
    StyledTelLink,
    StyledNoshowCount,
    StyledEditFields,
    StyledPointInfo,
    StyledNotesSection,
    StyledNoteList,
    StyledNoteItem,
    StyledNoteEditor,
    StyledReservationSection,
    StyledPointHistorySection,
    StyledPointHistoryHeader,
    StyledPointHistoryMoreButton,
    StyledPointHistoryOverlay,
    StyledPointHistoryModal,
    StyledPointHistoryModalContent,
    StyledAddressMemoSection,
    StyledAddressMemoList,
    StyledTagEditor,
    StyledTagInputRow,
    StyledColorRow,
    StyledAddressMemoItem,
    StyledTagRemoveButton,
    StyledEditError,
    StyledPointHistoryList,
    StyledPointHistoryItem,
    StyledPointHistoryTop,
    StyledPointHistoryMeta,
    StyledEmptyText,
    StyledReservationScroll,
    StyledMoreButton,
    StyledUnmergeOverlay,
    StyledUnmergeModal,
    StyledUnmergeContent,
    StyledUnmergeMessage,
    StyledUnmergeList,
    StyledUnmergeItem,
    StyledUnmergeFooter,
} from './CustomerDetail.styles';

const PAGE_SIZE = 5;

interface CustomerDetailProps {
    customer: Customer;
    reservationMap: ReservationMap;
    onClose: () => void;
    onReservationClick?: (reservation: Reservation) => void;
}

const MEMO_TAG_COLORS = ['#4285F4', '#34A853', '#EA4335', '#FBBC04', '#FF6D01', '#46BDC6', '#9334E6', '#E91E8C'];

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
    const [mergeHistories, setMergeHistories] = useState<Array<{id: string; sourceName: string; sourceTel: string; mergedAt: string}>>([]);
    const [isUnmergeConfirm, setIsUnmergeConfirm] = useState(false);
    const [isUnmerging, setIsUnmerging] = useState(false);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const toast = useToastStore((s) => s.show);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('customer-detail');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerColorMap = useMemo(() => buildDesignerColorMap(designers), [designers]);
    const designerNameMap = useMemo(() => buildDesignerNameMap(designers), [designers]);

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
        const nextTel = editForm.tel.trim();

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
                <h3>{customer.name}</h3>
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
                        </>
                    )}
                    <StyledHeaderCloseButton onClick={onClose} />
                </StyledHeaderActions>
            </StyledHeader>
            <StyledCustomerContent>
                <StyledInfo>
                    {isEditing ? (
                        <StyledEditFields>
                            <label htmlFor="customer-edit-name">
                                <span>고객명</span>
                                <input
                                    id="customer-edit-name"
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                />
                            </label>
                            <label htmlFor="customer-edit-tel">
                                <span>연락처</span>
                                <input
                                    id="customer-edit-tel"
                                    type="text"
                                    value={editForm.tel}
                                    onChange={(e) => handleFieldChange('tel', e.target.value)}
                                />
                            </label>
                            <StyledPointInfo>적립금 {formatPrice(customer.points ?? 0)}</StyledPointInfo>
                        </StyledEditFields>
                    ) : (
                        <dl>
                            <dt>연락처</dt>
                            <dd><StyledTelLink href={`tel:${customer.tel}`}>{formatTel(customer.tel)}</StyledTelLink></dd>
                            <dt>적립금</dt>
                            <dd>{formatPrice(customer.points ?? 0)}</dd>
                            <dt>노쇼</dt>
                            <dd><StyledNoshowCount $hasNoshow={noshowCount > 0}>{noshowCount}회</StyledNoshowCount></dd>
                        </dl>
                    )}
                </StyledInfo>
                <StyledAddressMemoSection>
                    <h4>고객 메모</h4>
                    {isEditing && (
                        <StyledTagEditor>
                            <StyledTagInputRow>
                                <input
                                    id="customer-edit-memo-tag"
                                    type="text"
                                    value={newTagText}
                                    placeholder="메모 태그 입력"
                                    onChange={(e) => {
                                        setNewTagText(e.target.value);
                                        setEditError('');
                                    }}
                                />
                                <button type="button"
                                        onClick={handleAddTag}>추가
                                </button>
                            </StyledTagInputRow>
                            <StyledColorRow>
                                {MEMO_TAG_COLORS.map((color) => (
                                    <ColorPickerButton
                                        key={color}
                                        type="button"
                                        $selected={selectedTagColor === color}
                                        $color={color}
                                        $size={22}
                                        onClick={() => setSelectedTagColor(color)}
                                    />
                                ))}
                            </StyledColorRow>
                        </StyledTagEditor>
                    )}
                    {displayMemoTags.length === 0 ? (
                        <StyledEmptyText>등록된 메모가 없습니다.</StyledEmptyText>
                    ) : (
                        <StyledAddressMemoList>
                            {displayMemoTags.map((tag) => (
                                <StyledAddressMemoItem key={`${customer.id}-${tag.text}`}
                                                       $color={tag.color}>
                                    <span>{tag.text}</span>

                                    {isEditing && (
                                        <StyledTagRemoveButton type="button"
                                                               onClick={() => handleRemoveTag(tag.text)}>삭제</StyledTagRemoveButton>
                                    )}
                                </StyledAddressMemoItem>
                            ))}
                        </StyledAddressMemoList>
                    )}
                    {isEditing && editError && <StyledEditError>{editError}</StyledEditError>}
                </StyledAddressMemoSection>
                <StyledPointHistorySection>
                    <StyledPointHistoryHeader>
                        <h4>적립금 이력 ({pointHistories.length})</h4>
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
                            <StyledPointHistoryItem
                                $clickable={!!pointHistories[0].relatedReservationId}
                                onClick={() => handlePointHistoryClick(pointHistories[0])}
                            >
                                <StyledPointHistoryTop>
                                    <strong>{POINT_HISTORY_LABELS[pointHistories[0].type]}</strong>
                                    <span>{pointHistories[0].delta > 0 ? '+' : ''}{formatPrice(pointHistories[0].delta)}</span>
                                </StyledPointHistoryTop>
                                <StyledPointHistoryMeta>
                                    <span>{pointHistories[0].description}</span>
                                    <span>잔액 {formatPrice(pointHistories[0].balance)}</span>
                                    <span>{pointHistories[0].createdAt.slice(0, 16).replace('T', ' ')}</span>
                                </StyledPointHistoryMeta>
                            </StyledPointHistoryItem>
                        </StyledPointHistoryList>
                    )}
                </StyledPointHistorySection>
                <StyledReservationSection>
                    <StyledReservationScroll>
                        <h4>예약 내역 ({customerReservations.length})</h4>
                        <CustomerReservationCards reservations={visibleList}
                                                  designerColorMap={designerColorMap}
                                                  designerNameMap={designerNameMap}
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
        <StyledPointHistoryOverlay onClick={() => setIsPointHistoryOpen(false)}>
            <StyledPointHistoryModal onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <h3>적립금 이력 ({pointHistories.length})</h3>
                    <CloseIconButton onClick={() => setIsPointHistoryOpen(false)} />
                </StyledHeader>
                <StyledPointHistoryModalContent>
                    <StyledPointHistoryList>
                        {pointHistories.map((history) => (
                            <StyledPointHistoryItem
                                key={history.id}
                                $clickable={!!history.relatedReservationId}
                                onClick={() => handlePointHistoryClick(history)}
                            >
                                <StyledPointHistoryTop>
                                    <strong>{POINT_HISTORY_LABELS[history.type]}</strong>
                                    <span>{history.delta > 0 ? '+' : ''}{formatPrice(history.delta)}</span>
                                </StyledPointHistoryTop>
                                <StyledPointHistoryMeta>
                                    <span>{history.description}</span>
                                    <span>잔액 {formatPrice(history.balance)}</span>
                                    <span>{history.createdAt.slice(0, 16).replace('T', ' ')}</span>
                                </StyledPointHistoryMeta>
                            </StyledPointHistoryItem>
                        ))}
                    </StyledPointHistoryList>
                </StyledPointHistoryModalContent>
            </StyledPointHistoryModal>
        </StyledPointHistoryOverlay>
    )}
    {isUnmergeConfirm && mergeHistories.length > 0 && (
        <StyledUnmergeOverlay onClick={() => setIsUnmergeConfirm(false)}>
            <StyledUnmergeModal onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <h3>고객 병합 분리</h3>
                    <CloseIconButton onClick={() => setIsUnmergeConfirm(false)} />
                </StyledHeader>
                <StyledUnmergeContent>
                    <StyledUnmergeMessage>
                        다음 고객이 <strong>{customer.name}</strong>에 병합되었습니다. 분리하면 원래 고객이 복원됩니다.
                    </StyledUnmergeMessage>
                    <StyledUnmergeList>
                        {mergeHistories.map((h) => (
                            <StyledUnmergeItem key={h.id}>
                                <strong>{h.sourceName}</strong>
                                <span>{h.sourceTel ? formatTel(h.sourceTel) : '연락처 없음'}</span>
                                <span className="date">{h.mergedAt.slice(0, 10).replace(/-/g, '.')}</span>
                            </StyledUnmergeItem>
                        ))}
                    </StyledUnmergeList>
                </StyledUnmergeContent>
                <StyledUnmergeFooter>
                    <StyledHeaderActionButton type="button"
                                              onClick={() => setIsUnmergeConfirm(false)}
                                              disabled={isUnmerging}>취소</StyledHeaderActionButton>
                    <StyledHeaderActionButton type="button"
                                              $danger
                                              onClick={handleUnmerge}
                                              disabled={isUnmerging}>{isUnmerging ? '분리 중...' : '분리'}</StyledHeaderActionButton>
                </StyledUnmergeFooter>
            </StyledUnmergeModal>
        </StyledUnmergeOverlay>
    )}
    </>, modalRoot);
};
