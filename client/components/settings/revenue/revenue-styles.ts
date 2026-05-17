import styled, {css} from 'styled-components';

import {formControlStyle} from '../../ui/FormControls';
import {Dot} from '../../ui/Dot';
import {ServiceChipList, StyledServiceText, StyledServiceToken} from '../../ui/ServiceChip';

/* ── Shared action / filter button styles ── */

export const actionButtonStyle = css`
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
`;

/* ── Form / input helpers ── */

export const StyledDateInput = styled.input`
    width: 100%;
    min-width: 0;
    ${formControlStyle};
    padding: 0 8px;
`;

/* ── List / row ── */

export const StyledList = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--list-gap);
`;

export const StyledClickableRow = styled.div<{ $accentColor?: string; $showAccentBar?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: var(--card-gap);
    padding: var(--card-padding);
    font-size: 13px;
    border: 1px solid ${(props) => props.$accentColor ? `${props.$accentColor}44` : 'rgba(148, 163, 184, 0.18)'};
    border-radius: var(--card-radius);
    border-left-width: ${(props) => props.$showAccentBar ? '4px' : '1px'};
    border-left-color: ${(props) => props.$showAccentBar ? (props.$accentColor || 'rgba(148, 163, 184, 0.42)') : undefined};
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, ${(props) => props.$accentColor ? `${props.$accentColor}10` : 'rgba(248, 250, 252, 0.96)'} 100%);
    box-shadow: var(--card-shadow);
    cursor: pointer;
    transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: ${(props) => props.$accentColor ? `${props.$accentColor}66` : 'rgba(66, 133, 244, 0.28)'};
            box-shadow: var(--card-shadow-hover);
            background-color: ${(props) => props.$accentColor ? `${props.$accentColor}14` : 'rgba(248, 250, 252, 0.98)'};
        }
    }

    @media (max-width: 640px) {
        flex-wrap: wrap;
        gap: var(--gap-lg);
        padding: 10px;
    }
`;

export const StyledPrice = styled.span`
    flex-shrink: 0;
    margin-left: auto;
    align-self: center;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;

    @media (max-width: 640px) {
        margin-left: 0;
        width: 100%;
        text-align: right;
    }
`;

export const StyledRevenueRowBody = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const StyledRevenueRowHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

export const StyledRevenueMetaList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const StyledRevenueMetaItem = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

export const StyledRevenueMetaLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 1;
    min-width: 0;
    color: var(--dark-gray-color2);
    padding: var(--chip-padding);
    border-radius: var(--chip-radius);
    background: rgba(241, 245, 249, 0.92);
`;

export const StyledColorSwatch = styled(Dot).attrs<{ $color: string }>((props) => ({
    color: props.$color,
    size: 10,
}))<{ $color: string }>`
    flex-shrink: 0;
`;

export const StyledCustomerName = styled.span`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    padding: var(--chip-padding);
    border-radius: var(--chip-radius);
    background: rgba(248, 250, 252, 0.92);
`;

export const StyledInlineCustomerButton = styled.button`
    min-width: 0;
    max-width: 100%;
    border: 0;
    padding: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    line-height: 1.35;
    word-break: keep-all;
    font-weight: 700;
    color: #0f172a;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            color: var(--blue-color);
        }
    }
`;

export const StyledRevenueServiceName = styled(ServiceChipList)`
    line-height: 1.5;
`;

export const StyledRevenueServiceChip = styled(StyledServiceToken)``;

export const StyledRevenueServiceText = styled(StyledServiceText).attrs({as: 'strong'})`
    min-width: 0;
    border-radius: var(--chip-radius);
    line-height: 1.35;
    word-break: keep-all;
`;

export const StyledRevenueEmpty = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 54px 24px;
    border: 1px dashed rgba(148, 163, 184, 0.32);
    border-radius: 10px;
    background: rgba(248, 250, 252, 0.78);
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

export const StyledSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 140px;
    padding: 10px 14px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: var(--info-grid-cell-radius);
    background: rgba(248, 250, 252, 0.88);
    font-size: 13px;
    color: var(--dark-gray-color2);

    strong {
        font-size: 16px;
        color: var(--blue-color);
    }
`;

/* ── Customer info grid (metric modal) ── */

export const StyledCustomerInfoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
    width: 100%;

    span {
        display: flex;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(248, 250, 252, 0.92);
        font-size: 12px;
        color: var(--dark-gray-color);
    }

    strong {
        color: var(--dark-gray-color2);
        font-weight: 600;
    }

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;
