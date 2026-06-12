import styled from 'styled-components';

import {StyledEditBtn as StyledEditBtnBase, actionButtonStyle} from './settings-styles';
import {StyledDetail, StyledOverlay} from '../calendar/overlays/ModalStyles';
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

export const StyledServiceBody = styled.div`
`;

export const StyledGroup = styled.div<{ $isCategoryDragging: boolean; $isCategoryDragOver: boolean }>`
    position: relative;
    opacity: ${(p) => p.$isCategoryDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isCategoryDragOver ? 'rgba(36, 117, 58, 0.06)' : 'transparent'};
    border-radius: 4px;
    box-shadow: ${(p) => p.$isCategoryDragOver ? '0 8px 20px rgba(36, 117, 58, 0.12)' : 'none'};
    transition: background-color 0.16s ease, box-shadow 0.16s ease;

    &::before {
        content: ${(p) => p.$isCategoryDragOver ? "'여기로 이동'" : "''"};
        position: absolute;
        top: -10px;
        right: 12px;
        z-index: 4;
        display: ${(p) => p.$isCategoryDragOver ? 'inline-flex' : 'none'};
        align-items: center;
        height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: var(--success-color);
        color: var(--white-color);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: -0.01em;
        box-shadow: 0 8px 18px rgba(36, 117, 58, 0.24);
    }

    &::after {
        content: '';
        position: absolute;
        left: 12px;
        right: 12px;
        top: -2px;
        height: 4px;
        border-radius: 999px;
        background: ${(p) => p.$isCategoryDragOver ? 'var(--success-color)' : 'transparent'};
        box-shadow: ${(p) => p.$isCategoryDragOver ? '0 0 0 3px rgba(36, 117, 58, 0.14)' : 'none'};
    }

    & + & {
        margin-top: 4px;
    }
`;

export const StyledCategoryToggle = styled.details``;

export const StyledCategoryHeader = styled.summary`
    list-style: none;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color);
    padding: 6px 0;
    position: sticky;
    top: 0;
    z-index: 2;
    cursor: pointer;
    backdrop-filter: blur(8px) saturate(180%);

    &::-webkit-details-marker {
        display: none;
    }

    &::after {
        content: '';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin-left: 8px;
        flex-shrink: 0;
        border: 1px solid var(--light-gray-color);
        border-radius: 999px;
        background: var(--white-color);
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 1.75L6.25 5L3 8.25' stroke='%23111827' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        transition: transform 0.18s ease;
        transform: rotate(270deg);
    }

    ${StyledCategoryToggle}[open] &::after {
        transform: rotate(90deg);
    }
`;

export const StyledCategoryBody = styled.div``;

export const StyledCategoryLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

export const StyledCategoryNameChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

export const StyledCategoryActions = styled.div`
    position: absolute;
    top: 6px;
    right: 0;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

export const StyledColorField = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

export const StyledCategoryEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 0 6px;
`;

export const StyledCategoryEditInput = styled.input`
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 12px;
    color: var(--dark-gray-color);
    outline: none;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }
`;

export const StyledCategoryDragHandle = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
    cursor: grab;
    user-select: none;

    &:active {
        cursor: grabbing;
    }

    svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
    }
`;

export const StyledCategoryColorInput = styled.input`
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--light-gray-color);
    border-radius: 4px;
    background: none;
`;

export const StyledItem = styled.div<{ $isDragging: boolean; $isDragOver: boolean }>`
    position: relative;
    border-bottom: 1px solid var(--light-gray-color);
    opacity: ${(p) => p.$isDragging ? 0.5 : 1};
    background-color: ${(p) => p.$isDragOver ? 'var(--gray-color2)' : 'transparent'};
    box-shadow: ${(p) => p.$isDragOver ? 'inset 0 2px 0 var(--dark-gray-color)' : 'none'};
    transition: background-color 0.16s ease, box-shadow 0.16s ease;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }

    &::before {
        content: ${(p) => p.$isDragOver ? "'이 위치로 이동'" : "''"};
        position: absolute;
        top: 6px;
        right: 16px;
        display: ${(p) => p.$isDragOver ? 'inline-flex' : 'none'};
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--dark-gray-color);
        color: var(--white-color);
        font-size: 10px;
        font-weight: 700;
    }
`;

export const StyledViewRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 0;
    font-size: 13px;
`;

export const StyledServiceContent = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;

    @media (max-width: 640px) {
        flex-wrap: wrap;
    }
`;

export const StyledDragHandle = styled.span`
    flex-shrink: 0;
    color: var(--dark-gray-color2);
    font-size: 12px;
    cursor: grab;
    user-select: none;
`;

export const StyledNameChip = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    width: fit-content;
    max-width: 100%;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: ${(p) => p.$color};
    background-color: ${(p) => `${p.$color}18`};
`;

export const StyledServiceLeft = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

export const StyledDuration = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

export const StyledPrice = styled.span`
    flex-shrink: 0;
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        margin-left: 0;
    }
`;

export const StyledEditBtn = styled(StyledEditBtnBase)`
    background-color: var(--white-color);
`;

export const StyledAddButton = styled.button`
    width: 100%;
    ${actionButtonStyle};
    border: 1px dashed var(--light-gray-color);
    background: none;
    font-size: 13px;
    color: var(--dark-gray-color);

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            border-color: var(--blue-color);
            color: var(--blue-color);
        }
    }
`;

export const StyledDeleteMsg = styled.p`
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.6;
    strong { font-weight: 700; }
`;

