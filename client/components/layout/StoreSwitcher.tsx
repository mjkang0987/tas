import {useCallback, useEffect, useState} from 'react';

import Link from 'next/link';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';

import styled from 'styled-components';

import {StyledConfirmOverlay, StyledConfirmModal, StyledHeader, StyledModalContent} from '../calendar/overlays/ModalStyles';
import {actionButtonStyle} from '../settings/settings-styles';
import {LabelBadge} from '../ui/LabelBadge';

type StoreEntry = {
    storeId: string;
    storeName: string;
    role: string;
};

type StoreSwitcherProps = {
    fallbackName: string;
    onNavigate?: () => void;
};

const ROLE_LABELS: Record<string, string> = {
    owner: '오너',
    staff: '멤버',
};

export function StoreSwitcher({fallbackName, onNavigate}: StoreSwitcherProps) {
    const {data: session, update} = useSession();
    const router = useRouter();
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
        await update({storeId});
        router.reload();
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
