import {useState} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

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
import {FieldError} from '../ui/FieldError';
import type {ServiceItem} from '../../utils/services';

export const StyledServiceOverlay = styled(StyledOverlay)`
    z-index: 160;
`;

export const StyledServiceModal = styled(StyledDetail)`
    width: min(100%, 380px);
    max-width: min(380px, 90vw);
`;

export const StyledModalBody = styled.div`
    padding: 10px;
    overflow-y: auto;
`;

const StyledDeleteMsg = styled.p`
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.6;
    strong { font-weight: 700; }
`;

export interface ServiceEditModalProps {
    item: ServiceItem;
    serviceCatalog: ServiceItem[];
    onSave: (original: ServiceItem, updated: ServiceItem) => void;
    onDelete: (name: string) => void;
    onClose: () => void;
}

export const ServiceEditModal = ({item, serviceCatalog, onSave, onDelete, onClose}: ServiceEditModalProps) => {
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
