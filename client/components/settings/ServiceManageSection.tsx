import {useMemo, useState, type DragEvent} from 'react';
import {useToastStore} from '../../store/toastStore';
import {createPortal} from 'react-dom';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {actionButtonStyle, EMPTY_TEXT, StyledEditBtn as StyledEditBtnBase, StyledSaveBtn, StyledCancelBtn, StyledServiceFooter, StyledEmpty} from './settings-styles';
import {buildServiceColorMap, formatPrice, formatDuration, getCategoryBaseColor, getGroupedCatalog, getServiceColor} from '../../utils/services';
import type {ServiceItem} from '../../utils/services';
import {
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitle,
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
import {
    StyledServiceOverlay,
    StyledServiceModal,
    StyledModalBody,
    StyledServiceBody,
    StyledGroup,
    StyledCategoryToggle,
    StyledCategoryHeader,
    StyledCategoryBody,
    StyledCategoryLabel,
    StyledCategoryNameChip,
    StyledCategoryActions,
    StyledColorField,
    StyledCategoryEditRow,
    StyledCategoryEditInput,
    StyledCategoryDragHandle,
    StyledCategoryDragHandleIcon,
    StyledCategoryColorInput,
    StyledItem,
    StyledViewRow,
    StyledServiceContent,
    StyledDragHandle,
    StyledNameChip,
    StyledServiceLeft,
    StyledDuration,
    StyledPrice,
    StyledEditBtn,
    StyledAddButton,
    StyledDeleteMsg,
    StyledDeleteTarget,
} from './ServiceManageSection.styles';

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
                    <StyledHeaderTitle>서비스 수정</StyledHeaderTitle>
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
                        <StyledHeader><StyledHeaderTitle>서비스 삭제</StyledHeaderTitle></StyledHeader>
                        <StyledDeleteMsg>
                            <StyledDeleteTarget>"{item.name}"</StyledDeleteTarget> 서비스를 삭제하시겠습니까?<br />
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
                    <StyledHeaderTitle>서비스 추가</StyledHeaderTitle>
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
        const appliedCount = updateService(original.name, updated);
        setEditingItem(null);
        toast(appliedCount > 0
            ? `서비스가 저장되었습니다. 예정된 예약 ${appliedCount}건에 반영했습니다.`
            : '서비스가 저장되었습니다.');
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
                                        <StyledCategoryDragHandleIcon viewBox="0 0 16 16" aria-hidden="true">
                                            <rect x="2.5" y="3" width="11" height="1.5" rx="0.75" />
                                            <rect x="2.5" y="7.25" width="11" height="1.5" rx="0.75" />
                                            <rect x="2.5" y="11.5" width="11" height="1.5" rx="0.75" />
                                        </StyledCategoryDragHandleIcon>
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

/* ------------------------------------------------------------------ */
/*  Styled – List                                                      */
/* ------------------------------------------------------------------ */
