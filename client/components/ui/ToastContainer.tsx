import {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import styled, {keyframes, css} from 'styled-components';
import {useToastStore, type Toast} from '../../store/toastStore';

export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);
    const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
    if (!root) return null;
    return createPortal(
        <StyledList role="region" aria-live="polite" aria-label="알림">
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </StyledList>,
        root
    );
}

function ToastItem({toast, onDismiss}: {toast: Toast; onDismiss: (id: string) => void}) {
    const ref = useRef<HTMLLIElement>(null);

    useEffect(() => {
        ref.current?.focus();
    }, []);

    return (
        <StyledItem ref={ref} $type={toast.type} tabIndex={-1} role="alert">
            <StyledMsg>{toast.message}</StyledMsg>
            <StyledClose
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="닫기"
            >×</StyledClose>
        </StyledItem>
    );
}

const slideIn = keyframes`
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
`;

const StyledList = styled.ul`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    list-style: none;
    margin: 0;
    padding: 0;
    z-index: 9999;
    pointer-events: none;
    width: max-content;
    max-width: calc(100vw - 32px);
`;

const typeStyles = {
    success: css`background: #1a7f3c; color: #fff;`,
    error:   css`background: var(--danger-color); color: #fff;`,
    info:    css`background: var(--toast-bg); color: #fff;`,
};

const StyledItem = styled.li<{$type: Toast['type']}>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    font-size: 13px;
    font-weight: 500;
    pointer-events: all;
    animation: ${slideIn} 0.18s ease;
    ${(p) => typeStyles[p.$type]}
`;

const StyledMsg = styled.span`flex: 1;`;

const StyledClose = styled.button`
    background: none;
    border: none;
    color: inherit;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
    opacity: 0.7;
    cursor: pointer;
    flex-shrink: 0;

    &:hover { opacity: 1; }
`;
