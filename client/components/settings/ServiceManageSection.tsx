import {useMemo, useState, type DragEvent} from 'react';

import styled, {css} from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {buildServiceColorMap, formatPrice, formatDuration, getCategoryBaseColor, getGroupedCatalog, getServiceColor} from '../../utils/services';
import type {ServiceItem} from '../../utils/services';
import {formControlStyle} from '../ui/FormControls';

interface EditState {
    name: string;
    durationMinutes: string;
    price: string;
}

const EMPTY_FORM = {name: '', category: '', durationMinutes: '', price: ''};

export const ServiceManageSection = () => {
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

    const [editingName, setEditingName] = useState<string | null>(null);
    const [editState, setEditState] = useState<EditState>({name: '', durationMinutes: '', price: ''});
    const [form, setForm] = useState(EMPTY_FORM);
    const [newCategory, setNewCategory] = useState('');
    const [addError, setAddError] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [draggingName, setDraggingName] = useState<string | null>(null);
    const [dragOverName, setDragOverName] = useState<string | null>(null);
    const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    const startEdit = (item: ServiceItem) => {
        setEditingName(item.name);
        setEditState({
            name: item.name,
            durationMinutes: String(item.durationMinutes),
            price: String(item.price),
        });
    };

    const saveEdit = (original: ServiceItem) => {
        const updated: ServiceItem = {
            name: editState.name.trim() || original.name,
            category: original.category,
            durationMinutes: Number(editState.durationMinutes) || 0,
            price: Number(editState.price) || 0,
        };
        updateService(original.name, updated);
        setEditingName(null);
    };

    const handleDelete = (name: string) => {
        if (confirm(`"${name}" 항목을 삭제하시겠습니까?`)) {
            deleteService(name);
            if (editingName === name) setEditingName(null);
        }
    };

    const handleAdd = () => {
        const name = form.name.trim();
        const category = form.category === '__new' ? newCategory.trim() : form.category.trim();
        if (!category) {
            setAddError(form.category === '__new'
                ? '새 카테고리명을 입력해 주세요.'
                : '카테고리를 선택하거나 새 카테고리를 추가해 주세요.');
            return;
        }
        if (!name) return;
        if (serviceCatalog.some((item) => item.name === name)) {
            setAddError(`"${name}" 시술은 이미 등록되어 있습니다.`);
            return;
        }

        addService({
            name,
            category,
            durationMinutes: Number(form.durationMinutes) || 0,
            price: Number(form.price) || 0,
        });
        setAddError('');
        setForm(EMPTY_FORM);
        setNewCategory('');
        setShowAdd(false);
    };

    const handleDragStart = (name: string) => {
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

    const handleCategoryDragStart = (category: string) => {
        setDraggingCategory(category);
        setDragOverCategory(null);
        setDraggingName(null);
        setDragOverName(null);
    };

    const handleCategoryDragOver = (e: DragEvent<HTMLDivElement>, category: string) => {
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
    };

    const saveCategoryEdit = (category: string) => {
        const nextName = editingCategoryName.trim();
        if (!nextName) return;
        renameCategory(category, nextName);
        setEditingCategory(null);
        setEditingCategoryName('');
    };

    return (
        <>
            <StyledServiceBody>
                {Array.from(grouped.entries()).map(([category, items]) => (
                    <StyledGroup
                        key={category}
                        onDragOver={(e) => handleCategoryDragOver(e, category)}
                        onDrop={() => handleCategoryDrop(category)}
                        onDragEnd={handleDragEnd}
                        $isCategoryDragging={draggingCategory === category}
                        $isCategoryDragOver={dragOverCategory === category && draggingCategory !== category}
                    >
                        <StyledCategoryHeader>
                            {editingCategory === category ? (
                                <StyledCategoryEditRow>
                                    <StyledCategoryEditInput
                                        value={editingCategoryName}
                                        onChange={(e) => setEditingCategoryName(e.target.value)}
                                        placeholder="카테고리명"
                                    />
                                    <StyledSaveBtn type="button" onClick={() => saveCategoryEdit(category)}>저장</StyledSaveBtn>
                                    <StyledCancelBtn type="button" onClick={() => {
                                        setEditingCategory(null);
                                        setEditingCategoryName('');
                                    }}>취소</StyledCancelBtn>
                                </StyledCategoryEditRow>
                            ) : (
                                <StyledCategoryLabel>
                                    <StyledCategoryDragHandle
                                        draggable
                                        onDragStart={() => handleCategoryDragStart(category)}
                                        title="카테고리 순서 이동"
                                    >
                                        ::
                                    </StyledCategoryDragHandle>
                                    <span>{category}</span>
                                </StyledCategoryLabel>
                            )}
                            <StyledCategoryActions>
                                {editingCategory !== category && (
                                    <StyledEditBtn type="button" onClick={() => startCategoryEdit(category)}>이름수정</StyledEditBtn>
                                )}
                                <StyledCategoryColorInput
                                    type="color"
                                    value={getCategoryBaseColor(category, categoryBaseColorMap)}
                                    onChange={(e) => updateCategoryBaseColor(category, e.target.value)}
                                    aria-label={`${category} 대표 컬러`}
                                    title={`${category} 대표 컬러`}
                                />
                            </StyledCategoryActions>
                        </StyledCategoryHeader>
                        {items.map((item) => (
                            <StyledItem
                                key={item.name}
                                draggable={editingName !== item.name && !draggingCategory}
                                onDragStart={() => handleDragStart(item.name)}
                                onDragOver={(e) => handleDragOver(e, item.name)}
                                onDrop={() => handleDrop(item.name)}
                                onDragEnd={handleDragEnd}
                                $isDragging={draggingName === item.name}
                                $isDragOver={dragOverName === item.name && draggingName !== item.name}
                            >
                                {editingName === item.name ? (
                                    <StyledEditRow>
                                        <StyledEditInput
                                            value={editState.name}
                                            onChange={(e) => setEditState({...editState, name: e.target.value})}
                                            placeholder="시술명"
                                        />
                                        <StyledEditSmall
                                            type="number"
                                            value={editState.durationMinutes}
                                            onChange={(e) => setEditState({...editState, durationMinutes: e.target.value})}
                                            placeholder="분"
                                        />
                                        <StyledEditSmall
                                            type="number"
                                            value={editState.price}
                                            onChange={(e) => setEditState({...editState, price: e.target.value})}
                                            placeholder="원"
                                        />
                                        <StyledSaveBtn type="button" onClick={() => saveEdit(item)}>저장</StyledSaveBtn>
                                        <StyledCancelBtn type="button" onClick={() => setEditingName(null)}>취소</StyledCancelBtn>
                                    </StyledEditRow>
                                ) : (
                                    <StyledViewRow>
                                        <StyledDragHandle>::</StyledDragHandle>
                                        <StyledServiceContent>
                                            <StyledServiceMainLine>
                                                <StyledNameChip $color={getServiceColor(item.name, serviceColorMap)}>
                                                    {item.name}
                                                </StyledNameChip>
                                                <StyledServiceActions>
                                                    <StyledEditBtn type="button" onClick={() => startEdit(item)}>수정</StyledEditBtn>
                                                    <StyledDeleteBtn type="button" onClick={() => handleDelete(item.name)}>삭제</StyledDeleteBtn>
                                                </StyledServiceActions>
                                            </StyledServiceMainLine>
                                            <StyledMeta>
                                                {formatDuration(item.durationMinutes)}
                                                {item.price > 0 && ` / ${formatPrice(item.price)}`}
                                            </StyledMeta>
                                        </StyledServiceContent>
                                    </StyledViewRow>
                                )}
                            </StyledItem>
                        ))}
                    </StyledGroup>
                ))}
            </StyledServiceBody>

            <StyledServiceFooter>
                {showAdd ? (
                    <StyledAddForm>
                        <StyledAddRow>
                            <select
                                value={form.category}
                                aria-label="시술 카테고리"
                                onChange={(e) => {
                                    setForm({...form, category: e.target.value});
                                    setAddError('');
                                }}
                            >
                                <option value="">카테고리</option>
                                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                                <option value="__new">+ 새 카테고리</option>
                            </select>
                            {form.category === '__new' && (
                                <StyledAddInput
                                    value={newCategory}
                                    placeholder="카테고리명"
                                    onChange={(e) => {
                                        setNewCategory(e.target.value);
                                        setAddError('');
                                    }}
                                />
                            )}
                        </StyledAddRow>
                        {(addError || !form.category) && (
                            <StyledAddNotice>
                                {addError || '카테고리를 먼저 선택하거나 새 카테고리를 추가해 주세요.'}
                            </StyledAddNotice>
                        )}
                        <StyledAddRow>
                            <StyledAddInput
                                value={form.name}
                                onChange={(e) => {
                                    setForm({...form, name: e.target.value});
                                    setAddError('');
                                }}
                                placeholder="시술명"
                            />
                            <StyledAddSmall
                                type="number"
                                value={form.durationMinutes}
                                onChange={(e) => setForm({...form, durationMinutes: e.target.value})}
                                placeholder="소요시간(분)"
                            />
                            <StyledAddSmall
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({...form, price: e.target.value})}
                                placeholder="가격(원)"
                            />
                        </StyledAddRow>
                        <StyledAddActions>
                            <StyledSaveBtn type="button" onClick={handleAdd}>추가</StyledSaveBtn>
                            <StyledCancelBtn type="button" onClick={() => {
                                setShowAdd(false);
                                setForm(EMPTY_FORM);
                                setNewCategory('');
                                setAddError('');
                            }}>취소</StyledCancelBtn>
                        </StyledAddActions>
                    </StyledAddForm>
                ) : (
                    <StyledAddButton type="button" onClick={() => {
                        setShowAdd(true);
                        setAddError('');
                    }}>+ 시술 추가</StyledAddButton>
                )}
            </StyledServiceFooter>
        </>
    );
};

