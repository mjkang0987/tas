import {useState} from 'react';
import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {StyledConfirmOverlay, StyledDetail, StyledHeader, StyledFooter, StyledActionButton, StyledModalMessage, useDialogAccessibility, useLayerInstanceId} from '../calendar/overlays/ModalStyles';
import type {Designer, DesignerStatus} from '../../utils/designers';
import {getDesignerColor, splitDesignersByStatus} from '../../utils/designers';
import {StyledEditBtn, StyledSaveBtn, StyledCancelBtn, StyledServiceFooter} from './settings-styles';
import {DesignerSection, StyledDesignerMetaField, StyledDesignerMetaLabel, StyledDesignerColorInput, StyledDesignerMetaInput, StyledDesignerStatusSelect, compactInputStyle} from './DesignerCard';

const DESIGNER_STATUS_OPTIONS: DesignerStatus[] = ['재직', '휴직', '퇴직'];

/* ------------------------------------------------------------------ */
/*  ConfirmDialog                                                      */
/* ------------------------------------------------------------------ */

interface ConfirmDialogProps {
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}

const ConfirmDialog = ({message, onConfirm, onClose}: ConfirmDialogProps) => {
    const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    const {layerId, layerDataId} = useLayerInstanceId('designer-confirm');
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    if (!modalRoot) return null;

    return createPortal(
        <StyledConfirmOverlay onClick={onClose} role="dialog" aria-modal="true" aria-label="확인" id={layerId} data-layer-id={layerDataId}>
            <StyledDetail ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                <StyledHeader><h3>확인</h3></StyledHeader>
                <StyledConfirmBody>
                    <StyledModalMessage>{message}</StyledModalMessage>
                </StyledConfirmBody>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onClose}>취소</StyledActionButton>
                    <StyledActionButton type="button" $danger onClick={() => { onConfirm(); onClose(); }}>확인</StyledActionButton>
                </StyledFooter>
            </StyledDetail>
        </StyledConfirmOverlay>,
        modalRoot
    );
};

/* ------------------------------------------------------------------ */
/*  DesignerManageSection                                              */
/* ------------------------------------------------------------------ */

