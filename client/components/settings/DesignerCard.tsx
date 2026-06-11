import styled, {css} from 'styled-components';

import type {Designer, DesignerStatus} from '../../utils/designers';
import {WEEKDAY_LABELS, getDesignerColor, getDesignerStatus, getDesignerStatusMeta, sortDesigners} from '../../utils/designers';
import {Dot} from '../ui/Dot';
import {LabelBadge} from '../ui/LabelBadge';
import {formControlStyle} from '../ui/FormControls';
import {StyledEditBtn, StyledDeleteBtn, StyledCancelBtn} from './settings-styles';

const DESIGNER_STATUS_OPTIONS: DesignerStatus[] = ['재직', '휴직', '퇴직'];

const DESIGNER_STATUS_TONE: Record<DesignerStatus, 'success' | 'warning' | 'neutral'> = {
    '재직': 'success',
    '휴직': 'warning',
    '퇴직': 'neutral',
};

export const compactInputStyle = css`
    ${formControlStyle};
`;

/* ------------------------------------------------------------------ */
/*  DesignerCard                                                       */
/* ------------------------------------------------------------------ */

interface DesignerCardProps {
    designer: Designer;
    isEditing: boolean;
    onUpdateDesigner: (designerId: number, patch: Partial<Pick<Designer, 'name' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    onUpdateDesignerDay: (designerId: number, dayIndex: number, patch: {enabled?: boolean; start?: string; end?: string}) => void;
    onStartEdit: (designerId: number) => void;
    onFinishEdit: () => void;
    onDeleteDesigner: (designer: Designer) => void;
}

export const DesignerCard = ({
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

/* ------------------------------------------------------------------ */
/*  DesignerSection                                                    */
/* ------------------------------------------------------------------ */

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

export const DesignerSection = ({
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

/* ------------------------------------------------------------------ */
/*  Shared Styled Components (also used in DesignerManageSection)      */
/* ------------------------------------------------------------------ */

export const StyledDesignerMetaField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

export const StyledDesignerMetaLabel = styled.label`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

export const StyledDesignerColorInput = styled.input`
    width: 32px;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
`;

export const StyledDesignerMetaInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;

    &:focus {
        box-shadow: 0 0 0 3px rgba(101, 38, 217, 0.12);
    }
`;

export const StyledDesignerStatusSelect = styled.select`
    flex-shrink: 0;
    ${compactInputStyle};
    min-height: 28px;
    padding: 0 8px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

/* ------------------------------------------------------------------ */
/*  Card-internal Styled Components                                    */
/* ------------------------------------------------------------------ */

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
    background: var(--bg-subtle);
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledDesignerCardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 800px) {
        grid-template-columns: 1fr;
    }
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
            ? '0 0 0 2px var(--blue-color), var(--card-shadow)'
            : 'var(--card-shadow)'};
    transition: box-shadow 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: ${({$designerColor}) => `${$designerColor}66`};
            box-shadow: ${({$isEditing}) => $isEditing
                    ? '0 0 0 2px var(--blue-color), var(--card-shadow-hover)'
                    : 'var(--card-shadow-hover)'};
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
    background: var(--neutral-bg);

    @media (max-width: 760px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
        padding: 8px;
    }
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

const StyledDesignerStatusBadge = styled(LabelBadge).attrs<{ $status: DesignerStatus }>((props) => ({
    $tone: DESIGNER_STATUS_TONE[props.$status],
    $shape: 'pill' as const,
    $size: 'sm' as const,
}))<{ $status: DesignerStatus }>`
    height: 24px;
    padding: 0 8px;
    font-size: 10px;

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
    background: var(--bg-subtle);
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
    background: var(--neutral-bg);
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