const compactInputStyle = css`
    ${formControlStyle};
`;

const actionButtonStyle = css`
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        
    }
    }
`;

const mobileStretchButtonStyle = css`
    @media (max-width: 640px) {
        flex: 1;
    }
`;

const StyledServiceBody = styled.div`
    overflow-y: auto;
    overscroll-behavior: auto;
    padding: 8px 0;
`;

const StyledGroup = styled.div<{ $isCategoryDragging: boolean; $isCategoryDragOver: boolean }>`
    opacity: ${(p) => p.$isCategoryDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isCategoryDragOver ? 'var(--black-color-10)' : 'transparent'};
    border-radius: 4px;

    & + & {
        margin-top: 4px;
    }
`;

const StyledCategoryHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    padding: 6px 16px;
    background-color: var(--black-color-10);
    position: sticky;
    top: 0;
    z-index: 2;
`;

const StyledCategoryLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

const StyledCategoryActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const StyledCategoryEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
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
    flex-shrink: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
    cursor: grab;
    user-select: none;
`;

const StyledCategoryColorInput = styled.input`
    width: 24px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    background: none;
    cursor: pointer;
`;

const StyledItem = styled.div<{ $isDragging: boolean; $isDragOver: boolean }>`
    padding: 0 16px;
    border-bottom: 1px solid var(--black-color-10);
    opacity: ${(p) => p.$isDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isDragOver ? 'var(--black-color-10)' : 'transparent'};
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
    flex-direction: column;
    gap: 4px;
`;

const StyledServiceMainLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    @media (max-width: 640px) {
        flex-wrap: wrap;
        row-gap: 6px;
    }
`;

const StyledServiceActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-left: auto;

    @media (max-width: 640px) {
        margin-left: 0;
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
    flex: 1;
    min-width: 0;
    width: fit-content;
    max-width: 100%;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: ${(p) => p.$color};
    background-color: ${(p) => `${p.$color}18`};
`;

const StyledMeta = styled.span`
    display: block;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledEditBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    font-size: 11px;
    color: var(--dark-gray-color);
`;

const StyledDeleteBtn = styled.button`
    ${actionButtonStyle};
    border: 1px solid var(--danger-border);
    background: var(--danger-bg);
    font-size: 11px;
    color: var(--danger-color);
`;

const StyledEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 0;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledEditInput = styled.input`
    flex: 1;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 6px;
`;

const StyledEditSmall = styled.input`
    width: 60px;
    ${compactInputStyle};
    padding: 0 4px;
    text-align: right;

    @media (max-width: 640px) {
        flex: 1;
        width: auto;
        min-width: 0;
    }
`;

const StyledSaveBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--blue-color);
    background-color: var(--blue-color);
    color: #fff;
`;

const StyledCancelBtn = styled.button`
    ${actionButtonStyle};
    ${mobileStretchButtonStyle};
    border: 1px solid var(--light-gray-color);
    background: none;
    color: var(--dark-gray-color);
`;

const StyledServiceFooter = styled.div`
    padding: 12px 16px;
    border-top: 1px solid var(--light-gray-color);
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
        border-color: var(--blue-color);
        color: var(--blue-color);
    }
    }
`;

const StyledAddForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledAddRow = styled.div`
    display: flex;
    gap: 4px;

    @media (max-width: 640px) {
        flex-direction: column;
    }

    > select {
        ${compactInputStyle};
        padding: 0 4px;

        @media (max-width: 640px) {
            width: 100%;
        }
    }
`;

const StyledAddInput = styled.input`
    flex: 1;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 6px;
`;

const StyledAddNotice = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--red-color);
`;

const StyledAddSmall = styled.input`
    width: 80px;
    ${compactInputStyle};
    padding: 0 4px;
    text-align: right;

    @media (max-width: 640px) {
        width: 100%;
    }
`;

const StyledAddActions = styled.div`
    display: flex;
    gap: 4px;
    justify-content: flex-end;

    @media (max-width: 640px) {
        justify-content: stretch;
    }
`;
