import {useCallback, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

import Link from 'next/link';
import {useSession} from 'next-auth/react';

import styled, {keyframes} from 'styled-components';

import {StyledConfirmOverlay, StyledConfirmModal, StyledHeader, StyledModalContent} from '../calendar/overlays/ModalStyles';
import {actionButtonStyle} from '../settings/settings-styles';
import {LabelBadge} from '../ui/LabelBadge';
import {ROLE_LABELS} from '../../utils/labels';

type StoreEntry = {
    storeId: string;
    storeName: string;
    role: string;
};

type StoreSwitcherProps = {
    fallbackName: string;
    onNavigate?: () => void;
};

export function StoreSwitcher({fallbackName, onNavigate}: StoreSwitcherProps) {
    const {data: session, update} = useSession();
    const [stores, setStores] = useState<StoreEntry[]>([]);
    const [open, setOpen] = useState(false);
    const [switching, setSwitching] = useState(false);

    const fetchStores = useCallback(async () => {
        try {
            const res = await fetch('/api/user/stores');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.stores)) setStores(data.stores);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (session?.user?.id) fetchStores();
    }, [session?.user?.id, fetchStores]);

    if (stores.length < 2) {
        if (!fallbackName) return null;
        return (
            <StyledFallbackLink href="/settings/store" onClick={onNavigate}>
                {fallbackName}
            </StyledFallbackLink>
        );
    }

    const currentStoreId = session?.user?.storeId;
    const currentName = stores.find((s) => s.storeId === currentStoreId)?.storeName ?? fallbackName;

    const handleSwitch = async (storeId: string) => {
        if (storeId === currentStoreId || switching) return;
        setSwitching(true);
        setOpen(false);
        // 세션 갱신(aside 변경)은 오버레이로 가린 뒤, 깨끗하게 hard reload
        await update({storeId});
        window.location.reload();
    };

    return (
        <StyledRow>
            <StyledName>{currentName || '매장'}</StyledName>
            <StyledSwitchBtn type="button" onClick={() => setOpen(true)} disabled={switching}>
                {switching ? '전환 중' : '전환'}
            </StyledSwitchBtn>

            {open && (
                <StyledConfirmOverlay onClick={() => setOpen(false)}>
                    <StyledConfirmModal onClick={(e) => e.stopPropagation()}>
                        <StyledHeader>
                            <h3>매장 전환</h3>
                            <button type="button" onClick={() => setOpen(false)}>닫기</button>
                        </StyledHeader>
                        <StyledModalContent>
                            <StyledStoreList>
                                {stores.map((s) => (
                                    <StyledStoreItem
                                        key={s.storeId}
                                        type="button"
                                        $active={s.storeId === currentStoreId}
                                        onClick={() => handleSwitch(s.storeId)}
                                    >
                                        <StyledStoreInfo>
                                            <StyledStoreName>{s.storeName}</StyledStoreName>
                                            <LabelBadge $tone={s.role === 'owner' ? 'purple' : 'neutral'}>{ROLE_LABELS[s.role] ?? s.role}</LabelBadge>
                                        </StyledStoreInfo>
                                        {s.storeId === currentStoreId && (
                                            <StyledCheckIcon viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M5 12L10 17L19 7" />
                                            </StyledCheckIcon>
                                        )}
                                    </StyledStoreItem>
                                ))}
                            </StyledStoreList>
                        </StyledModalContent>
                    </StyledConfirmModal>
                </StyledConfirmOverlay>
            )}

            {switching && typeof document !== 'undefined' && document.getElementById('modal-root') && createPortal(
                <StyledSwitchOverlay>
                    <StyledSwitchSpinner />
                    <StyledSwitchText>매장 전환 중...</StyledSwitchText>
                </StyledSwitchOverlay>,
                document.getElementById('modal-root')!,
            )}
        </StyledRow>
    );
}

const StyledRow = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 0 10px 6px;
    width: var(--aside-width);
    box-sizing: border-box;
`;

const StyledName = styled.span`
    min-width: 0;
    font-size: 11px;
    font-weight: 500;
    color: var(--aside-text);
    opacity: 0.6;
    word-break: break-all;
    line-height: 1.4;
`;

const StyledSwitchBtn = styled.button`
    ${actionButtonStyle};
    border: none;
    background: var(--brand-color);
    color: var(--white-color);
`;

const StyledStoreList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledStoreItem = styled.button<{$active: boolean}>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid ${(p) => p.$active ? 'var(--brand-color)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-md);
    background: ${(p) => p.$active ? 'var(--brand-color-bg)' : 'var(--white-color)'};
    cursor: ${(p) => p.$active ? 'default' : 'pointer'};
    text-align: left;
    transition: background-color 0.1s, border-color 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: ${(p) => p.$active ? 'var(--brand-color)' : 'var(--dark-gray-color2)'};
        }
    }
`;

const StyledStoreInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const StyledStoreName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;


const StyledCheckIcon = styled.svg`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke: var(--brand-color);
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

const switchSpin = keyframes`
    to { transform: rotate(360deg); }
`;

const StyledSwitchOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: var(--white-color);
`;

const StyledSwitchSpinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid var(--light-gray-color);
    border-top-color: var(--brand-color);
    border-radius: 50%;
    animation: ${switchSpin} 0.6s linear infinite;
`;

const StyledSwitchText = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledFallbackLink = styled(Link)`
    flex-shrink: 0;
    display: block;
    padding: 0 10px 6px;
    min-width: var(--aside-width);
    box-sizing: border-box;
    font-size: 11px;
    font-weight: 500;
    color: var(--aside-text);
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;
