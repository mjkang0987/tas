import {useState} from 'react';

import {useCalendarStore} from '../../store/calendarStore';
import {PageHero} from '../ui/PageHero';
import {ConfirmDialog} from '../ui/ConfirmDialog';
import type {Assignee, AssigneeStatus} from '../../utils/assignees';
import {WEEKDAY_LABELS, getAssigneeColor, getAssigneeStatus, getAssigneeStatusMeta, splitAssigneesByStatus, sortAssignees} from '../../utils/assignees';
import {Dot} from '../ui/Dot';
import {LabelBadge} from '../ui/LabelBadge';
import {formControlStyle} from '../ui/FormControls';
import {useStoreLabels} from '../../hooks/useStoreLabels';
import {StyledEditBtn, StyledDeleteBtn, StyledSaveBtn, StyledCancelBtn, StyledEmpty, StyledServiceFooter} from './settings-styles';
import {
    compactInputStyle,
    StyledAddInput,
    StyledAssigneeBody,
    StyledAssigneeCardGrid,
    StyledAssigneeSection,
    StyledAssigneeSectionTitle,
    StyledSectionEmpty,
    StyledAssigneeCard,
    StyledAssigneeHeader,
    StyledAssigneeHeaderLeft,
    StyledAssigneeName,
    StyledAssigneeHeaderActions,
    StyledAssigneeMetaGrid,
    StyledAssigneeMetaField,
    StyledAssigneeMetaLabel,
    StyledAssigneeColorInput,
    StyledAssigneeNameInput,
    StyledAssigneeMetaInput,
    StyledAssigneeStatusSelect,
    StyledAssigneeStatusBadge,
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
    StyledAssigneeFooterActions,
} from './AssigneeManageSection.styles';

const ASSIGNEE_STATUS_OPTIONS: AssigneeStatus[] = ['재직', '휴직', '퇴직'];

