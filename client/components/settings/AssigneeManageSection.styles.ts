import styled, {css} from 'styled-components';

import type {AssigneeStatus} from '../../utils/assignees';
import {getAssigneeStatusMeta} from '../../utils/assignees';
import {LabelBadge} from '../ui/LabelBadge';
import {formControlStyle, StyledFieldSelect} from '../ui/FormControls';
import {StyledCancelBtn, StyledEmpty, StyledSaveBtn} from './settings-styles';
const ASSIGNEE_STATUS_TONE: Record<AssigneeStatus, 'success' | 'warning' | 'neutral'> = {
    '재직': 'success',
    '휴직': 'warning',
    '퇴직': 'neutral',
};

export const compactInputStyle = css`
    ${formControlStyle};
`;

export const StyledAddInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;
`;

export const StyledAssigneeBody = styled.div`
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

export const StyledAssigneeCardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 800px) {
        grid-template-columns: 1fr;
    }
`;

export const StyledAssigneeSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const StyledAssigneeSectionTitle = styled.strong`
    font-size: var(--large-font);
    font-weight: 700;
    color: var(--dark-gray-color);
`;

// 공용 빈 상태(StyledEmpty)와 동일한 모양. 여백만 이 화면 기준으로 줄인다.
export const StyledSectionEmpty = styled(StyledEmpty)`
    padding: 24px;
`;

export const StyledAssigneeCard = styled.div<{ $status: AssigneeStatus; $assigneeColor: string; $isEditing: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid ${({$assigneeColor}) => `${$assigneeColor}44`};
    border-left: 4px solid ${({$assigneeColor}) => $assigneeColor};
    border-radius: 10px;
    padding: 8px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, ${({$assigneeColor}) => `${$assigneeColor}10`} 100%);
    box-shadow: ${({$isEditing}) => $isEditing
            ? '0 0 0 2px var(--blue-color), var(--card-shadow)'
            : 'var(--card-shadow)'};
    transition: box-shadow 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: ${({$assigneeColor}) => `${$assigneeColor}66`};
            box-shadow: ${({$isEditing}) => $isEditing
                    ? '0 0 0 2px var(--blue-color), var(--card-shadow-hover)'
                    : 'var(--card-shadow-hover)'};
            background-color: ${({$assigneeColor}) => `${$assigneeColor}14`};
        }
    }
    
    @media (max-width: 640px) {
        padding: 10px 10px 10px 12px;
        gap: 8px;
    }
`;

export const StyledAssigneeHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    @media (max-width: 640px) {
        gap: 6px;
    }
`;

export const StyledAssigneeHeaderLeft = styled.div`
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

export const StyledAssigneeName = styled.span`
    font-size: var(--large-font);
    font-weight: 700;
    color: var(--dark-gray-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const StyledAssigneeHeaderActions = styled.div`
    display: flex;
    flex-shrink: 0;
    gap: 6px;
`;

export const StyledAssigneeMetaGrid = styled.div`
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

export const StyledAssigneeMetaField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

export const StyledAssigneeMetaLabel = styled.label`
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;

export const StyledAssigneeColorInput = styled.input`
    width: 32px;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
`;

export const StyledAssigneeNameInput = styled.input`
    flex: 1;
    min-width: 80px;
    max-width: 200px;
    ${compactInputStyle};
    min-height: 30px;
    padding: 0 8px;
    font-size: var(--font);
    font-weight: 700;

    @media (max-width: 640px) {
        min-width: 0;
        max-width: none;
        width: 100%;
        font-size: var(--medium-font);
    }
`;

export const StyledAssigneeMetaInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;

    &:focus {
        box-shadow: 0 0 0 3px rgba(101, 38, 217, 0.12);
    }
`;

export const StyledAssigneeStatusSelect = styled(StyledFieldSelect)`
    flex-shrink: 0;
    min-height: 28px;
    padding: 0 28px 0 8px;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;

export const StyledAssigneeStatusBadge = styled(LabelBadge).attrs<{ $status: AssigneeStatus }>((props) => ({
    $tone: ASSIGNEE_STATUS_TONE[props.$status],
    $shape: 'pill' as const,
    $size: 'sm' as const,
}))<{ $status: AssigneeStatus }>`
    height: 24px;
    padding: 0 8px;
    font-size: var(--tiny-font);

    @media (max-width: 480px) {
        height: 20px;
        padding: 0 6px;
        font-size: var(--tiny-font);
    }
`;

export const StyledScheduleList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    border-radius: 8px;
    background: var(--bg-subtle);
`;

export const StyledScheduleCollapsedNotice = styled.div<{ $status: AssigneeStatus }>`
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px dashed ${({$status}) => getAssigneeStatusMeta($status).border};
    color: ${({$status}) => getAssigneeStatusMeta($status).accent};
    background: var(--white-color-60);
    font-size: var(--small-font);
    line-height: 1.5;

    @media (max-width: 640px) {
        padding: 8px 10px;
        font-size: var(--xsmall-font);
    }
`;

export const StyledScheduleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--small-font);
    overflow: hidden;
    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

export const StyledDayLabel = styled.span`
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

export const StyledDaySwitch = styled.label`
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
    white-space: nowrap;
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
`;

export const StyledTimeRange = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    @media (max-width: 640px) {
        width: 100%;
    }
`;

export const StyledTimeRangeDivider = styled.span`
    flex-shrink: 0;
`;

export const StyledTimeInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    height: 28px;
    padding: 0 4px;
    border-radius: 6px;
    font-size: var(--xsmall-font);
`;

export const StyledAddForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 12px;
    border: 1px dashed var(--light-gray-color);
    border-radius: 10px;
    background: var(--bg-subtle);
`;

export const StyledAddFormGrid = styled.div`
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

export const StyledAddFormActions = styled.div`
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

export const StyledAssigneeFooterActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
`;