export const DesignerManageSection = () => {
    const designers = useCalendarStore((s) => s.designers);
    const addDesigner = useCalendarStore((s) => s.addDesigner);
    const updateDesigner = useCalendarStore((s) => s.updateDesigner);
    const updateDesignerDay = useCalendarStore((s) => s.updateDesignerDay);
    const [newName, setNewName] = useState('');
    const [newStatus, setNewStatus] = useState<DesignerStatus>('재직');
    const [newPhone, setNewPhone] = useState('');
    const [newNote, setNewNote] = useState('');
    const [newColor, setNewColor] = useState(getDesignerColor({id: 1}));
    const [editingDesignerId, setEditingDesignerId] = useState<number | null>(null);
    const [isAddingDesigner, setIsAddingDesigner] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<Designer | null>(null);
    const {active: activeDesigners, onLeave: onLeaveDesigners, resigned: resignedDesigners} = splitDesignersByStatus(designers);

    const handleAdd = () => {
        const name = newName.trim();
        if (!name) return;
        addDesigner(name, newStatus, newPhone.trim(), newNote.trim(), newColor);
        setNewName('');
        setNewStatus('재직');
        setNewPhone('');
        setNewNote('');
        setNewColor(getDesignerColor({id: designers.length + 2}));
        setIsAddingDesigner(false);
    };

    const handleRequestDelete = (designer: Designer) => {
        setConfirmTarget(designer);
    };

    const handleConfirmDelete = () => {
        if (!confirmTarget) return;
        updateDesigner(confirmTarget.id, {status: '퇴직'});
        setEditingDesignerId(null);
        setConfirmTarget(null);
    };

    return (
        <>
            <PageHero eyebrow="DESIGNER" title="디자이너 관리" subtitle="디자이너 정보, 근무 일정, 재직 상태를 관리합니다." />
            <StyledDesignerBody>
                <DesignerSection
                    title="재직자"
                    designers={activeDesigners}
                    editingDesignerId={editingDesignerId}
                    onUpdateDesigner={updateDesigner}
                    onUpdateDesignerDay={updateDesignerDay}
                    onStartEdit={setEditingDesignerId}
                    onFinishEdit={() => setEditingDesignerId(null)}
                    onDeleteDesigner={handleRequestDelete}
                />
                <DesignerSection
                    title="휴직자"
                    designers={onLeaveDesigners}
                    editingDesignerId={editingDesignerId}
                    onUpdateDesigner={updateDesigner}
                    onUpdateDesignerDay={updateDesignerDay}
                    onStartEdit={setEditingDesignerId}
                    onFinishEdit={() => setEditingDesignerId(null)}
                    onDeleteDesigner={handleRequestDelete}
                />
                <DesignerSection
                    title="퇴직자"
                    designers={resignedDesigners}
                    editingDesignerId={editingDesignerId}
                    onUpdateDesigner={updateDesigner}
                    onUpdateDesignerDay={updateDesignerDay}
                    onStartEdit={setEditingDesignerId}
                    onFinishEdit={() => setEditingDesignerId(null)}
                    onDeleteDesigner={handleRequestDelete}
                />
            </StyledDesignerBody>
            <StyledServiceFooter>
                <StyledDesignerFooterActions>
                    {isAddingDesigner ? (
                        <StyledAddForm>
                            <StyledAddFormGrid>
                                <StyledDesignerMetaField>
                                    <StyledDesignerMetaLabel htmlFor="new-designer-name">디자이너명</StyledDesignerMetaLabel>
                                    <StyledAddInput
                                        id="new-designer-name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="새 디자이너명"
                                    />
                                </StyledDesignerMetaField>
                                <StyledDesignerMetaField>
                                    <StyledDesignerMetaLabel htmlFor="new-designer-status">상태</StyledDesignerMetaLabel>
                                    <StyledDesignerStatusSelect
                                        id="new-designer-status"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value as DesignerStatus)}
                                    >
                                        {DESIGNER_STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </StyledDesignerStatusSelect>
                                </StyledDesignerMetaField>
                                <StyledDesignerMetaField>
                                    <StyledDesignerMetaLabel htmlFor="new-designer-phone">연락처</StyledDesignerMetaLabel>
                                    <StyledAddInput
                                        id="new-designer-phone"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        placeholder="연락처"
                                    />
                                </StyledDesignerMetaField>
                                <StyledDesignerMetaField>
                                    <StyledDesignerMetaLabel htmlFor="new-designer-color">컬러</StyledDesignerMetaLabel>
                                    <StyledDesignerColorInput
                                        id="new-designer-color"
                                        type="color"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                    />
                                </StyledDesignerMetaField>
                            </StyledAddFormGrid>
                            <StyledDesignerMetaField>
                                <StyledDesignerMetaLabel htmlFor="new-designer-note">메모</StyledDesignerMetaLabel>
                                <StyledDesignerMetaInput
                                    id="new-designer-note"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="특이사항 메모"
                                />
                            </StyledDesignerMetaField>
                            <StyledAddFormActions>
                                <StyledCancelBtn
                                    type="button"
                                    onClick={() => {
                                        setIsAddingDesigner(false);
                                        setNewName('');
                                        setNewStatus('재직');
                                        setNewPhone('');
                                        setNewNote('');
                                        setNewColor(getDesignerColor({id: designers.length + 1}));
                                    }}
                                >
                                    취소
                                </StyledCancelBtn>
                                <StyledSaveBtn type="button" onClick={handleAdd}>추가</StyledSaveBtn>
                            </StyledAddFormActions>
                        </StyledAddForm>
                    ) : (
                        <StyledEditBtn type="button" onClick={() => setIsAddingDesigner(true)}>디자이너 추가</StyledEditBtn>
                    )}
                </StyledDesignerFooterActions>
            </StyledServiceFooter>
            {confirmTarget && (
                <ConfirmDialog
                    message={`"${confirmTarget.name}" 디자이너를 퇴직 처리하시겠습니까?`}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setConfirmTarget(null)}
                />
            )}
        </>
    );
};

/* ------------------------------------------------------------------ */
/*  Styled Components                                                  */
/* ------------------------------------------------------------------ */

const StyledConfirmBody = styled.div`
    padding: 16px 20px;
`;

const StyledAddInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;
`;

const StyledDesignerBody = styled.div`
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const StyledAddForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 12px;
    border: 1px dashed var(--light-gray-color);
    border-radius: 10px;
    background: var(--bg-subtle);
`;

const StyledAddFormGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 80px;
    gap: 10px;

    @media (max-width: 760px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

const StyledAddFormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    @media (max-width: 640px) {
        ${StyledSaveBtn},
        ${StyledCancelBtn} {
            flex: 1;
        }
    }
`;

const StyledDesignerFooterActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;
