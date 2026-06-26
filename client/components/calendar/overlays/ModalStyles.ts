import {useEffect, useRef, useState} from 'react';

import styled, {css} from 'styled-components';
import {formControlStyle} from '../../ui/FormControls';
import {LabelBadge} from '../../ui/LabelBadge';
import {FieldError} from '../../ui/FieldError';

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
    top: 0;
    left: 0;
    right: 0;
    height: 100vh;
    height: 100dvh; /* 모바일 브라우저 툴바 제외한 실제 보이는 높이 — 모달이 헤더/푸터까지 화면 안에 들어오도록 */
    z-index: ${OVERLAY_Z_INDEX.base};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--overlay-padding);
    background: radial-gradient(circle at top, rgba(255, 255, 255, 0.14), transparent 38%),
    rgba(15, 23, 42, 0.1);
    backdrop-filter: blur(var(--overlay-backdrop-blur));
    box-sizing: border-box;
`;

export const StyledDetail = styled.div<{ $width?: number | string }>`
    width: ${({$width = 400}) => typeof $width === 'number' ? `${$width}px` : $width};
    max-width: min(360px, 90vw);
    max-height: 80vh;
    max-height: 80dvh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, var(--bg-subtle-98) 100%);
    border: 1px solid var(--modal-border);
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
    overflow: hidden;

    @media (max-width: 640px) {
        width: 100%;
        max-width: min(360px, 90vw);
        max-height: 90vh;
        max-height: 90dvh;
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
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, var(--bg-subtle-92) 100%);
    backdrop-filter: blur(10px);

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

export const StyledHeaderTitle = styled.h3`
    margin: 0;
    font-size: var(--modal-title-font);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--black-color);
`;

export const StyledHeaderTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

export const StyledHeaderTitleGroupText = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--dark-gray-color2);
    font-weight: 500;
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
    overflow-x: hidden; /* 세로 스크롤(overflow-y:auto)이 가로축까지 auto로 만들어 라벨이 잘리는 현상 방지 */
    padding: var(--modal-body-padding);
`;

export const StyledForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    label:not(:has(input[type="checkbox"])) {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0; /* 그리드/플렉스 컬럼 안에서 줄어들 수 있게(라벨 기본 min-width:auto 방지) */

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
            min-width: 0; /* iOS date/time 등 네이티브 컨트롤이 컨테이너를 밀어내지 않도록 */
        }

        /* iOS Safari의 date/time 네이티브 컨트롤은 고유 최소폭이 있어 width:100%를
           무시하고 박스를 넘쳐 이웃/아래 행과 겹친다. appearance:none으로 일반 입력처럼
           폭을 따르게 한다(탭하면 네이티브 피커는 그대로 동작). */
        input[type="date"], input[type="time"] {
            -webkit-appearance: none;
            appearance: none;
            text-align: center;
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

export {FieldError as StyledError, FieldError as StyledInlineError};

export const StyledPriceRow = styled.div`
    display: flex;
    align-items: center;
    gap: var(--gap-xs);
`;

export const StyledPriceRowInput = styled.input`
    flex: 1;
    text-align: right;
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
`;

export const StyledInfoGridRow = styled.div`
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: var(--info-grid-cell-gap);
    align-items: start;
    padding: var(--info-grid-cell-padding);
    border-radius: var(--info-grid-cell-radius);
    background: rgba(248, 250, 252, 0.9); /* --bg-subtle 계열 (0.9 변형은 변수 없음) */
    border: 1px solid rgba(226, 232, 240, 0.9);
    font-size: 13px;
`;

export const StyledInfoGridTerm = styled.dt`
    color: var(--gray-color);
    font-weight: 600;
`;

export const StyledInfoGridDesc = styled.dd`
    margin: 0;
    color: #111827;
    font-weight: 600;
    line-height: 1.45;
`;

export const StyledDiffGrid = styled.dl`
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: var(--gap-xs) var(--gap-lg);
    margin: 0;
`;

export const StyledDiffGridTerm = styled.dt`
    font-size: 13px;
    color: var(--dark-gray-color);
    font-weight: 500;
`;

export const StyledDiffGridDesc = styled.dd`
    display: flex;
    align-items: center;
    gap: var(--gap-md);
    margin: 0;
    font-size: 13px;
`;

export const StyledDiffGridDel = styled.del`
    color: var(--danger-color);
    text-decoration: line-through;
    font-size: var(--small-font);
`;

export const StyledDiffGridIns = styled.ins`
    color: var(--success-color);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--small-font);

    &::before {
        content: "\\2192\\00a0";
        color: var(--dark-gray-color);
        font-weight: 400;
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
    background: linear-gradient(180deg, var(--bg-subtle-72) 0%, rgba(255, 255, 255, 0.96) 100%);

    @media (max-width: 640px) {
        flex-wrap: wrap;
        justify-content: flex-end;

        > button {
            flex: 0 0 auto;
            min-height: var(--modal-button-height);
        }
    }
`;

export const StyledConfirmOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.confirm};
`;

export const StyledConfirmModal = styled(StyledDetail)`
    width: min(360px, 90vw);
`;

export const StyledChangeRow = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

export const StyledArrow = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

export const StyledNewTime = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--radius-md);
    background: rgba(0, 169, 230, 0.08);
    border: 1px solid rgba(0, 169, 230, 0.2);
    font-size: 13px;
    font-weight: 700;
    color: var(--blue-color);
`;

export const StyledActionButton = styled.button<{ $primary?: boolean; $danger?: boolean; $dangerOutline?: boolean; $warning?: boolean }>`
    min-height: var(--modal-button-height);
    padding: 0 var(--modal-button-padding-x);
    border: ${(props) => props.$dangerOutline ? '1px solid var(--danger-border)' : (props.$danger || props.$primary || props.$warning) ? 'none' : '1px solid var(--border-color)'};
    border-radius: var(--modal-button-radius);
    background-color: ${(props) => props.$dangerOutline ? 'var(--white-color)' : props.$danger ? 'var(--danger-color)' : props.$warning ? 'var(--warning-color)' : props.$primary ? 'var(--brand-color)' : 'var(--white-color)'};
    color: ${(props) => props.$dangerOutline ? 'var(--danger-color)' : (props.$danger || props.$primary || props.$warning) ? 'var(--white-color)' : 'var(--dark-gray-color)'};
    font-size: var(--modal-button-font);
    font-weight: ${(props) => (props.$danger || props.$dangerOutline || props.$primary || props.$warning) ? 600 : 500};
    box-shadow: var(--shadow-sm);
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
