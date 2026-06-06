import {useCallback, useEffect, useMemo, useState} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

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
import {formatTel, toCustomerMap} from '../../../utils/customers';
import type {Customer as CustomerType} from '../../../utils/customers';
import {useCalendarStore} from '../../../store/calendarStore';
import {CloseIconButton} from '../../ui/CloseIconButton';
import {CustomerReservationCards} from '../../ui/CustomerReservationCards';
import {ColorTag} from '../../ui/ColorTag';
import {ColorPickerButton} from '../../ui/ColorPickerButton';

const PAGE_SIZE = 5;

const POINT_HISTORY_LABELS: Record<PointHistoryEntry['type'], string> = {
    manual_add: '수동 적립',
    manual_subtract: '수동 차감',
    recharge: '충전',
    payment_use: '결제 사용',
    payment_earn: '결제 적립',
    payment_adjust: '적립 조정',
};

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
                alert(err?.error || '분리에 실패했습니다.');
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
            alert('분리 중 오류가 발생했습니다.');
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

const StyledCustomerOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.childDetail};
`;

const StyledCustomerDetail = styled(StyledDetail)`
    width: 360px;
`;

const StyledCustomerContent = styled.div`
    ${scrollContentStyle};
    display: flex;
    flex-direction: column;
`;

const StyledHeaderActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

const StyledHeaderActionButton = styled.button<{ $primary?: boolean; $danger?: boolean }>`
    height: 30px;
    padding: 0 10px;
    border: 1px solid ${props => props.$danger ? 'var(--danger-color)' : props.$primary ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: 8px;
    background: ${props => props.$danger ? 'var(--danger-color)' : props.$primary ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${props => (props.$danger || props.$primary) ? '#fff' : 'var(--dark-gray-color)'};
    font-size: 12px;
    font-weight: 600;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const StyledHeaderCloseButton = styled(CloseIconButton)`
    flex-shrink: 0;
`;

const StyledInfo = styled.div`
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);

    dl {
        display: grid;
        grid-template-columns: 60px 1fr;
        gap: 4px 12px;
        margin: 0;
    }

    dt {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 500;
    }

    dd {
        margin: 0;
        font-size: 13px;
    }
`;

const StyledTelLink = styled.a`
    color: inherit;
    text-decoration: none;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

const StyledNoshowCount = styled.span<{ $hasNoshow: boolean }>`
    color: ${(p) => p.$hasNoshow ? '#EA4335' : 'inherit'};
    font-weight: ${(p) => p.$hasNoshow ? 700 : 'inherit'};
`;

const StyledEditFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    label {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    span {
        font-size: 12px;
        font-weight: 600;
        color: var(--dark-gray-color);
    }

    input {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        font-size: 13px;
    }
`;

const StyledPointInfo = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: var(--blue-color);
`;

const StyledNotesSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--light-gray-color);

    h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
    }
`;

const StyledNoteList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledNoteItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
        font-size: 12px;
        color: var(--dark-gray-color);
    }

    span {
        font-size: 12px;
        color: var(--dark-gray-color2);
        white-space: pre-wrap;
    }
`;

const StyledNoteEditor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    label {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    span {
        font-size: 12px;
        font-weight: 600;
        color: var(--dark-gray-color);
    }

    input {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        font-size: 12px;
        font-family: inherit;
    }
`;

const StyledReservationSection = styled.div`
    flex: 1;
    ${scrollHintStyle};
`;

const StyledPointHistorySection = styled.div`
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);

    h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
    }
`;

const StyledPointHistoryHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

const StyledPointHistoryMoreButton = styled.button`
    border: none;
    background: none;
    font-size: 12px;
    color: var(--blue-color);
    font-weight: 600;
    padding: 0;
`;

const StyledPointHistoryOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

const StyledPointHistoryModal = styled(StyledDetail)`
    width: min(360px, 90vw);
    max-height: 70vh;
`;

const StyledPointHistoryModalContent = styled.div`
    ${scrollContentStyle};
    padding: 8px;
`;

const StyledAddressMemoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px;
    border-bottom: 1px solid var(--light-gray-color);

    h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
    }
`;

const StyledAddressMemoList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const StyledTagEditor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledTagInputRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;

    input {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        font-size: 12px;
    }

    button {
        height: 34px;
        padding: 0 12px;
        border: 1px solid var(--blue-color);
        border-radius: 8px;
        background: var(--blue-color);
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
    }
`;

const StyledColorRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const StyledAddressMemoItem = styled(ColorTag)`
    min-height: 24px;
    padding: 3px 7px;
    font-size: 12px;
    gap: 6px;
`;

const StyledTagRemoveButton = styled.button`
    border: none;
    background: transparent;
    color: inherit;
    font-size: 11px;
    font-weight: 700;
`;

const StyledEditError = styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--danger-color);
`;

const StyledPointHistoryList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledPointHistoryItem = styled.li<{$clickable?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--white-color);
    cursor: ${(p) => p.$clickable ? 'pointer' : 'default'};

    ${(p) => p.$clickable && `
        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background: var(--gray-color2);
            }
        }
    `}
`;

const StyledPointHistoryTop = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;

    strong {
        font-size: 12px;
        font-weight: 600;
    }

    span {
        font-size: 12px;
        font-weight: 700;
        color: var(--blue-color);
    }
`;

const StyledPointHistoryMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledEmptyText = styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledReservationScroll = styled.div`
    ${scrollContentStyle};
    padding: 8px 8px 30px;

    h4 {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 600;
    }
`;

const StyledMoreButton = styled.button`
    display: block;
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid var(--dark-gray-color2);
    border-radius: 4px;
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

const StyledUnmergeOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

const StyledUnmergeModal = styled(StyledDetail)`
    width: min(360px, 90vw);
`;

const StyledUnmergeContent = styled.div`
    padding: 12px;
`;

const StyledUnmergeMessage = styled.p`
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dark-gray-color);
    word-break: keep-all;

    strong {
        color: #0f172a;
    }
`;

const StyledUnmergeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledUnmergeItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 8px;
    background: var(--gray-color2);
    font-size: 12px;

    strong {
        font-weight: 700;
        color: #0f172a;
    }

    span {
        color: var(--dark-gray-color2);
    }

    .date {
        margin-left: auto;
        font-size: 11px;
    }
`;

const StyledUnmergeFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 10px 14px 14px;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
`;
