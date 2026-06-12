import styled, {css} from 'styled-components';

import type {DesignerStatus} from '../../utils/designers';
import {getDesignerStatusMeta} from '../../utils/designers';
import {LabelBadge} from '../ui/LabelBadge';
import {formControlStyle} from '../ui/FormControls';
import {StyledCancelBtn, StyledSaveBtn} from './settings-styles';
const DESIGNER_STATUS_TONE: Record<DesignerStatus, 'success' | 'warning' | 'neutral'> = {
    '재직': 'success',
    '휴직': 'warning',
    '퇴직': 'neutral',
};

export const StyledConfirmBody = styled.div`
    padding: 16px 20px;
`;

export const compactInputStyle = css`
    ${formControlStyle};
`;

export const StyledAddInput = styled.input`
    width: 100%;
    min-width: 0;
    ${compactInputStyle};
    padding: 0 8px;
`;

export const StyledDesignerBody = styled.div`
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

export const StyledDesignerCardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 800px) {
        grid-template-columns: 1fr;
    }
`;

export const StyledDesignerSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const StyledDesignerSectionTitle = styled.strong`
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

export const StyledSectionEmpty = styled.div`
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

export const StyledDesignerCard = styled.div<{ $status: DesignerStatus; $designerColor: string; $isEditing: boolean }>`
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

export const StyledDesignerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    @media (max-width: 640px) {
        gap: 6px;
    }
`;

export const StyledDesignerHeaderLeft = styled.div`
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

export const StyledDesignerName = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: var(--dark-gray-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const StyledDesignerHeaderActions = styled.div`
    display: flex;
    flex-shrink: 0;
    gap: 6px;
`;

export const StyledDesignerMetaGrid = styled.div`
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

export const StyledDesignerNameInput = styled.input`
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

export const StyledDesignerStatusBadge = styled(LabelBadge).attrs<{ $status: DesignerStatus }>((props) => ({
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

export const StyledScheduleList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    border-radius: 8px;
    background: var(--bg-subtle);
`;

export const StyledScheduleCollapsedNotice = styled.div<{ $status: DesignerStatus }>`
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

export const StyledScheduleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
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
    font-size: 11px;
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
    font-size: 11px;
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

export const StyledDesignerFooterActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
`;

