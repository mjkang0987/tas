import {useMemo, useState} from 'react';

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

import {getDesignerColor} from '../../../utils/designers';
import {buildServiceColorMap, formatPrice, getServiceColor, parseServiceString} from '../../../utils/services';
import {useCalendarStore} from '../../../store/calendarStore';

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
    cautionNote: string;
    memoTags: CustomerMemoTag[];
};

function buildCustomerEditForm(customer: Customer): CustomerEditForm {
    const cautionNote = [
        customer.allergyNote?.trim(),
        customer.claimNote?.trim(),
        customer.preferenceNote?.trim(),
    ].filter(Boolean).join('\n');

    return {
        name: customer.name ?? '',
        tel: customer.tel ?? '',
        cautionNote,
        memoTags: [...(customer.memoTags ?? [])],
    };
}

export const CustomerDetail = ({customer, reservationMap, onClose, onReservationClick}: CustomerDetailProps) => {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<CustomerEditForm>(() => buildCustomerEditForm(customer));
    const [newTagText, setNewTagText] = useState('');
    const [selectedTagColor, setSelectedTagColor] = useState(MEMO_TAG_COLORS[0]);
    const [editError, setEditError] = useState('');
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const designers = useCalendarStore((s) => s.designers);
    const updateCustomer = useCalendarStore((s) => s.updateCustomer);
    const modalRoot = document.getElementById('modal-root');
    const {layerId, layerDataId} = useLayerInstanceId('customer-detail');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );
    const designerColorMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = getDesignerColor(designer);
            return acc;
        }, {}),
        [designers]
    );
    const designerNameMap = useMemo(
        () => designers.reduce<Record<number, string>>((acc, designer) => {
            acc[designer.id] = designer.name;
            return acc;
        }, {}),
        [designers]
    );

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

    const visibleList = customerReservations.slice(0, visibleCount);
    const hasMore = visibleCount < customerReservations.length;
    const pointHistories = [...(customer.pointHistories ?? [])].reverse();
    const displayMemoTags = isEditing ? editForm.memoTags : (customer.memoTags ?? []);

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

    const displayCautionNote = [
        customer.allergyNote?.trim(),
        customer.claimNote?.trim(),
        customer.preferenceNote?.trim(),
    ].filter(Boolean).join('\n');

    const handleSaveEdit = () => {
        const nextName = editForm.name.trim();
        const nextTel = editForm.tel.trim();
        const nextCautionNote = editForm.cautionNote.trim();

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
            allergyNote: nextCautionNote || undefined,
            claimNote: undefined,
            preferenceNote: undefined,
            memoTags: editForm.memoTags,
        });
        setEditError('');
        setIsEditing(false);
    };

    if (!modalRoot) return null;

    return createPortal(<StyledCustomerOverlay onClick={onClose}
                                               role="dialog"
                                               aria-modal="true"
                                               aria-label="고객 정보"
                                               id={layerId}
                                               data-layer-id={layerDataId}>
        <StyledCustomerDetail ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <StyledHeader>
                <h3>{customer.name}</h3>
                <StyledHeaderActions>
                    {isEditing ? (
                        <>
                            <StyledHeaderActionButton type="button" onClick={handleCancelEdit}>취소</StyledHeaderActionButton>
                            <StyledHeaderActionButton type="button" $primary onClick={handleSaveEdit}>저장</StyledHeaderActionButton>
                        </>
                    ) : (
                        <StyledHeaderActionButton type="button" onClick={handleStartEdit}>수정</StyledHeaderActionButton>
                    )}
                    <StyledHeaderActionButton type="button" onClick={onClose} aria-label="닫기">닫기</StyledHeaderActionButton>
                </StyledHeaderActions>
            </StyledHeader>
            <StyledCustomerContent>
                <StyledInfo>
                    {isEditing ? (
                        <StyledEditFields>
                            <label>
                                <span>고객명</span>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                />
                            </label>
                            <label>
                                <span>연락처</span>
                                <input
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
                            <dd>{customer.tel}</dd>
                            <dt>적립금</dt>
                            <dd>{formatPrice(customer.points ?? 0)}</dd>
                        </dl>
                    )}
                </StyledInfo>
                <StyledNotesSection>
                    <h4>주의사항</h4>
                    {isEditing ? (
                        <StyledNoteEditor>
                            <label>
                                <span>주의사항</span>
                                <input
                                    type="text"
                                    value={editForm.cautionNote}
                                    onChange={(e) => handleFieldChange('cautionNote', e.target.value)}
                                    placeholder="주의사항 입력"
                                />
                            </label>
                        </StyledNoteEditor>
                    ) : (
                        <StyledNoteList>
                            {displayCautionNote ? (
                                <StyledNoteItem><span>{displayCautionNote}</span></StyledNoteItem>
                            ) : (
                                <StyledEmptyText>등록된 주의사항이 없습니다.</StyledEmptyText>
                            )}
                        </StyledNoteList>
                    )}
                </StyledNotesSection>
                <StyledAddressMemoSection>
                    <h4>고객 메모</h4>
                    {isEditing && (
                        <StyledTagEditor>
                            <StyledTagInputRow>
                                <input
                                    type="text"
                                    value={newTagText}
                                    placeholder="메모 태그 입력"
                                    onChange={(e) => {
                                        setNewTagText(e.target.value);
                                        setEditError('');
                                    }}
                                />
                                <button type="button" onClick={handleAddTag}>추가</button>
                            </StyledTagInputRow>
                            <StyledColorRow>
                                {MEMO_TAG_COLORS.map((color) => (
                                    <StyledColorButton
                                        key={color}
                                        type="button"
                                        $selected={selectedTagColor === color}
                                        $color={color}
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
                                <StyledAddressMemoItem key={`${customer.id}-${tag.text}`} $color={tag.color}>
                                    <span>{tag.text}</span>
                                    {isEditing && (
                                        <StyledTagRemoveButton type="button" onClick={() => handleRemoveTag(tag.text)}>삭제</StyledTagRemoveButton>
                                    )}
                                </StyledAddressMemoItem>
                            ))}
                        </StyledAddressMemoList>
                    )}
                    {isEditing && editError && <StyledEditError>{editError}</StyledEditError>}
                </StyledAddressMemoSection>
                <StyledPointHistorySection>
                    <h4>적립금 이력 ({pointHistories.length})</h4>
                    {pointHistories.length === 0 ? (
                        <StyledEmptyText>적립금 이력이 없습니다.</StyledEmptyText>
                    ) : (
                        <StyledPointHistoryList>
                            {pointHistories.map((history) => (
                                <StyledPointHistoryItem key={history.id}>
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
                    )}
                </StyledPointHistorySection>
                <StyledReservationSection>
                    <StyledReservationScroll>
                    <h4>예약 내역 ({customerReservations.length})</h4>
                    <StyledReservationList>
                        {visibleList.map((r) => {
                            const designerColor = r.designerId ? (designerColorMap[r.designerId] ?? '#8E8E93') : '#8E8E93';
                            const designerName = r.designerId ? (designerNameMap[r.designerId] ?? '미지정') : '미지정';
                            return (
                                <StyledReservationItem key={r.id}
                                                       type="button"
                                                       $clickable={!!onReservationClick}
                                                       $color={designerColor}
                                                       onClick={() => onReservationClick?.(r)}>
                                    <StyledItemTop>
                                        <span className="date">{r.date}</span>
                                        <span className="time">{r.startTime}~{r.endTime}</span>
                                        <StyledServiceList>
                                            {parseServiceString(r.service).map((serviceName) => (
                                                <StyledServiceToken key={`${r.id}-${serviceName}`}>
                                                    <StyledServiceDot $color={getServiceColor(serviceName, serviceColorMap)} />
                                                    <span>{serviceName}</span>
                                                </StyledServiceToken>
                                            ))}
                                        </StyledServiceList>
                                    </StyledItemTop>
                                    <StyledMetaLine>
                                        <span>디자이너: {designerName}</span>
                                    </StyledMetaLine>
                                </StyledReservationItem>
                            );
                        })}
                    </StyledReservationList>
                    {hasMore && <StyledMoreButton type="button"
                                                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                        더보기
                    </StyledMoreButton>}
                    </StyledReservationScroll>
                </StyledReservationSection>
            </StyledCustomerContent>
        </StyledCustomerDetail>
    </StyledCustomerOverlay>, modalRoot);
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

const StyledHeaderActionButton = styled.button<{ $primary?: boolean }>`
  height: 30px;
  padding: 0 10px;
  border: 1px solid ${props => props.$primary ? 'var(--blue-color)' : 'var(--light-gray-color)'};
  border-radius: 8px;
  background: ${props => props.$primary ? 'var(--blue-color)' : 'var(--white-color)'};
  color: ${props => props.$primary ? '#fff' : 'var(--dark-gray-color)'};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

const StyledInfo = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--light-gray-color);

  dl {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 4px 12px;
    margin: 0;
  }

  dt {
    font-size: 13px;
    color: var(--gray-color);
    font-weight: 500;
  }

  dd {
    margin: 0;
    font-size: 13px;
  }
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
  border-top: 1px solid var(--light-gray-color);
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
  padding: 12px 16px;
  border-top: 1px solid var(--light-gray-color);
  border-bottom: 1px solid var(--light-gray-color);

  h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
  }
`;

const StyledAddressMemoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--light-gray-color);
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

const StyledColorButton = styled.button<{ $selected: boolean; $color: string }>`
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid ${props => props.$selected ? 'var(--black-color)' : 'transparent'};
  background: ${props => props.$color};
  cursor: pointer;
`;

const StyledAddressMemoItem = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 3px 10px;
  border-radius: 999px;
  background-color: ${(props) => props.$color};
  color: #fff;
  font-size: 12px;
  font-weight: 600;
`;

const StyledTagRemoveButton = styled.button`
  border: none;
  background: transparent;
  color: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
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

const StyledPointHistoryItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid var(--light-gray-color);
  border-radius: 8px;
  background: var(--white-color);
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
  color: var(--gray-color);
`;

const StyledReservationScroll = styled.div`
  ${scrollContentStyle};
  padding: 12px 16px 30px;

  h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
  }
`;

const StyledReservationList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledReservationItem = styled.button<{ $color: string; $clickable: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid ${props => props.$color};
  border-left-width: 4px;
  border-radius: 8px;
  background-color: ${props => `${props.$color}12`};
  color: var(--dark-gray-color);
  font-size: 12px;
  text-align: left;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  .date, .time {
    color: var(--dark-gray-color);
    opacity: 0.9;
  }

  &:hover {
    background-color: ${props => props.$clickable ? `${props.$color}1d` : `${props.$color}12`};
  }
`;

const StyledItemTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const StyledServiceList = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-weight: 500;
`;

const StyledServiceToken = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`;

const StyledServiceDot = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$color};
`;

const StyledMetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: var(--tiny-font);
  color: var(--gray-color);
`;

const StyledMoreButton = styled.button`
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--light-gray-color);
  border-radius: 4px;
  background: none;
  font-size: 13px;
  color: var(--gray-color);
  cursor: pointer;

  &:hover {
    background-color: var(--black-color-10);
  }
`;
