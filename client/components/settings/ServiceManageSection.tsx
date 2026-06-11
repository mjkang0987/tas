import {useMemo, useState, type DragEvent} from 'react';

import {useCalendarStore} from '../../store/calendarStore';
import {useToastStore} from '../../store/toastStore';
import {PageHero} from '../ui/PageHero';
import {FieldError} from '../ui/FieldError';
import {EMPTY_TEXT, StyledSaveBtn, StyledCancelBtn, StyledServiceFooter, StyledEmpty} from './settings-styles';
import {buildServiceColorMap, formatPrice, formatDuration, getCategoryBaseColor, getGroupedCatalog, getServiceColor} from '../../utils/services';
import type {ServiceItem} from '../../utils/services';
import {ServiceEditModal} from './ServiceEditModal';
import {ServiceAddModal} from './ServiceAddModal';
import {
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
} from './ServiceManageSection.styles';

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
