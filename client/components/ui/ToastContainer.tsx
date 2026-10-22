import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styled, {keyframes, css} from 'styled-components';
import {useToastStore, type Toast} from '../../store/toastStore';

export function ToastContainer() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);
    const root = mounted ? document.getElementById('modal-root') : null;
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
            <ToastIcon type={toast.type} />
            <StyledMsg>{toast.message}</StyledMsg>
            <StyledClose
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="닫기"
            >×</StyledClose>
        </StyledItem>
    );
}

// 종류를 색만으로 알리지 않는다(WCAG 1.4.1) — 성공 ✓ · 오류 ! · 안내 i. 뜻은 문구가 전하므로 낭독에선 뺀다.
// 안드로이드(tas-android)도 같은 모양을 쓴다.
const TOAST_ICON_PATHS: Record<Toast['type'], string> = {
    success: 'M8 12.5L10.5 15L16 9.5',
    error: 'M12 7.5V13M12 16.5H12.01',
    info: 'M12 11V16.5M12 7.5H12.01',
};

function ToastIcon({type}: {type: Toast['type']}) {
    return (
        <StyledIcon viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d={TOAST_ICON_PATHS[type]} />
        </StyledIcon>
    );
}

const StyledIcon = styled.svg`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

const slideIn = keyframes`
    from { transform: translateY(-8px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
`;

const StyledList = styled.ul`
    position: fixed;
    /* 헤더(약 48px) 아래 컨텐츠 영역 기준 상단에서 50px */
    top: calc(48px + 50px);
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
    font-size: var(--medium-font);
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
    font-size: var(--large-font);
    line-height: 1;
    padding: 0 2px;
    opacity: 0.7;
    cursor: pointer;
    flex-shrink: 0;

    &:hover { opacity: 1; }
`;
