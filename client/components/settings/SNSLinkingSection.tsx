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
    const {data: session} = useSession();
    const isGuest = !session;
    const [linked, setLinked] = useState<LinkedAccount[]>([]);
    const [loading, setLoading] = useState(!isGuest);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fetchLinked = useCallback(async () => {
        if (isGuest) return;
        try {
            const res = await fetch('/api/account/linked');
            if (res.ok) setLinked(await res.json());
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [isGuest]);

    useEffect(() => { fetchLinked(); }, [fetchLinked]);

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
                                            onClick={() => handleUnlink(p.id)}
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
