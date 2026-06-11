import {useState} from 'react';
import {createPortal} from 'react-dom';

import {
    StyledHeader,
    StyledFooter,
    StyledActionButton,
    StyledForm,
    StyledFieldRow,
    useDialogAccessibility,
    useLayerInstanceId,
} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';
import {FieldError} from '../ui/FieldError';
import type {ServiceItem} from '../../utils/services';
import {StyledServiceOverlay, StyledServiceModal, StyledModalBody} from './ServiceEditModal';

export interface ServiceAddModalProps {
    categories: string[];
    serviceCatalog: ServiceItem[];
    onAdd: (item: ServiceItem) => void;
    onClose: () => void;
}

const EMPTY_ADD = {name: '', category: '', durationMinutes: '', price: ''};

export const ServiceAddModal = ({categories, serviceCatalog, onAdd, onClose}: ServiceAddModalProps) => {
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
