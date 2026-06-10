import {useMemo, useState, type DragEvent} from 'react';
import {useToastStore} from '../../store/toastStore';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {actionButtonStyle, EMPTY_TEXT, StyledEditBtn as StyledEditBtnBase, StyledSaveBtn, StyledCancelBtn, StyledServiceFooter, StyledEmpty} from './settings-styles';
import {buildServiceColorMap, formatPrice, formatDuration, getCategoryBaseColor, getGroupedCatalog, getServiceColor} from '../../utils/services';
import type {ServiceItem} from '../../utils/services';
import {
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledFooter,
    StyledActionButton,
    StyledConfirmOverlay,
    StyledConfirmModal,
    StyledForm,
    StyledFieldRow,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';
import {formControlStyle} from '../ui/FormControls';
import {FieldError} from '../ui/FieldError';

/* ------------------------------------------------------------------ */
/*  ServiceEditModal                                                   */
/* ------------------------------------------------------------------ */

interface ServiceEditModalProps {
    item: ServiceItem;
    serviceCatalog: ServiceItem[];
    onSave: (original: ServiceItem, updated: ServiceItem) => void;
    onDelete: (name: string) => void;
    onClose: () => void;
}

const ServiceEditModal = ({item, serviceCatalog, onSave, onDelete, onClose}: ServiceEditModalProps) => {
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId('service-edit');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    const [name, setName] = useState(item.name);
    const [durationMinutes, setDurationMinutes] = useState(String(item.durationMinutes));
    const [price, setPrice] = useState(String(item.price));
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState('');

    const handleSave = () => {
        const nextName = name.trim();
        if (!nextName) {
            setError('서비스명을 입력해 주세요.');
            return;
        }
        if (serviceCatalog.some((s) => s.name === nextName && s.name !== item.name)) {
            setError(`"${nextName}" 서비스는 이미 등록되어 있습니다.`);
            return;
        }
        onSave(item, {
            name: nextName,
            category: item.category,
            durationMinutes: Number(durationMinutes) || 0,
            price: Number(price) || 0,
        });
    };

    const handleDelete = () => setConfirmDelete(true);
    const handleDeleteConfirm = () => { onDelete(item.name); };

    if (!modalRoot) return null;

    return createPortal(
        <StyledServiceOverlay
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="서비스 수정"
            id={layerId}
            data-layer-id={layerDataId}
        >
            <StyledServiceModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <h3>서비스 수정</h3>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledModalBody>
                    <StyledForm>
                        <StyledFieldRow>
                            <strong>서비스명</strong>
                            <label htmlFor="service-edit-name">
                                <input
                                    id="service-edit-name"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setError(''); }}
                                    placeholder="서비스명"
                                />
                            </label>
                        </StyledFieldRow>
                        <StyledFieldRow>
                            <strong>소요시간 (분)</strong>
                            <label htmlFor="service-edit-duration">
                                <input
                                    id="service-edit-duration"
                                    type="number"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    placeholder="분"
                                />
                            </label>
                        </StyledFieldRow>
                        <StyledFieldRow>
                            <strong>가격 (원)</strong>
                            <label htmlFor="service-edit-price">
                                <input
                                    id="service-edit-price"
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="원"
                                />
                            </label>
                        </StyledFieldRow>
                        <FieldError>{error}</FieldError>
                    </StyledForm>
                </StyledModalBody>
                <StyledFooter>
                    <StyledActionButton type="button" $danger onClick={handleDelete}>삭제</StyledActionButton>
                    <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={handleSave}>저장</StyledActionButton>
                </StyledFooter>
            </StyledServiceModal>
            {confirmDelete && (
                <StyledConfirmOverlay onClick={() => setConfirmDelete(false)}>
                    <StyledConfirmModal onClick={(e) => e.stopPropagation()}>
                        <StyledHeader><h3>서비스 삭제</h3></StyledHeader>
                        <StyledDeleteMsg>
                            <strong>"{item.name}"</strong> 서비스를 삭제하시겠습니까?<br />
                            이 작업은 되돌릴 수 없습니다.
                        </StyledDeleteMsg>
                        <StyledFooter>
                            <StyledActionButton type="button" onClick={() => setConfirmDelete(false)}>취소</StyledActionButton>
                            <StyledActionButton type="button" $danger onClick={handleDeleteConfirm}>삭제</StyledActionButton>
                        </StyledFooter>
                    </StyledConfirmModal>
                </StyledConfirmOverlay>
            )}
        </StyledServiceOverlay>,
        modalRoot
    );
};

/* ------------------------------------------------------------------ */
/*  ServiceAddModal                                                    */
/* ------------------------------------------------------------------ */

