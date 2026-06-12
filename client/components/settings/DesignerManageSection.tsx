import {useState} from 'react';
import {createPortal} from 'react-dom';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {StyledConfirmOverlay, StyledDetail, StyledHeader, StyledFooter, StyledActionButton, StyledModalMessage, useDialogAccessibility, useLayerInstanceId} from '../calendar/overlays/ModalStyles';
import type {Designer, DesignerStatus} from '../../utils/designers';
import {WEEKDAY_LABELS, getDesignerColor, getDesignerStatus, getDesignerStatusMeta, splitDesignersByStatus, sortDesigners} from '../../utils/designers';
import {Dot} from '../ui/Dot';
import {LabelBadge} from '../ui/LabelBadge';
import {formControlStyle} from '../ui/FormControls';
import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, StyledServiceFooter} from './settings-styles';
import {
    StyledConfirmBody,
    compactInputStyle,
    StyledAddInput,
    StyledDesignerBody,
    StyledDesignerCardGrid,
    StyledDesignerSection,
    StyledDesignerSectionTitle,
    StyledSectionEmpty,
    StyledDesignerCard,
    StyledDesignerHeader,
    StyledDesignerHeaderLeft,
    StyledDesignerName,
    StyledDesignerHeaderActions,
    StyledDesignerMetaGrid,
    StyledDesignerMetaField,
    StyledDesignerMetaLabel,
    StyledDesignerColorInput,
    StyledDesignerNameInput,
    StyledDesignerMetaInput,
    StyledDesignerStatusSelect,
    StyledDesignerStatusBadge,
    StyledScheduleList,
    StyledScheduleCollapsedNotice,
    StyledScheduleRow,
    StyledDayLabel,
    StyledDaySwitch,
    StyledTimeRange,
    StyledTimeRangeDivider,
    StyledTimeInput,
    StyledAddForm,
    StyledAddFormGrid,
    StyledAddFormActions,
    StyledDesignerFooterActions,
} from './DesignerManageSection.styles';

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
