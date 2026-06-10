import {useCallback, useEffect, useState} from 'react';

import {signIn, useSession} from 'next-auth/react';

import styled from 'styled-components';
import {PageHero} from '../ui/PageHero';

type LinkedAccount = {
    provider: string;
    createdAt: string;
};

type ProviderConfig = {
    id: string;
    label: string;
    bg: string;
    color: string;
    border: string;
};

const PROVIDERS: ProviderConfig[] = [
    {id: 'google', label: 'Google', bg: '#fff', color: '#333', border: '#ddd'},
    {id: 'kakao', label: 'Kakao', bg: '#FEE500', color: '#191919', border: '#FEE500'},
    {id: 'naver', label: 'Naver', bg: '#03C75A', color: '#fff', border: '#03C75A'},
];

export function SNSLinkingSection() {
    const {status} = useSession();
    const isGuest = status === 'unauthenticated';
    const [linked, setLinked] = useState<LinkedAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);

    const fetchLinked = useCallback(async () => {
        try {
            const res = await fetch('/api/account/linked');
            if (res.ok) {
                const data: LinkedAccount[] = await res.json();
                setLinked(data);

                const attempted = sessionStorage.getItem('tas-link-attempt');
                if (attempted) {
                    sessionStorage.removeItem('tas-link-attempt');
                    const linked = new Set(data.map((a) => a.provider));
                    if (!linked.has(attempted)) {
                        const label = PROVIDERS.find((p) => p.id === attempted)?.label ?? attempted;
                        setError(`${label} 계정이 이미 다른 사용자에게 연결되어 있습니다.`);
                    }
                }
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'loading') return;
        if (isGuest) {
            setLoading(false);
            return;
        }
        fetchLinked();
    }, [status, isGuest, fetchLinked]);

    const linkedProviders = new Set(linked.map((a) => a.provider));

    const handleLink = async (provider: string) => {
        setError('');
        setActionLoading(provider);
        try {
            if (!isGuest) {
                const res = await fetch('/api/account/link', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({provider}),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    setError(data.error ?? '연결에 실패했습니다.');
                    return;
                }
            }
            if (!isGuest) sessionStorage.setItem('tas-link-attempt', provider);
            await signIn(provider, {callbackUrl: isGuest ? '/' : '/settings/sns'});
        } catch {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnlink = async (provider: string) => {
        setError('');
        setActionLoading(provider);
        setUnlinkTarget(null);
        try {
            const res = await fetch('/api/account/unlink', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({provider}),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? '연결 해제에 실패했습니다.');
                return;
            }
            await fetchLinked();
        } catch {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div>
            <PageHero eyebrow="SNS" title="계정 연동" subtitle="여러 SNS 계정을 연결하면 어떤 계정으로든 로그인할 수 있습니다." />

            <StyledCard>
                {loading ? (
                    <StyledLoadingRow>불러오는 중...</StyledLoadingRow>
                ) : (
                    PROVIDERS.map((p) => {
                        const isLinked = linkedProviders.has(p.id);
                        const isLastAccount = linked.length <= 1;
                        const isProcessing = actionLoading === p.id;

                        return (
                            <StyledProviderRow key={p.id}>
                                <StyledProviderInfo>
                                    <StyledProviderDot $bg={p.bg} $border={p.border} />
                                    <StyledProviderName>{p.label}</StyledProviderName>
                                    {isLinked && <StyledBadge>연결됨</StyledBadge>}
                                </StyledProviderInfo>
                                <StyledProviderAction>
                                    {isLinked ? (
                                        <StyledUnlinkBtn
                                            type="button"
                                            onClick={() => setUnlinkTarget(p.id)}
                                            disabled={isLastAccount || isProcessing}
                                            title={isLastAccount ? '최소 1개의 계정은 연결을 유지해야 합니다' : ''}
                                        >
                                            {isProcessing ? '처리 중...' : '연결 해제'}
                                        </StyledUnlinkBtn>
                                    ) : (
                                        <StyledLinkBtn
                                            type="button"
                                            onClick={() => handleLink(p.id)}
                                            disabled={!!actionLoading}
                                        >
                                            {isProcessing ? '처리 중...' : '연결하기'}
                                        </StyledLinkBtn>
                                    )}
                                </StyledProviderAction>
                            </StyledProviderRow>
                        );
                    })
                )}
            </StyledCard>

            {error && <StyledError>{error}</StyledError>}

            <StyledHint>최소 1개의 계정은 연결을 유지해야 합니다.</StyledHint>

            {unlinkTarget && (
                <StyledUnlinkOverlay onClick={() => setUnlinkTarget(null)}>
                    <StyledUnlinkDialog onClick={(e) => e.stopPropagation()}>
                        <StyledUnlinkTitle>연결 해제</StyledUnlinkTitle>
                        <StyledUnlinkMsg>
                            <strong>{PROVIDERS.find((p) => p.id === unlinkTarget)?.label}</strong> 연결을 해제하면 해당 계정으로 로그인할 수 없게 됩니다. 계속하시겠습니까?
                        </StyledUnlinkMsg>
                        <StyledUnlinkActions>
                            <StyledUnlinkCancel type="button" onClick={() => setUnlinkTarget(null)}>취소</StyledUnlinkCancel>
                            <StyledUnlinkConfirm
                                type="button"
                                disabled={!!actionLoading}
                                onClick={() => handleUnlink(unlinkTarget)}
                            >
                                {actionLoading ? '처리 중...' : '연결 해제'}
                            </StyledUnlinkConfirm>
                        </StyledUnlinkActions>
                    </StyledUnlinkDialog>
                </StyledUnlinkOverlay>
            )}
        </div>
    );
}

const StyledCard = styled.div`
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
`;

const StyledLoadingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledProviderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;

    & + & {
        border-top: 1px solid var(--light-gray-color);
    }
`;

const StyledProviderInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const StyledProviderDot = styled.span<{$bg: string; $border: string}>`
    display: block;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${(p) => p.$bg};
    border: 1px solid ${(p) => p.$border};
    flex-shrink: 0;
`;

const StyledProviderName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledBadge = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: var(--success-color);
    background: var(--success-bg);
    padding: 2px 8px;
    border-radius: 999px;
`;

const StyledProviderAction = styled.div`
    flex-shrink: 0;
`;

const StyledLinkBtn = styled.button`
    height: 32px;
    padding: 0 14px;
    border: 1px solid var(--blue-color);
    border-radius: var(--radius-md);
    background: var(--blue-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.5; cursor: default; }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) { opacity: 0.85; }
    }
`;

const StyledUnlinkBtn = styled.button`
    height: 32px;
    padding: 0 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: none;
    font-size: 12px;
    font-weight: 500;
    color: var(--dark-gray-color);
    cursor: pointer;
    transition: opacity 0.15s, border-color 0.15s;

    &:disabled { opacity: 0.4; cursor: default; }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) {
            border-color: var(--danger-border);
            color: var(--danger-color);
        }
    }
`;

const StyledError = styled.p`
    margin: 12px 0 0;
    font-size: 13px;
    color: var(--danger-color);
    font-weight: 500;
`;

const StyledHint = styled.p`
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledUnlinkOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const StyledUnlinkDialog = styled.div`
    background: var(--white-color);
    border-radius: var(--radius-lg);
    padding: 24px;
    width: 320px;
    max-width: calc(100vw - 32px);
    box-shadow: var(--shadow-lg);
`;

const StyledUnlinkTitle = styled.h3`
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 700;
    color: var(--dark-gray-color);
`;

const StyledUnlinkMsg = styled.p`
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.6;

    strong { color: var(--dark-gray-color); font-weight: 700; }
`;

const StyledUnlinkActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const StyledUnlinkCancel = styled.button`
    height: 36px;
    padding: 0 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: none;
    font-size: 13px;
    font-weight: 500;
    color: var(--dark-gray-color);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover { background: var(--light-gray-color); }
    }
`;

const StyledUnlinkConfirm = styled.button`
    height: 36px;
    padding: 0 16px;
    border: 1px solid var(--danger-border, #fca5a5);
    border-radius: var(--radius-md);
    background: var(--danger-color, #dc2626);
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.5; cursor: default; }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) { opacity: 0.85; }
    }
`;
