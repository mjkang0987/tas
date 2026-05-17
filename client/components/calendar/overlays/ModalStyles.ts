import {useEffect, useRef, useState} from 'react';

import styled, {css} from 'styled-components';
import {formControlStyle} from '../../ui/FormControls';
import {LabelBadge} from '../../ui/LabelBadge';

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
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        const initialTarget = focusable[0] ?? dialog;
        initialTarget.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
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
    }, []);

    return dialogRef;
}

export const StyledOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: ${OVERLAY_Z_INDEX.base};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--overlay-padding);
    background: radial-gradient(circle at top, rgba(255, 255, 255, 0.14), transparent 38%),
    rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(var(--overlay-backdrop-blur));
    box-sizing: border-box;
`;

export const StyledDetail = styled.div<{ $width?: number | string }>`
    width: ${({$width = 400}) => typeof $width === 'number' ? `${$width}px` : $width};
    max-width: min(360px, 90vw);
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
    border: 1px solid var(--modal-border);
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
    overflow: hidden;

    @media (max-width: 640px) {
        width: 100%;
        max-width: min(360px, 90vw);
        max-height: 90vh;
        border-radius: var(--modal-radius-mobile);
    }
`;

export const StyledHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    gap: var(--modal-header-gap);
    padding: var(--modal-header-padding);
    border-bottom: 1px solid var(--modal-header-border);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.92) 100%);
    backdrop-filter: blur(10px);

    h3 {
        margin: 0;
        font-size: var(--modal-title-font);
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--black-color);
    }

    > button:not([class]) {
        min-width: 44px;
        height: 30px;
        padding: 0 10px;
        border: 1px solid var(--light-gray-color);
        border-radius: 8px;
        background: var(--white-color);
        font-size: var(--modal-subtitle-font);
        font-weight: 600;
        cursor: pointer;
        color: var(--dark-gray-color);

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background-color: var(--black-color-10);
            }
        }
    }
`;

export const StyledHeaderTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    > p {
        margin: 0;
        font-size: 12px;
        line-height: 1.45;
        color: var(--dark-gray-color2);
        font-weight: 500;
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
    padding: var(--modal-body-padding);
`;

export const StyledForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    label {
        display: flex;
        flex-direction: column;
        gap: 4px;

        > strong {
            font-size: 12px;
            font-weight: 600;
            color: var(--dark-gray-color);
        }

        input, select {
            ${formControlStyle};
            height: 36px;
            padding: 0 10px;
            font-size: 13px;
            color: var(--black-color);
            width: 100%;
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

const errorMessageStyle = css`
    width: 100%;
    padding: var(--gap-md) var(--gap-lg);
    background-color: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-sm);
    font-size: var(--small-font);
    color: var(--danger-color);
`;

export const StyledError = styled.p`
    margin: 10px 0 0;
    ${errorMessageStyle};
`;

export const StyledInlineError = styled(StyledError)`
    margin-top: 8px;
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

export const StyledStatusBadge = styled(LabelBadge).attrs<{ $variant: 'neutral' | 'danger' | 'warning' | 'success' }>((props) => ({
    $tone: props.$variant,
    $size: 'md',
    $shape: 'soft',
}))<{ $variant: 'neutral' | 'danger' | 'warning' | 'success' }>`
    font-size: var(--small-font);
    font-weight: 600;
`;

export const StyledModalMessage = styled.p<{ $color?: string }>`
    margin: var(--modal-message-margin);
    font-size: var(--modal-message-font);
    font-weight: 600;
    line-height: 1.55;
    text-align: left;
    color: ${(p) => p.$color || '#111827'};
`;

export const StyledModalContent = styled.div`
    padding: var(--modal-content-padding);
`;

export const StyledInfoGrid = styled.dl`
    display: grid;
    gap: var(--info-grid-gap);
    margin: 0;

    > div {
        display: grid;
        grid-template-columns: 64px 1fr;
        gap: var(--info-grid-cell-gap);
        align-items: start;
        padding: var(--info-grid-cell-padding);
        border-radius: var(--info-grid-cell-radius);
        background: rgba(248, 250, 252, 0.9);
        border: 1px solid rgba(226, 232, 240, 0.9);
        font-size: 13px;
    }

    dt {
        color: var(--gray-color);
        font-weight: 600;
    }

    dd {
        margin: 0;
        color: #111827;
        font-weight: 600;
        line-height: 1.45;
    }
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
    align-items: center;
    gap: var(--modal-footer-gap);
    padding: var(--modal-footer-padding);
    border-top: 1px solid var(--modal-footer-border);
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.72) 0%, rgba(255, 255, 255, 0.96) 100%);

    @media (max-width: 640px) {
        flex-wrap: wrap;
        justify-content: flex-end;

        > button {
            flex: 0 0 auto;
            min-height: var(--modal-button-height);
        }
    }
`;

export const StyledActionButton = styled.button<{ $primary?: boolean; $danger?: boolean; $warning?: boolean }>`
    min-height: var(--modal-button-height);
    padding: 0 var(--modal-button-padding-x);
    border: 1px solid ${(props) => props.$danger ? 'var(--danger-color)' : props.$warning ? 'var(--warning-color)' : props.$primary ? 'var(--blue-color)' : 'rgba(148, 163, 184, 0.34)'};
    border-radius: var(--modal-button-radius);
    background-color: ${(props) => props.$danger ? 'var(--danger-color)' : props.$warning ? 'var(--warning-color)' : props.$primary ? 'var(--blue-color)' : 'rgba(255,255,255,0.88)'};
    color: ${(props) => (props.$danger || props.$primary || props.$warning) ? 'var(--white-color)' : 'var(--dark-gray-color)'};
    font-size: var(--modal-button-font);
    font-weight: 600;
    cursor: pointer;
    box-shadow: ${(props) => (props.$danger || props.$primary || props.$warning) ? '0 10px 20px rgba(15, 23, 42, 0.12)' : 'none'};
    transition: transform 0.14s ease, opacity 0.14s ease, box-shadow 0.14s ease, background-color 0.14s ease;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.92;
        }
    }

    @media (max-width: 640px) {
        min-height: var(--modal-button-height);
        padding: 0 var(--modal-button-padding-x);
        font-size: 12px;
        border-radius: var(--modal-button-radius);
    }
`;
