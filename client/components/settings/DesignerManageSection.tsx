import {useState} from 'react';

import styled, {css} from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {Designer, DesignerStatus} from '../../utils/designers';
import {WEEKDAY_LABELS, getDesignerColor, getDesignerStatus, splitDesignersByStatus} from '../../utils/designers';
import {formControlStyle} from '../ui/FormControls';

const DESIGNER_STATUS_OPTIONS: DesignerStatus[] = ['재직', '휴직', '퇴직'];

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
}: DesignerCardProps) => (
    <StyledDesignerCard>
        <StyledDesignerHeader>
            <StyledDesignerNameInput
                value={designer.name}
                disabled={!isEditing}
                onChange={(e) => onUpdateDesigner(designer.id, {name: e.target.value})}
                placeholder="디자이너명"
            />
            <StyledDesignerStatusSelect
                value={getDesignerStatus(designer)}
                aria-label={`${designer.name} 상태`}
                disabled={!isEditing}
                onChange={(e) => {
                    const nextStatus = e.target.value as DesignerStatus;
                    const currentStatus = getDesignerStatus(designer);

                    if (nextStatus === currentStatus) return;
                    if (nextStatus === '퇴직' && !confirm(`"${designer.name}" 디자이너를 퇴직 처리하시겠습니까?`)) {
                        e.target.value = currentStatus;
                        return;
                    }

                    onUpdateDesigner(designer.id, {status: nextStatus});
                }}
            >
                {DESIGNER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </StyledDesignerStatusSelect>
            <StyledDesignerHeaderActions>
                {isEditing ? (
                    <>
                        <StyledDeleteBtn type="button" onClick={() => onDeleteDesigner(designer)}>삭제</StyledDeleteBtn>
                        <StyledCancelBtn type="button" onClick={onFinishEdit}>완료</StyledCancelBtn>
                    </>
                ) : (
                    <StyledEditBtn type="button" onClick={() => onStartEdit(designer.id)}>수정</StyledEditBtn>
                )}
            </StyledDesignerHeaderActions>
        </StyledDesignerHeader>
        <StyledDesignerMetaGrid>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel>연락처</StyledDesignerMetaLabel>
                <StyledDesignerMetaInput
                    value={designer.phone ?? ''}
                    disabled={!isEditing}
                    aria-label={`${designer.name} 연락처`}
                    onChange={(e) => onUpdateDesigner(designer.id, {phone: e.target.value})}
                    placeholder="010-0000-0000"
                />
            </StyledDesignerMetaField>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel>메모</StyledDesignerMetaLabel>
                <StyledDesignerMetaInput
                    value={designer.note ?? ''}
                    disabled={!isEditing}
                    aria-label={`${designer.name} 메모`}
                    onChange={(e) => onUpdateDesigner(designer.id, {note: e.target.value})}
                    placeholder="특이사항 메모"
                />
            </StyledDesignerMetaField>
            <StyledDesignerMetaField>
                <StyledDesignerMetaLabel>컬러</StyledDesignerMetaLabel>
                <StyledDesignerColorInput
                    type="color"
                    value={getDesignerColor(designer)}
                    disabled={!isEditing}
                    aria-label={`${designer.name} 컬러`}
                    onChange={(e) => onUpdateDesigner(designer.id, {color: e.target.value})}
                />
            </StyledDesignerMetaField>
        </StyledDesignerMetaGrid>
        <StyledScheduleList>
            {WEEKDAY_LABELS.map((label, dayIndex) => {
                const day = designer.schedule[dayIndex];
                if (!day) return null;

                return (
                    <StyledScheduleRow key={`${designer.id}-${label}`}>
                        <StyledDayLabel>{label}</StyledDayLabel>
                        <StyledDaySwitch>
                            <input
                                type="checkbox"
                                checked={day.enabled}
                                aria-label={`${designer.name} ${label} 근무 여부`}
                                disabled={!isEditing}
                                onChange={(e) => onUpdateDesignerDay(designer.id, dayIndex, {enabled: e.target.checked})}
                            />
                            <span>{day.enabled ? '근무' : '휴무'}</span>
                        </StyledDaySwitch>
                        <StyledTimeRange>
                            <StyledTimeInput
                                type="time"
                                value={day.start}
                                aria-label={`${designer.name} ${label} 시작 시간`}
                                disabled={!isEditing || !day.enabled}
                                onChange={(e) => onUpdateDesignerDay(designer.id, dayIndex, {start: e.target.value})}
                            />
                            <StyledTimeRangeDivider>~</StyledTimeRangeDivider>
                            <StyledTimeInput
                                type="time"
                                value={day.end}
                                aria-label={`${designer.name} ${label} 종료 시간`}
                                disabled={!isEditing || !day.enabled}
                                onChange={(e) => onUpdateDesignerDay(designer.id, dayIndex, {end: e.target.value})}
                            />
                        </StyledTimeRange>
                    </StyledScheduleRow>
                );
            })}
        </StyledScheduleList>
    </StyledDesignerCard>
);

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
}: DesignerSectionProps) => {
    if (designers.length === 0) return null;

    return (
        <StyledDesignerSection>
            <StyledDesignerSectionTitle>{title}</StyledDesignerSectionTitle>
            {designers.map((designer) => (
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
        </StyledDesignerSection>
    );
};

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

    const handleDeleteDesigner = (designer: Designer) => {
        if (!confirm(`"${designer.name}" 디자이너를 퇴직 처리하시겠습니까?`)) return;
        updateDesigner(designer.id, {status: '퇴직'});
        setEditingDesignerId(null);
    };

    return (
        <>
            <StyledDesignerBody>
                {designers.length === 0 && <StyledEmpty>디자이너 없음</StyledEmpty>}
                <DesignerSection
                    title="재직자"
                    designers={activeDesigners}
                    editingDesignerId={editingDesignerId}
                    onUpdateDesigner={updateDesigner}
                    onUpdateDesignerDay={updateDesignerDay}
                    onStartEdit={setEditingDesignerId}
                    onFinishEdit={() => setEditingDesignerId(null)}
                    onDeleteDesigner={handleDeleteDesigner}
                />
                <DesignerSection
                    title="휴직자"
                    designers={onLeaveDesigners}
                    editingDesignerId={editingDesignerId}
                    onUpdateDesigner={updateDesigner}
                    onUpdateDesignerDay={updateDesignerDay}
                    onStartEdit={setEditingDesignerId}
                    onFinishEdit={() => setEditingDesignerId(null)}
                    onDeleteDesigner={handleDeleteDesigner}
                />
                <DesignerSection
                    title="퇴직자"
                    designers={resignedDesigners}
                    editingDesignerId={editingDesignerId}
                    onUpdateDesigner={updateDesigner}
                    onUpdateDesignerDay={updateDesignerDay}
                    onStartEdit={setEditingDesignerId}
                    onFinishEdit={() => setEditingDesignerId(null)}
                    onDeleteDesigner={handleDeleteDesigner}
                />
            </StyledDesignerBody>
            <StyledServiceFooter>
                <StyledDesignerFooterActions>
                    {isAddingDesigner ? (
                        <>
                            <StyledDesignerAddRow>
                                <StyledAddInput
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="새 디자이너명"
                                />
                                <StyledDesignerStatusSelect
                                    value={newStatus}
                                    aria-label="새 디자이너 상태"
                                    onChange={(e) => setNewStatus(e.target.value as DesignerStatus)}
                                >
                                    {DESIGNER_STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </StyledDesignerStatusSelect>
                                <StyledAddInput
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    placeholder="연락처"
                                    aria-label="새 디자이너 연락처"
                                />
                                <StyledDesignerColorInput
                                    type="color"
                                    value={newColor}
                                    aria-label="새 디자이너 컬러"
                                    onChange={(e) => setNewColor(e.target.value)}
                                />
                                <StyledSaveBtn type="button" onClick={handleAdd}>추가</StyledSaveBtn>
                            </StyledDesignerAddRow>
                            <StyledDesignerMetaInput
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="메모"
                                aria-label="새 디자이너 메모"
                            />
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
                        </>
                    ) : (
                        <StyledEditBtn type="button" onClick={() => setIsAddingDesigner(true)}>디자이너 추가</StyledEditBtn>
                    )}
                </StyledDesignerFooterActions>
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

    &:hover {
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
    }
`;

const mobileStretchButtonStyle = css`
    @media (max-width: 640px) {
        flex: 1;
    }
`;

const StyledEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-size: 13px;
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

const StyledAddInput = styled.input`
    flex: 1;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 6px;
`;

const StyledDesignerBody = styled.div`
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledDesignerSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledDesignerSectionTitle = styled.strong`
    padding: 0 2px;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledDesignerCard = styled.div`
    border: 1px solid var(--light-gray-color);
    border-radius: 6px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledDesignerHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    @media (max-width: 640px) {
        align-items: stretch;
    }
`;

const StyledDesignerHeaderActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-left: auto;

    @media (max-width: 640px) {
        margin-left: 0;
    }
`;

const StyledDesignerMetaGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 180px) minmax(0, 1fr) 96px;
    gap: 8px;
    margin-bottom: 10px;

    @media (max-width: 760px) {
        grid-template-columns: 1fr;
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
    width: 100%;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    cursor: pointer;
`;

const StyledDesignerNameInput = styled.input`
    flex: 1;
    ${compactInputStyle};
    min-height: 30px;
    padding: 0 8px;
    font-size: 13px;

    @media (max-width: 640px) {
        width: auto;
        max-width: 100%;
    }
`;

const StyledDesignerMetaInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;
`;

const StyledDesignerStatusSelect = styled.select`
    flex-shrink: 0;
    ${compactInputStyle};
    min-height: 28px;
    padding: 0 8px;
    font-size: 11px;
    color: var(--dark-gray-color2);

    @media (max-width: 640px) {
        width: auto;
        max-width: 100%;
    }
`;

const StyledScheduleList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledScheduleRow = styled.div`
    display: grid;
    grid-template-columns: 28px 70px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    font-size: 12px;

    @media (max-width: 640px) {
        grid-template-columns: 28px 1fr;
        gap: 8px;
    }
`;

const StyledDayLabel = styled.span`
    color: var(--dark-gray-color);
    font-weight: 600;
`;

const StyledDaySwitch = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--dark-gray-color2);

    @media (max-width: 640px) {
        justify-content: flex-start;
    }
`;

const StyledTimeRange = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    @media (max-width: 640px) {
        grid-column: 2;
    }
`;

const StyledTimeRangeDivider = styled.span`
    flex-shrink: 0;
`;

const StyledTimeInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 6px;
    border-radius: 4px;
`;

const StyledDesignerAddRow = styled.div`
    display: flex;
    gap: 6px;

    @media (max-width: 640px) {
        flex-wrap: wrap;
        align-items: flex-start;
    }

    > * {
        max-width: 100%;
    }
`;

const StyledDesignerFooterActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;

    ${StyledEditBtn},
    ${StyledCancelBtn} {
        max-width: 100%;
    }

    @media (max-width: 640px) {
        justify-content: flex-start;
    }
`;