interface ServiceAddModalProps {
    categories: string[];
    serviceCatalog: ServiceItem[];
    onAdd: (item: ServiceItem) => void;
    onClose: () => void;
}

const EMPTY_ADD = {name: '', category: '', durationMinutes: '', price: ''};

const ServiceAddModal = ({categories, serviceCatalog, onAdd, onClose}: ServiceAddModalProps) => {
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId('service-add');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    const [form, setForm] = useState(EMPTY_ADD);
    const [newCategory, setNewCategory] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        const itemName = form.name.trim();
        const category = form.category === '__new' ? newCategory.trim() : form.category.trim();

        if (!category) {
            setError(form.category === '__new'
                ? '새 카테고리명을 입력해 주세요.'
                : '카테고리를 선택하거나 새 카테고리를 추가해 주세요.');
            return;
        }
        if (!itemName) {
            setError('서비스명을 입력해 주세요.');
            return;
        }
        if (serviceCatalog.some((s) => s.name === itemName)) {
            setError(`"${itemName}" 서비스는 이미 등록되어 있습니다.`);
            return;
        }

        onAdd({
            name: itemName,
            category,
            durationMinutes: Number(form.durationMinutes) || 0,
            price: Number(form.price) || 0,
        });
    };

    if (!modalRoot) return null;

    return createPortal(
        <StyledServiceOverlay
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="서비스 추가"
            id={layerId}
            data-layer-id={layerDataId}
        >
            <StyledServiceModal ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <h3>서비스 추가</h3>
                    <CloseIconButton onClick={onClose} />
                </StyledHeader>
                <StyledModalBody>
                    <StyledForm>
                        <StyledFieldRow>
                            <strong>카테고리</strong>
                            <label htmlFor="service-add-category">
                                <select
                                    id="service-add-category"
                                    value={form.category}
                                    onChange={(e) => {
                                        setForm({...form, category: e.target.value});
                                        setError('');
                                    }}
                                >
                                    <option value="">카테고리 선택</option>
                                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                                    <option value="__new">+ 새 카테고리</option>
                                </select>
                            </label>
                            {form.category === '__new' && (
                                <label htmlFor="service-add-new-category">
                                    <input
                                        id="service-add-new-category"
                                        value={newCategory}
                                        placeholder="새 카테고리명"
                                        onChange={(e) => { setNewCategory(e.target.value); setError(''); }}
                                    />
                                </label>
                            )}
                        </StyledFieldRow>
                        <StyledFieldRow>
                            <strong>서비스명</strong>
                            <label htmlFor="service-add-name">
                                <input
                                    id="service-add-name"
                                    value={form.name}
                                    onChange={(e) => { setForm({...form, name: e.target.value}); setError(''); }}
                                    placeholder="서비스명"
                                />
                            </label>
                        </StyledFieldRow>
                        <StyledFieldRow>
                            <strong>소요시간 (분)</strong>
                            <label htmlFor="service-add-duration">
                                <input
                                    id="service-add-duration"
                                    type="number"
                                    value={form.durationMinutes}
                                    onChange={(e) => setForm({...form, durationMinutes: e.target.value})}
                                    placeholder="분"
                                />
                            </label>
                        </StyledFieldRow>
                        <StyledFieldRow>
                            <strong>가격 (원)</strong>
                            <label htmlFor="service-add-price">
                                <input
                                    id="service-add-price"
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => setForm({...form, price: e.target.value})}
                                    placeholder="원"
                                />
                            </label>
                        </StyledFieldRow>
                        <FieldError>{error}</FieldError>
                    </StyledForm>
                </StyledModalBody>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                    <StyledActionButton type="button" $primary onClick={handleAdd}>추가</StyledActionButton>
                </StyledFooter>
            </StyledServiceModal>
        </StyledServiceOverlay>,
        modalRoot
    );
};

/* ------------------------------------------------------------------ */
/*  ServiceManageSection                                               */
/* ------------------------------------------------------------------ */

