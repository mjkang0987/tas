import {useEffect, useRef, useState} from 'react';

import styled, {css} from 'styled-components';
import {formControlStyle} from '../../ui/FormControls';

export const OVERLAY_Z_INDEX = {
    base: 100,
    supporting: 105,
    detail: 120,
    childDetail: 130,
    confirm: 140,
} as const;

const layerInstanceRegistry = new Map<string, Set<number>>();

function claimLayerIndex(layerKey: string): number {
    const used = layerInstanceRegistry.get(layerKey) ?? new Set<number>();
    let nextIndex = 1;

    while (used.has(nextIndex)) {
        nextIndex += 1;
    }

    used.add(nextIndex);
    layerInstanceRegistry.set(layerKey, used);
    return nextIndex;
}

function releaseLayerIndex(layerKey: string, index: number): void {
    const used = layerInstanceRegistry.get(layerKey);
    if (!used) return;

    used.delete(index);
    if (used.size === 0) {
        layerInstanceRegistry.delete(layerKey);
    }
}

export function useLayerInstanceId(layerKey: string) {
    const [instanceIndex] = useState(() => claimLayerIndex(layerKey));

    useEffect(() => {
        return () => {
            releaseLayerIndex(layerKey, instanceIndex);
        };
    }, [instanceIndex, layerKey]);

    return {
        layerId: `${layerKey}-layer-${instanceIndex}`,
        layerDataId: `${layerKey}-${instanceIndex}`,
        layerIndex: instanceIndex,
    };
}

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useDialogAccessibility<T extends HTMLElement>(onClose: () => void) {
    const dialogRef = useRef<T | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        const initialTarget = focusable[0] ?? dialog;
        initialTarget.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;

            const currentFocusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
            if (currentFocusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = currentFocusable[0];
            const last = currentFocusable[currentFocusable.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (event.shiftKey) {
                if (active === first || !dialog.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }

            if (active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        dialog.addEventListener('keydown', handleKeyDown);
        return () => {
            dialog.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return dialogRef;
}

export const StyledOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: ${OVERLAY_Z_INDEX.base};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background-color: rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
`;

export const StyledDetail = styled.div<{ $width?: number | string }>`
    width: ${({$width = 400}) => typeof $width === 'number' ? `${$width}px` : $width};
    max-width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background-color: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;

    @media (max-width: 640px) {
        width: 100%;
        max-height: 90vh;
    }
`;

export const StyledHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 12px 16px;
    border-bottom: 1px solid var(--light-gray-color);

    h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    }

    > button {
        min-width: 44px;
        height: 30px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        background: var(--white-color);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        color: var(--dark-gray-color);

        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

export const scrollHintStyle = css`
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 30px;
        background: linear-gradient(to top, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
        pointer-events: none;
        z-index: 1;
    }
`;

export const scrollContentStyle = css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: auto;
`;

export const StyledBody = styled.div`
    flex: 1;
    ${scrollHintStyle};
`;

export const StyledBodyInner = styled.div`
    ${scrollContentStyle};
    padding: 8px 8px 30px 8px;
`;

export const StyledForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    strong {
        padding-bottom: 4px;
    }

    label {
        span {
            font-size: 13px;
            color: var(--dark-gray-color);
            font-weight: 500;
        }

        input, select {
            ${formControlStyle};
            padding: 0 8px;
            font-size: 13px;
        }
    }
`;

export const StyledFieldRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    > span, > strong {
        font-size: 13px;
        color: var(--dark-gray-color);
        font-weight: 500;
        padding-top: 4px;
    }
`;

export const StyledError = styled.p`
    margin: 10px 0 0;
    padding: var(--gap-md) var(--gap-lg);
    background-color: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-sm);
    font-size: var(--small-font);
    color: var(--danger-color);
`;

export const StyledPriceRow = styled.div`
    display: flex;
    align-items: center;
    gap: var(--gap-xs);

    > input {
        flex: 1;
        text-align: right;
    }
`;

export const StyledPriceUnit = styled.span`
    flex-shrink: 0;
    font-size: 13px;
    color: var(--dark-gray-color);
`;

export const StyledStatusBadge = styled.span<{ $variant: 'danger' | 'warning' }>`
    display: inline-block;
    padding: 2px var(--gap-md);
    background-color: ${(p) => p.$variant === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)'};
    border: 1px solid ${(p) => p.$variant === 'danger' ? 'var(--danger-border)' : 'var(--warning-border)'};
    border-radius: var(--radius-sm);
    font-size: var(--small-font);
    font-weight: 600;
    color: ${(p) => p.$variant === 'danger' ? 'var(--danger-color)' : 'var(--warning-color)'};
`;

export const StyledModalMessage = styled.p<{ $color?: string }>`
    margin: 0 0 12px;
    font-size: var(--font);
    font-weight: 600;
    text-align: center;
    color: ${(p) => p.$color || 'var(--black-color)'};
`;

export const StyledDiffGrid = styled.dl`
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: var(--gap-xs) var(--gap-lg);
    margin: 0;

    dd {
        display: flex;
        align-items: center;
        gap: var(--gap-md);
    }

    del {
        color: var(--danger-color);
        text-decoration: line-through;
        font-size: var(--small-font);
    }

    ins {
        color: var(--success-color);
        text-decoration: none;
        font-weight: 600;
        font-size: var(--small-font);

        &::before {
            content: "\\2192\\00a0";
            color: var(--gray-color);
            font-weight: 400;
        }
    }
`;

export const StyledFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    gap: 8px;
    padding: 0 16px 16px;

    @media (max-width: 640px) {
        flex-wrap: wrap;

        > button {
            flex: 1;
            min-height: 36px;
        }
    }
`;

export const StyledActionButton = styled.button<{ $primary?: boolean; $danger?: boolean; $warning?: boolean }>`
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid ${(props) => props.$danger ? 'var(--danger-color)' : props.$warning ? 'var(--warning-color)' : props.$primary ? 'var(--blue-color)' : 'var(--border-color)'};
    border-radius: var(--radius-sm);
    background-color: ${(props) => props.$danger ? 'var(--danger-color)' : props.$warning ? 'var(--warning-color)' : props.$primary ? 'var(--blue-color)' : 'var(--white-color)'};
    color: ${(props) => (props.$danger || props.$primary || props.$warning) ? 'var(--white-color)' : 'var(--dark-gray-color)'};
    font-size: var(--small-font);
    font-weight: 500;
    cursor: pointer;

    &:hover {
        opacity: 0.85;
    }
`;