interface AssigneeCardProps {
    assignee: Assignee;
    isEditing: boolean;
    onUpdateAssignee: (assigneeId: number, patch: Partial<Pick<Assignee, 'name' | 'nameI18n' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    onUpdateAssigneeDay: (assigneeId: number, dayIndex: number, patch: {enabled?: boolean; start?: string; end?: string}) => void;
    onStartEdit: (assigneeId: number) => void;
    onFinishEdit: () => void;
    onDeleteAssignee: (assignee: Assignee) => void;
    onPermanentDelete?: (assignee: Assignee) => void;
}

const AssigneeCard = ({
    assignee,
    isEditing,
    onUpdateAssignee,
    onUpdateAssigneeDay,
    onStartEdit,
    onFinishEdit,
    onDeleteAssignee,
    onPermanentDelete,
}: AssigneeCardProps) => {
    const did = assignee.id;
    // 언어별 이름 변경 → nameI18n 객체 갱신(빈 값 제거, 전부 비면 null). 식별은 id, 표시만 번역.
    const setNameI18n = (code: 'en' | 'ja' | 'zh', value: string) => {
        const next = {...(assignee.nameI18n ?? {})};
        if (value.trim()) next[code] = value; else delete next[code];
        onUpdateAssignee(did, {nameI18n: Object.keys(next).length > 0 ? next : null});
    };
    return (
    <StyledAssigneeCard $status={getAssigneeStatus(assignee)} $assigneeColor={getAssigneeColor(assignee)} $isEditing={isEditing}>
        <StyledAssigneeHeader>
            <StyledAssigneeHeaderLeft>
                <Dot color={getAssigneeColor(assignee)} size={10} />
                {isEditing ? (
                    <StyledAssigneeNameInput
                        id={`assignee-${did}-name`}
                        value={assignee.name}
                        onChange={(e) => onUpdateAssignee(did, {name: e.target.value})}
                        placeholder="담당자명"
                        aria-label="담당자명"
                    />
                ) : (
                    <StyledAssigneeName>{assignee.name}</StyledAssigneeName>
                )}
                {isEditing ? (
                    <StyledAssigneeStatusSelect
                        id={`assignee-${did}-status`}
                        value={getAssigneeStatus(assignee)}
                        aria-label={`${assignee.name} 상태`}
                        onChange={(e) => {
                            const nextStatus = e.target.value as AssigneeStatus;
                            const currentStatus = getAssigneeStatus(assignee);

                            if (nextStatus === currentStatus) return;
                            if (nextStatus === '퇴직') {
                                e.target.value = currentStatus;
                                onDeleteAssignee(assignee);
                                return;
                            }

                            onUpdateAssignee(did, {status: nextStatus});
                        }}
                    >
                        {ASSIGNEE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </StyledAssigneeStatusSelect>
                ) : (
                    <StyledAssigneeStatusBadge $status={getAssigneeStatus(assignee)}>
                        {getAssigneeStatus(assignee)}
                    </StyledAssigneeStatusBadge>
                )}
            </StyledAssigneeHeaderLeft>
            <StyledAssigneeHeaderActions>
                {isEditing ? (
                    <>
                        <StyledDeleteBtn type="button" onClick={() => onDeleteAssignee(assignee)}>삭제</StyledDeleteBtn>
                        <StyledCancelBtn type="button" onClick={onFinishEdit}>완료</StyledCancelBtn>
                    </>
                ) : (
                    <StyledEditBtn type="button" onClick={() => onStartEdit(did)}>수정</StyledEditBtn>
                )}
                {onPermanentDelete && (
                    <StyledDeleteBtn type="button" onClick={() => onPermanentDelete(assignee)}>영구 삭제</StyledDeleteBtn>
                )}
            </StyledAssigneeHeaderActions>
        </StyledAssigneeHeader>
        <StyledAssigneeMetaGrid>
            <StyledAssigneeMetaField>
                <StyledAssigneeMetaLabel htmlFor={`assignee-${did}-phone`}>연락처</StyledAssigneeMetaLabel>
                <StyledAssigneeMetaInput
                    id={`assignee-${did}-phone`}
                    value={assignee.phone ?? ''}
                    disabled={!isEditing}
                    onChange={(e) => onUpdateAssignee(did, {phone: e.target.value})}
                    placeholder="010-0000-0000"
                />
            </StyledAssigneeMetaField>
            <StyledAssigneeMetaField>
                <StyledAssigneeMetaLabel htmlFor={`assignee-${did}-note`}>메모</StyledAssigneeMetaLabel>
                <StyledAssigneeMetaInput
                    id={`assignee-${did}-note`}
                    value={assignee.note ?? ''}
                    disabled={!isEditing}
                    onChange={(e) => onUpdateAssignee(did, {note: e.target.value})}
                    placeholder="특이사항 메모"
                />
            </StyledAssigneeMetaField>
            <StyledAssigneeMetaField>
                <StyledAssigneeMetaLabel htmlFor={`assignee-${did}-color`}>컬러</StyledAssigneeMetaLabel>
                <StyledAssigneeColorInput
                    id={`assignee-${did}-color`}
                    type="color"
                    value={getAssigneeColor(assignee)}
                    disabled={!isEditing}
                    onChange={(e) => onUpdateAssignee(did, {color: e.target.value})}
                />
            </StyledAssigneeMetaField>
            {/* 공개 예약 페이지 다국어 이름(선택). 비우면 위 담당자명이 그대로 표시. */}
            {([['en', 'English'], ['ja', '日本語'], ['zh', '中文']] as const).map(([code, label]) => (
                <StyledAssigneeMetaField key={code}>
                    <StyledAssigneeMetaLabel htmlFor={`assignee-${did}-name-${code}`}>{label}</StyledAssigneeMetaLabel>
                    <StyledAssigneeMetaInput
                        id={`assignee-${did}-name-${code}`}
                        value={assignee.nameI18n?.[code] ?? ''}
                        disabled={!isEditing}
                        onChange={(e) => setNameI18n(code, e.target.value)}
                        placeholder={label}
                    />
                </StyledAssigneeMetaField>
            ))}
        </StyledAssigneeMetaGrid>
        {getAssigneeStatus(assignee) === '재직' ? (
            <StyledScheduleList>
                {WEEKDAY_LABELS.map((label, dayIndex) => {
                    const day = assignee.schedule[dayIndex];
                    if (!day) return null;
                    const dayId = `assignee-${did}-day-${dayIndex}`;

                    return (
                        <StyledScheduleRow key={dayId}>
                            <StyledDayLabel>{label}</StyledDayLabel>
                            <StyledDaySwitch htmlFor={`${dayId}-enabled`}>
                                <input
                                    id={`${dayId}-enabled`}
                                    type="checkbox"
                                    checked={day.enabled}
                                    disabled={!isEditing}
                                    onChange={(e) => onUpdateAssigneeDay(did, dayIndex, {enabled: e.target.checked})}
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
                                    onChange={(e) => onUpdateAssigneeDay(did, dayIndex, {start: e.target.value})}
                                />
                                <StyledTimeRangeDivider>~</StyledTimeRangeDivider>
                                <StyledTimeInput
                                    id={`${dayId}-end`}
                                    type="time"
                                    value={day.end}
                                    aria-label={`${label} 종료`}
                                    disabled={!isEditing || !day.enabled}
                                    onChange={(e) => onUpdateAssigneeDay(did, dayIndex, {end: e.target.value})}
                                />
                            </StyledTimeRange>
                        </StyledScheduleRow>
                    );
                })}
            </StyledScheduleList>
        ) : (
            <StyledScheduleCollapsedNotice $status={getAssigneeStatus(assignee)}>
                {getAssigneeStatus(assignee) === '휴직'
                    ? '휴직 상태에서는 근무시간 설정을 접어 둡니다. 복귀 후 다시 조정할 수 있습니다.'
                    : '퇴직 상태에서는 예약 선택이 비활성화되며 근무시간 설정을 표시하지 않습니다.'}
            </StyledScheduleCollapsedNotice>
        )}
    </StyledAssigneeCard>
    );
};

interface AssigneeSectionProps {
    title: string;
    assignees: Assignee[];
    editingAssigneeId: number | null;
    onUpdateAssignee: (assigneeId: number, patch: Partial<Pick<Assignee, 'name' | 'nameI18n' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    onUpdateAssigneeDay: (assigneeId: number, dayIndex: number, patch: {enabled?: boolean; start?: string; end?: string}) => void;
    onStartEdit: (assigneeId: number) => void;
    onFinishEdit: () => void;
    onDeleteAssignee: (assignee: Assignee) => void;
    onPermanentDelete?: (assignee: Assignee) => void;
}

const AssigneeSection = ({
    title,
    assignees,
    editingAssigneeId,
    onUpdateAssignee,
    onUpdateAssigneeDay,
    onStartEdit,
    onFinishEdit,
    onDeleteAssignee,
    onPermanentDelete,
}: AssigneeSectionProps) => (
    <StyledAssigneeSection>
        <StyledAssigneeSectionTitle>{title}</StyledAssigneeSectionTitle>
        {assignees.length > 0 ? (
            <StyledAssigneeCardGrid>
                {sortAssignees(assignees).map((assignee) => (
                    <AssigneeCard
                        key={assignee.id}
                        assignee={assignee}
                        isEditing={editingAssigneeId === assignee.id}
                        onUpdateAssignee={onUpdateAssignee}
                        onUpdateAssigneeDay={onUpdateAssigneeDay}
                        onStartEdit={onStartEdit}
                        onFinishEdit={onFinishEdit}
                        onDeleteAssignee={onDeleteAssignee}
                        onPermanentDelete={onPermanentDelete}
                    />
                ))}
            </StyledAssigneeCardGrid>
        ) : (
            <StyledSectionEmpty>{title} 없음</StyledSectionEmpty>
        )}
    </StyledAssigneeSection>
);

export const AssigneeManageSection = () => {
    const assignees = useCalendarStore((s) => s.assignees);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const addAssignee = useCalendarStore((s) => s.addAssignee);
    const updateAssignee = useCalendarStore((s) => s.updateAssignee);
    const updateAssigneeDay = useCalendarStore((s) => s.updateAssigneeDay);
    const deleteAssignee = useCalendarStore((s) => s.deleteAssignee);
    const labels = useStoreLabels();
    const [newName, setNewName] = useState('');
    const [newStatus, setNewStatus] = useState<AssigneeStatus>('재직');
    const [newPhone, setNewPhone] = useState('');
    const [newNote, setNewNote] = useState('');
    const [newColor, setNewColor] = useState(getAssigneeColor({id: 1}));
    const [editingAssigneeId, setEditingAssigneeId] = useState<number | null>(null);
    const [isAddingAssignee, setIsAddingAssignee] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<Assignee | null>(null);
    const [permanentTarget, setPermanentTarget] = useState<Assignee | null>(null);
    const {active: activeAssignees, onLeave: onLeaveAssignees, resigned: resignedAssignees} = splitAssigneesByStatus(assignees);

    const permanentTargetReservationCount = permanentTarget
        ? Object.values(reservationMap).reduce(
            (sum, list) => sum + list.filter((r) => r.assigneeId === permanentTarget.id).length,
            0
        )
        : 0;

    const handleAdd = () => {
        const name = newName.trim();
        if (!name) return;
        addAssignee(name, newStatus, newPhone.trim(), newNote.trim(), newColor);
        setNewName('');
        setNewStatus('재직');
        setNewPhone('');
        setNewNote('');
        setNewColor(getAssigneeColor({id: assignees.length + 2}));
        setIsAddingAssignee(false);
    };

    const handleRequestDelete = (assignee: Assignee) => {
        setConfirmTarget(assignee);
    };

    const handleConfirmDelete = () => {
        if (!confirmTarget) return;
        updateAssignee(confirmTarget.id, {status: '퇴직'});
        setEditingAssigneeId(null);
        setConfirmTarget(null);
    };

    const handleRequestPermanentDelete = (assignee: Assignee) => {
        setPermanentTarget(assignee);
    };

    const handleConfirmPermanentDelete = () => {
        if (!permanentTarget) return;
        deleteAssignee(permanentTarget.id);
        setEditingAssigneeId(null);
        setPermanentTarget(null);
    };

    return (
        <>
            <PageHero eyebrow="ASSIGNEE" title={`${labels.assignee} 관리`} subtitle={`${labels.assignee} 정보, 근무 일정, 재직 상태를 관리합니다.`} />
            <StyledAssigneeBody>
                <AssigneeSection
                    title="재직자"
                    assignees={activeAssignees}
                    editingAssigneeId={editingAssigneeId}
                    onUpdateAssignee={updateAssignee}
                    onUpdateAssigneeDay={updateAssigneeDay}
                    onStartEdit={setEditingAssigneeId}
                    onFinishEdit={() => setEditingAssigneeId(null)}
                    onDeleteAssignee={handleRequestDelete}
                />
                <AssigneeSection
                    title="휴직자"
                    assignees={onLeaveAssignees}
                    editingAssigneeId={editingAssigneeId}
                    onUpdateAssignee={updateAssignee}
                    onUpdateAssigneeDay={updateAssigneeDay}
                    onStartEdit={setEditingAssigneeId}
                    onFinishEdit={() => setEditingAssigneeId(null)}
                    onDeleteAssignee={handleRequestDelete}
                />
                <AssigneeSection
                    title="퇴직자"
                    assignees={resignedAssignees}
                    editingAssigneeId={editingAssigneeId}
                    onUpdateAssignee={updateAssignee}
                    onUpdateAssigneeDay={updateAssigneeDay}
                    onStartEdit={setEditingAssigneeId}
                    onFinishEdit={() => setEditingAssigneeId(null)}
                    onDeleteAssignee={handleRequestDelete}
                    onPermanentDelete={handleRequestPermanentDelete}
                />
            </StyledAssigneeBody>
            <StyledServiceFooter>
                <StyledAssigneeFooterActions>
                    {isAddingAssignee ? (
                        <StyledAddForm>
                            <StyledAddFormGrid>
                                <StyledAssigneeMetaField>
                                    <StyledAssigneeMetaLabel htmlFor="new-assignee-name">{labels.assignee}명</StyledAssigneeMetaLabel>
                                    <StyledAddInput
                                        id="new-assignee-name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder={`새 ${labels.assignee}명`}
                                    />
                                </StyledAssigneeMetaField>
                                <StyledAssigneeMetaField>
                                    <StyledAssigneeMetaLabel htmlFor="new-assignee-status">상태</StyledAssigneeMetaLabel>
                                    <StyledAssigneeStatusSelect
                                        id="new-assignee-status"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value as AssigneeStatus)}
                                    >
                                        {ASSIGNEE_STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </StyledAssigneeStatusSelect>
                                </StyledAssigneeMetaField>
                                <StyledAssigneeMetaField>
                                    <StyledAssigneeMetaLabel htmlFor="new-assignee-phone">연락처</StyledAssigneeMetaLabel>
                                    <StyledAddInput
                                        id="new-assignee-phone"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        placeholder="연락처"
                                    />
                                </StyledAssigneeMetaField>
                                <StyledAssigneeMetaField>
                                    <StyledAssigneeMetaLabel htmlFor="new-assignee-color">컬러</StyledAssigneeMetaLabel>
                                    <StyledAssigneeColorInput
                                        id="new-assignee-color"
                                        type="color"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                    />
                                </StyledAssigneeMetaField>
                            </StyledAddFormGrid>
                            <StyledAssigneeMetaField>
                                <StyledAssigneeMetaLabel htmlFor="new-assignee-note">메모</StyledAssigneeMetaLabel>
                                <StyledAssigneeMetaInput
                                    id="new-assignee-note"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="특이사항 메모"
                                />
                            </StyledAssigneeMetaField>
                            <StyledAddFormActions>
                                <StyledCancelBtn
                                    type="button"
                                    onClick={() => {
                                        setIsAddingAssignee(false);
                                        setNewName('');
                                        setNewStatus('재직');
                                        setNewPhone('');
                                        setNewNote('');
                                        setNewColor(getAssigneeColor({id: assignees.length + 1}));
                                    }}
                                >
                                    취소
                                </StyledCancelBtn>
                                <StyledSaveBtn type="button" onClick={handleAdd}>추가</StyledSaveBtn>
                            </StyledAddFormActions>
                        </StyledAddForm>
                    ) : (
                        <StyledEditBtn type="button" onClick={() => setIsAddingAssignee(true)}>{labels.assignee} 추가</StyledEditBtn>
                    )}
                </StyledAssigneeFooterActions>
            </StyledServiceFooter>
            {confirmTarget && (
                <ConfirmDialog
                    title="확인"
                    message={`"${confirmTarget.name}" ${labels.assignee}를 퇴직 처리하시겠습니까?`}
                    confirmVariant="danger"
                    layerKey="assignee-confirm"
                    onConfirm={handleConfirmDelete}
                    onClose={() => setConfirmTarget(null)}
                />
            )}
            {permanentTarget && (
                <ConfirmDialog
                    title="영구 삭제"
                    message={
                        `"${permanentTarget.name}" ${labels.assignee}를 영구 삭제하시겠습니까?\n`
                        + (permanentTargetReservationCount > 0
                            ? `이 ${labels.assignee}의 예약 ${permanentTargetReservationCount}건은 '미지정'으로 남고, `
                            : '')
                        + `${labels.assignee} 정보와 근무 일정은 완전히 삭제됩니다. 되돌릴 수 없습니다.`
                    }
                    confirmLabel="영구 삭제"
                    confirmVariant="danger"
                    layerKey="assignee-permanent-confirm"
                    onConfirm={handleConfirmPermanentDelete}
                    onClose={() => setPermanentTarget(null)}
                />
            )}
        </>
    );
};
