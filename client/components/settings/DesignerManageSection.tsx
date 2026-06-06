import {useState} from 'react';
import {createPortal} from 'react-dom';

import styled, {css} from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {StyledConfirmOverlay, StyledDetail, StyledHeader, StyledFooter, StyledActionButton, StyledModalMessage, useDialogAccessibility, useLayerInstanceId} from '../calendar/overlays/ModalStyles';
import type {Designer, DesignerStatus} from '../../utils/designers';
import {WEEKDAY_LABELS, getDesignerColor, getDesignerStatus, getDesignerStatusMeta, splitDesignersByStatus, sortDesigners} from '../../utils/designers';
import {Dot} from '../ui/Dot';
import {formControlStyle} from '../ui/FormControls';
import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, StyledServiceFooter} from './settings-styles';

const DESIGNER_STATUS_OPTIONS: DesignerStatus[] = ['재직', '휴직', '퇴직'];

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

interface DesignerCardProps {
    designer: Designer;
    isEditing: boolean;
    onUpdateDesigner: (designerId: number, patch: Partial<Pick<Designer, 'name' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    onUpdateDesignerDay: (designerId: number, dayIndex: number, patch: {enabled?: boolean; start?: string; end?: string}) => void;
    onStartEdit: (designerId: number) => void;
    onFinishEdit: () => void;
    onDeleteDesigner: (designer: Designer) => void;
}

const DesignerCard = ({
    designer,
    isEditing,
    onUpdateDesigner,
    onUpdateDesignerDay,
    onStartEdit,
    onFinishEdit,
    onDeleteDesigner,
}: DesignerCardProps) => {
    const did = designer.id;
    return (
    <StyledDesignerCard $status={getDesignerStatus(designer)} $designerColor={getDesignerColor(designer)} $isEditing={isEditing}>
        <StyledDesignerHeader>
            <StyledDesignerHeaderLeft>
                <Dot color={getDesignerColor(designer)} size={10} />
                {isEditing ? (
                    <StyledDesignerNameInput
                        id={`designer-${did}-name`}
                        value={designer.name}
                        onChange={(e) => onUpdateDesigner(did, {name: e.target.value})}
                        placeholder="디자이너명"
                        aria-label="디자이너명"
                    />
                ) : (
                    <StyledDesignerName>{designer.name}</StyledDesignerName>
                )}
                {isEditing ? (
                    <StyledDesignerStatusSelect
                        id={`designer-${did}-status`}
                        value={getDesignerStatus(designer)}
                        aria-label={`${designer.name} 상태`}
                        onChange={(e) => {
                            const nextStatus = e.target.value as DesignerStatus;
                            const currentStatus = getDesignerStatus(designer);

                            if (nextStatus === currentStatus) return;
                            if (nextStatus === '퇴직') {
                                e.target.value = currentStatus;
                                onDeleteDesigner(designer);
                                return;
                            }

                            onUpdateDesigner(did, {status: nextStatus});
                        }}
                    >
                        {DESIGNER_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </StyledDesignerStatusSelect>
                ) : (
                    <StyledDesignerStatusBadge $status={getDesignerStatus(designer)}>
                        {getDesignerStatus(designer)}
                    </StyledDesignerStatusBadge>
                )}
            </StyledDesignerHeaderLeft>
            <StyledDesignerHeaderActions>
                {isEditing ? (
                    <>
                        <StyledDeleteBtn type="button" onClick={() => onDeleteDesigner(designer)}>삭제</StyledDeleteBtn>
                        <StyledCancelBtn type="button" onClick={onFinishEdit}>완료</StyledCancelBtn>
                    </>
                ) : (
                    <StyledEditBtn type="button" onClick={() => onStartEdit(did)}>수정</StyledEditBtn>
                )}
            </StyledDesignerHeaderActions>
        </StyledDesignerHeader>
        <StyledDesignerMetaGrid>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel htmlFor={`designer-${did}-phone`}>연락처</StyledDesignerMetaLabel>
                <StyledDesignerMetaInput
                    id={`designer-${did}-phone`}
                    value={designer.phone ?? ''}
                    disabled={!isEditing}
                    onChange={(e) => onUpdateDesigner(did, {phone: e.target.value})}
                    placeholder="010-0000-0000"
                />
            </StyledDesignerMetaField>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel htmlFor={`designer-${did}-note`}>메모</StyledDesignerMetaLabel>
                <StyledDesignerMetaInput
                    id={`designer-${did}-note`}
                    value={designer.note ?? ''}
                    disabled={!isEditing}
                    onChange={(e) => onUpdateDesigner(did, {note: e.target.value})}
                    placeholder="특이사항 메모"
                />
            </StyledDesignerMetaField>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel htmlFor={`designer-${did}-color`}>컬러</StyledDesignerMetaLabel>
                <StyledDesignerColorInput
                    id={`designer-${did}-color`}
                    type="color"
                    value={getDesignerColor(designer)}
                    disabled={!isEditing}
                    onChange={(e) => onUpdateDesigner(did, {color: e.target.value})}
                />
            </StyledDesignerMetaField>
        </StyledDesignerMetaGrid>
        {getDesignerStatus(designer) === '재직' ? (
            <StyledScheduleList>
                {WEEKDAY_LABELS.map((label, dayIndex) => {
                    const day = designer.schedule[dayIndex];
                    if (!day) return null;
                    const dayId = `designer-${did}-day-${dayIndex}`;

                    return (
                        <StyledScheduleRow key={dayId}>
                            <StyledDayLabel>{label}</StyledDayLabel>
                            <StyledDaySwitch htmlFor={`${dayId}-enabled`}>
                                <input
                                    id={`${dayId}-enabled`}
                                    type="checkbox"
                                    checked={day.enabled}
                                    disabled={!isEditing}
                                    onChange={(e) => onUpdateDesignerDay(did, dayIndex, {enabled: e.target.checked})}
                                />
                                <span>{day.enabled ? '근무' : '휴무'}</span>
                            </StyledDaySwitch>
                            <StyledTimeRange>
                                <StyledTimeInput
                                    id={`${dayId}-start`}
                                    type="time"
                                    value={day.start}
                                    aria-label={`${label} 시작`}
                                    disabled={!isEditing || !day.enabled}
                                    onChange={(e) => onUpdateDesignerDay(did, dayIndex, {start: e.target.value})}
                                />
                                <StyledTimeRangeDivider>~</StyledTimeRangeDivider>
                                <StyledTimeInput
                                    id={`${dayId}-end`}
                                    type="time"
                                    value={day.end}
                                    aria-label={`${label} 종료`}
                                    disabled={!isEditing || !day.enabled}
                                    onChange={(e) => onUpdateDesignerDay(did, dayIndex, {end: e.target.value})}
                                />
                            </StyledTimeRange>
                        </StyledScheduleRow>
                    );
                })}
            </StyledScheduleList>
        ) : (
            <StyledScheduleCollapsedNotice $status={getDesignerStatus(designer)}>
                {getDesignerStatus(designer) === '휴직'
                    ? '휴직 상태에서는 근무시간 설정을 접어 둡니다. 복귀 후 다시 조정할 수 있습니다.'
                    : '퇴직 상태에서는 예약 선택이 비활성화되며 근무시간 설정을 표시하지 않습니다.'}
            </StyledScheduleCollapsedNotice>
        )}
    </StyledDesignerCard>
    );
};

interface DesignerSectionProps {
    title: string;
    designers: Designer[];
    editingDesignerId: number | null;
    onUpdateDesigner: (designerId: number, patch: Partial<Pick<Designer, 'name' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    onUpdateDesignerDay: (designerId: number, dayIndex: number, patch: {enabled?: boolean; start?: string; end?: string}) => void;
    onStartEdit: (designerId: number) => void;
    onFinishEdit: () => void;
    onDeleteDesigner: (designer: Designer) => void;
}

const DesignerSection = ({
    title,
    designers,
    editingDesignerId,
    onUpdateDesigner,
    onUpdateDesignerDay,
    onStartEdit,
    onFinishEdit,
    onDeleteDesigner,
}: DesignerSectionProps) => (
    <StyledDesignerSection>
        <StyledDesignerSectionTitle>{title}</StyledDesignerSectionTitle>
        {designers.length > 0 ? (
            <StyledDesignerCardGrid>
                {sortDesigners(designers).map((designer) => (
                    <DesignerCard
                        key={designer.id}
                        designer={designer}
                        isEditing={editingDesignerId === designer.id}
                        onUpdateDesigner={onUpdateDesigner}
                        onUpdateDesignerDay={onUpdateDesignerDay}
                        onStartEdit={onStartEdit}
                        onFinishEdit={onFinishEdit}
                        onDeleteDesigner={onDeleteDesigner}
                    />
                ))}
            </StyledDesignerCardGrid>
        ) : (
            <StyledSectionEmpty>{title} 없음</StyledSectionEmpty>
        )}
    </StyledDesignerSection>
);

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

const StyledConfirmBody = styled.div`
    padding: 16px 20px;
`;

const compactInputStyle = css`
    ${formControlStyle};
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

const StyledDesignerCardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 800px) {
        grid-template-columns: 1fr;
    }
`;

const StyledDesignerSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledDesignerSectionTitle = styled.strong`
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledSectionEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    border: 1px dashed rgba(148, 163, 184, 0.32);
    border-radius: 10px;
    background: rgba(248, 250, 252, 0.6);
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledDesignerCard = styled.div<{ $status: DesignerStatus; $designerColor: string; $isEditing: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid ${({$designerColor}) => `${$designerColor}44`};
    border-left: 4px solid ${({$designerColor}) => $designerColor};
    border-radius: 10px;
    padding: 8px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, ${({$designerColor}) => `${$designerColor}10`} 100%);
    box-shadow: ${({$isEditing}) => $isEditing
            ? '0 0 0 2px var(--blue-color), 0 8px 18px rgba(15, 23, 42, 0.05)'
            : '0 8px 18px rgba(15, 23, 42, 0.05)'};
    transition: box-shadow 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: ${({$designerColor}) => `${$designerColor}66`};
            box-shadow: ${({$isEditing}) => $isEditing
                    ? '0 0 0 2px var(--blue-color), 0 14px 26px rgba(15, 23, 42, 0.08)'
                    : '0 14px 26px rgba(15, 23, 42, 0.08)'};
            background-color: ${({$designerColor}) => `${$designerColor}14`};
        }
    }
    
    @media (max-width: 640px) {
        padding: 10px 10px 10px 12px;
        gap: 8px;
    }
`;

const StyledDesignerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    @media (max-width: 640px) {
        gap: 6px;
    }
`;

const StyledDesignerHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;

    @media (max-width: 640px) {
        gap: 6px;
        flex-wrap: wrap;
    }
`;

const StyledDesignerName = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: var(--dark-gray-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StyledDesignerHeaderActions = styled.div`
    display: flex;
    flex-shrink: 0;
    gap: 6px;
`;

const StyledDesignerMetaGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) 32px;
    gap: 4px;
    border-radius: 8px;
    background: rgba(248, 250, 252, 0.92);

    @media (max-width: 760px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
        padding: 8px;
    }
`;

const StyledDesignerMetaField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const StyledDesignerMetaLabel = styled.label`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledDesignerColorInput = styled.input`
    width: 32px;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
`;

const StyledDesignerNameInput = styled.input`
    flex: 1;
    min-width: 80px;
    max-width: 200px;
    ${compactInputStyle};
    min-height: 30px;
    padding: 0 8px;
    font-size: 14px;
    font-weight: 700;

    @media (max-width: 640px) {
        min-width: 0;
        max-width: none;
        width: 100%;
        font-size: 13px;
    }
`;

const StyledDesignerMetaInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;

    &:focus {
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }
`;

const StyledDesignerStatusSelect = styled.select`
    flex-shrink: 0;
    ${compactInputStyle};
    min-height: 28px;
    padding: 0 8px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledDesignerStatusBadge = styled.span<{ $status: DesignerStatus }>`
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid ${({$status}) => getDesignerStatusMeta($status).border};
    background: ${({$status}) => getDesignerStatusMeta($status).tint};
    color: ${({$status}) => getDesignerStatusMeta($status).accent};
    font-size: 10px;
    font-weight: 700;

    @media (max-width: 480px) {
        height: 20px;
        padding: 0 6px;
        font-size: 9px;
    }
`;

const StyledScheduleList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    border-radius: 8px;
    background: rgba(248, 250, 252, 0.6);
`;

const StyledScheduleCollapsedNotice = styled.div<{ $status: DesignerStatus }>`
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px dashed ${({$status}) => getDesignerStatusMeta($status).border};
    color: ${({$status}) => getDesignerStatusMeta($status).accent};
    background: var(--white-color-60);
    font-size: 12px;
    line-height: 1.5;

    @media (max-width: 640px) {
        padding: 8px 10px;
        font-size: 11px;
    }
`;

const StyledScheduleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    overflow: hidden;
    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

const StyledDayLabel = styled.span`
    flex-shrink: 0;
    width: 20px;
    padding: 2px 0;
    border-radius: 4px;
    background: rgba(248, 250, 252, 0.92);
    color: var(--dark-gray-color);
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
`;

const StyledDaySwitch = styled.label`
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
    white-space: nowrap;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledTimeRange = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    @media (max-width: 640px) {
        width: 100%;
    }
`;

const StyledTimeRangeDivider = styled.span`
    flex-shrink: 0;
`;

const StyledTimeInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    height: 28px;
    padding: 0 4px;
    border-radius: 6px;
    font-size: 11px;
`;

const StyledAddForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 12px;
    border: 1px dashed var(--light-gray-color);
    border-radius: 10px;
    background: rgba(248, 250, 252, 0.6);
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
    justify-content: flex-end;
`;