export const ServiceManageSection = () => {
    const toast = useToastStore((s) => s.show);
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);
    const categoryBaseColorMap = useCalendarStore((s) => s.categoryBaseColorMap);
    const addService = useCalendarStore((s) => s.addService);
    const updateService = useCalendarStore((s) => s.updateService);
    const deleteService = useCalendarStore((s) => s.deleteService);
    const renameCategory = useCalendarStore((s) => s.renameCategory);
    const moveCategory = useCalendarStore((s) => s.moveCategory);
    const moveServiceInCategory = useCalendarStore((s) => s.moveServiceInCategory);
    const updateCategoryBaseColor = useCalendarStore((s) => s.updateCategoryBaseColor);

    const grouped = getGroupedCatalog(serviceCatalog);
    const categories = Array.from(grouped.keys());
    const serviceColorMap = useMemo(
        () => buildServiceColorMap(serviceCatalog, categoryBaseColorMap),
        [serviceCatalog, categoryBaseColorMap]
    );

    const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [draggingName, setDraggingName] = useState<string | null>(null);
    const [dragOverName, setDragOverName] = useState<string | null>(null);
    const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [manageError, setManageError] = useState('');

    const handleSaveEdit = (original: ServiceItem, updated: ServiceItem) => {
        updateService(original.name, updated);
        setEditingItem(null);
        toast('서비스가 저장되었습니다.');
    };

    const handleDelete = (name: string) => {
        deleteService(name);
        setEditingItem(null);
        toast(`"${name}" 서비스가 삭제되었습니다.`, 'info');
    };

    const handleAdd = (item: ServiceItem) => {
        addService(item);
        setShowAddModal(false);
        toast('서비스가 추가되었습니다.');
    };

    const handleDragStart = (e: DragEvent<HTMLDivElement>, name: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', name);
        setDraggingName(name);
        setDragOverName(null);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, overName: string) => {
        if (draggingCategory) return;
        if (!draggingName || draggingName === overName) return;
        e.preventDefault();
        setDragOverName(overName);
    };

    const handleDrop = (targetName: string) => {
        if (draggingCategory) return;
        if (!draggingName || draggingName === targetName) return;
        moveServiceInCategory(draggingName, targetName);
        setDragOverName(null);
        setDraggingName(null);
    };

    const handleCategoryDragStart = (e: DragEvent<HTMLElement>, category: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', category);
        setDraggingCategory(category);
        setDragOverCategory(null);
        setDraggingName(null);
        setDragOverName(null);
    };

    const handleCategoryDragOver = (e: DragEvent<HTMLElement>, category: string) => {
        if (!draggingCategory || draggingCategory === category) return;
        e.preventDefault();
        setDragOverCategory(category);
    };

    const handleCategoryDrop = (category: string) => {
        if (!draggingCategory || draggingCategory === category) return;
        moveCategory(draggingCategory, category);
        setDragOverCategory(null);
        setDraggingCategory(null);
    };

    const handleDragEnd = () => {
        setDragOverName(null);
        setDraggingName(null);
        setDragOverCategory(null);
        setDraggingCategory(null);
    };

    const startCategoryEdit = (category: string) => {
        setEditingCategory(category);
        setEditingCategoryName(category);
        setManageError('');
    };

    const saveCategoryEdit = (category: string) => {
        const nextName = editingCategoryName.trim();

        if (!nextName) {
            setManageError('카테고리명을 입력해 주세요.');
            return;
        }

        if (categories.some((item) => item === nextName && item !== category)) {
            setManageError(`"${nextName}" 카테고리는 이미 있습니다.`);
            return;
        }

        renameCategory(category, nextName);
        setManageError('');
        setEditingCategory(null);
        setEditingCategoryName('');
    };

    return (
        <>
            <PageHero eyebrow="SERVICE" title="서비스 관리" subtitle="서비스 카테고리와 메뉴를 등록하고 가격을 설정합니다." />
            <StyledServiceBody>
                {grouped.size === 0 && <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>}
                {Array.from(grouped.entries()).map(([category, items]) => (
                    <StyledGroup
                        key={category}
                        onDragOver={(e) => handleCategoryDragOver(e, category)}
                        onDragLeave={() => {
                            if (dragOverCategory === category) {
                                setDragOverCategory(null);
                            }
                        }}
                        onDrop={() => handleCategoryDrop(category)}
                        onDragEnd={handleDragEnd}
                        $isCategoryDragging={draggingCategory === category}
                        $isCategoryDragOver={draggingCategory !== null && dragOverCategory === category && draggingCategory !== category}
                    >
                        <StyledCategoryToggle open>
                        <StyledCategoryHeader>
                            <StyledCategoryLabel>
                                <StyledCategoryNameChip>
                                    <StyledCategoryDragHandle
                                        draggable
                                        onDragStart={(e) => handleCategoryDragStart(e, category)}
                                        onClick={(e) => e.preventDefault()}
                                        title="카테고리 순서 이동"
                                        aria-label={`${category} 카테고리 순서 이동`}
                                    >
                                        <svg viewBox="0 0 16 16" aria-hidden="true">
                                            <rect x="2.5" y="3" width="11" height="1.5" rx="0.75" />
                                            <rect x="2.5" y="7.25" width="11" height="1.5" rx="0.75" />
                                            <rect x="2.5" y="11.5" width="11" height="1.5" rx="0.75" />
                                        </svg>
                                    </StyledCategoryDragHandle>
                                    <span>{category}</span>
                                </StyledCategoryNameChip>
                            </StyledCategoryLabel>
                        </StyledCategoryHeader>
                        {editingCategory === category && (
                            <StyledCategoryEditRow>
                                <StyledCategoryEditInput
                                    id="service-category-edit"
                                    value={editingCategoryName}
                                    onChange={(e) => setEditingCategoryName(e.target.value)}
                                    placeholder="카테고리명"
                                />
                                <StyledColorField>
                                    <StyledCategoryColorInput
                                        id={`service-category-color-${category}`}
                                        type="color"
                                        value={getCategoryBaseColor(category, categoryBaseColorMap)}
                                        onChange={(e) => updateCategoryBaseColor(category, e.target.value)}
                                        aria-label={`${category} 대표 컬러`}
                                        title={`${category} 대표 컬러`}
                                    />
                                </StyledColorField>
                                <StyledSaveBtn type="button" onClick={() => saveCategoryEdit(category)}>저장</StyledSaveBtn>
                                <StyledCancelBtn type="button" onClick={() => {
                                    setEditingCategory(null);
                                    setEditingCategoryName('');
                                    setManageError('');
                                }}>취소</StyledCancelBtn>
                            </StyledCategoryEditRow>
                        )}
                        <StyledCategoryBody>
                        {items.map((item) => (
                            <StyledItem
                                key={item.name}
                                draggable={!draggingCategory}
                                onDragStart={(e) => handleDragStart(e, item.name)}
                                onDragOver={(e) => handleDragOver(e, item.name)}
                                onDragLeave={() => {
                                    if (dragOverName === item.name) {
                                        setDragOverName(null);
                                    }
                                }}
                                onDrop={() => handleDrop(item.name)}
                                onDragEnd={handleDragEnd}
                                $isDragging={draggingName === item.name}
                                $isDragOver={draggingName !== null && dragOverName === item.name && draggingName !== item.name}
                                onClick={() => setEditingItem(item)}
                            >
                                <StyledViewRow>
                                    <StyledDragHandle>::</StyledDragHandle>
                                    <StyledServiceContent>
                                        <StyledServiceLeft>
                                            <StyledNameChip $color={getServiceColor(item.name, serviceColorMap)}>
                                                {item.name}
                                            </StyledNameChip>
                                            <StyledDuration>{formatDuration(item.durationMinutes)}</StyledDuration>
                                        </StyledServiceLeft>
                                        {item.price > 0 && <StyledPrice>{formatPrice(item.price)}</StyledPrice>}
                                    </StyledServiceContent>
                                </StyledViewRow>
                            </StyledItem>
                        ))}
                        </StyledCategoryBody>
                        </StyledCategoryToggle>
                        {editingCategory !== category && (
                            <StyledCategoryActions>
                                <StyledEditBtn type="button" onClick={() => startCategoryEdit(category)}>수정</StyledEditBtn>
                            </StyledCategoryActions>
                        )}
                    </StyledGroup>
                ))}
            </StyledServiceBody>
            <FieldError variant="inline">{manageError}</FieldError>

            <StyledServiceFooter>
                <StyledAddButton type="button" onClick={() => setShowAddModal(true)}>+ 서비스 추가</StyledAddButton>
            </StyledServiceFooter>

            {editingItem && (
                <ServiceEditModal
                    item={editingItem}
                    serviceCatalog={serviceCatalog}
                    onSave={handleSaveEdit}
                    onDelete={handleDelete}
                    onClose={() => setEditingItem(null)}
                />
            )}

            {showAddModal && (
                <ServiceAddModal
                    categories={categories}
                    serviceCatalog={serviceCatalog}
                    onAdd={handleAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Styled – Modal                                                     */
/* ------------------------------------------------------------------ */

const StyledServiceOverlay = styled(StyledOverlay)`
    z-index: 160;
`;

const StyledServiceModal = styled(StyledDetail)`
    width: min(100%, 380px);
    max-width: min(380px, 90vw);
`;

const StyledModalBody = styled.div`
    padding: 10px;
    overflow-y: auto;
`;

/* ------------------------------------------------------------------ */
/*  Styled – List                                                      */
/* ------------------------------------------------------------------ */


const StyledServiceBody = styled.div`
`;

const StyledGroup = styled.div<{ $isCategoryDragging: boolean; $isCategoryDragOver: boolean }>`
    position: relative;
    opacity: ${(p) => p.$isCategoryDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isCategoryDragOver ? 'rgba(36, 117, 58, 0.06)' : 'transparent'};
    border-radius: 4px;
    box-shadow: ${(p) => p.$isCategoryDragOver ? '0 8px 20px rgba(36, 117, 58, 0.12)' : 'none'};
    transition: background-color 0.16s ease, box-shadow 0.16s ease;

    &::before {
        content: ${(p) => p.$isCategoryDragOver ? "'여기로 이동'" : "''"};
        position: absolute;
        top: -10px;
        right: 12px;
        z-index: 4;
        display: ${(p) => p.$isCategoryDragOver ? 'inline-flex' : 'none'};
        align-items: center;
        height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: var(--success-color);
        color: var(--white-color);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: -0.01em;
        box-shadow: 0 8px 18px rgba(36, 117, 58, 0.24);
    }

    &::after {
        content: '';
        position: absolute;
        left: 12px;
        right: 12px;
        top: -2px;
        height: 4px;
        border-radius: 999px;
        background: ${(p) => p.$isCategoryDragOver ? 'var(--success-color)' : 'transparent'};
        box-shadow: ${(p) => p.$isCategoryDragOver ? '0 0 0 3px rgba(36, 117, 58, 0.14)' : 'none'};
    }

    & + & {
        margin-top: 4px;
    }
`;

const StyledCategoryToggle = styled.details``;

const StyledCategoryHeader = styled.summary`
    list-style: none;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    padding: 6px 0;
    position: sticky;
    top: 0;
    z-index: 2;
    cursor: pointer;
    backdrop-filter: blur(8px) saturate(180%);

    &::-webkit-details-marker {
        display: none;
    }

    &::after {
        content: '';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin-left: 8px;
        flex-shrink: 0;
        border: 1px solid var(--light-gray-color);
        border-radius: 999px;
        background: var(--white-color);
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 1.75L6.25 5L3 8.25' stroke='%23111827' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        transition: transform 0.18s ease;
        transform: rotate(270deg);
    }

    ${StyledCategoryToggle}[open] &::after {
        transform: rotate(90deg);
    }
`;

const StyledCategoryBody = styled.div``;

const StyledCategoryLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

const StyledCategoryNameChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

const StyledCategoryActions = styled.div`
    position: absolute;
    top: 6px;
    right: 0;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const StyledColorField = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledCategoryEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 0 6px;
`;

const StyledCategoryEditInput = styled.input`
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 12px;
    color: var(--dark-gray-color);
    outline: none;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }
`;

const StyledCategoryDragHandle = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
    cursor: grab;
    user-select: none;

    &:active {
        cursor: grabbing;
    }

    svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
    }
`;

const StyledCategoryColorInput = styled.input`
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    background: none;
`;

const StyledItem = styled.div<{ $isDragging: boolean; $isDragOver: boolean }>`
    position: relative;
    border-bottom: 1px solid var(--light-gray-color);
    opacity: ${(p) => p.$isDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isDragOver ? 'var(--gray-color2)' : 'transparent'};
    box-shadow: ${(p) => p.$isDragOver ? 'inset 0 2px 0 var(--dark-gray-color)' : 'none'};
    transition: background-color 0.16s ease, box-shadow 0.16s ease;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }

    &::before {
        content: ${(p) => p.$isDragOver ? "'이 위치로 이동'" : "''"};
        position: absolute;
        top: 6px;
        right: 16px;
        display: ${(p) => p.$isDragOver ? 'inline-flex' : 'none'};
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--dark-gray-color);
        color: var(--white-color);
        font-size: 10px;
        font-weight: 700;
    }
`;

const StyledViewRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 0;
    font-size: 13px;
`;

const StyledServiceContent = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledDragHandle = styled.span`
    flex-shrink: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
    cursor: grab;
    user-select: none;
`;

const StyledNameChip = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    width: fit-content;
    max-width: 100%;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: ${(p) => p.$color};
    background-color: ${(p) => `${p.$color}18`};
`;

const StyledServiceLeft = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const StyledDuration = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledPrice = styled.span`
    flex-shrink: 0;
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        margin-left: 0;
    }
`;

const StyledEditBtn = styled(StyledEditBtnBase)`
    background-color: var(--white-color);
`;

const StyledAddButton = styled.button`
    width: 100%;
    ${actionButtonStyle};
    border: 1px dashed var(--light-gray-color);
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            border-color: var(--blue-color);
            color: var(--blue-color);
        }
    }
`;



const StyledDeleteMsg = styled.p`
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.6;
    strong { font-weight: 700; }
`;
