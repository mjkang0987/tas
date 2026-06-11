import {useCallback, useEffect, useState} from 'react';

import {useRouter} from 'next/router';

import {signIn, signOut, useSession} from 'next-auth/react';

import styled from 'styled-components';

import {StyledConfirmOverlay, StyledConfirmModal, StyledHeader, StyledFooter, StyledActionButton, StyledModalContent, StyledModalMessage} from '../calendar/overlays/ModalStyles';
import {LabelBadge} from '../ui/LabelBadge';
import {PageHero} from '../ui/PageHero';
import {GuestNotice} from '../ui/GuestNotice';
import {useToastStore} from '../../store/toastStore';
import {StyledSettingsCard, StyledSaveBtn, StyledEditBtn} from './settings-styles';

type LinkedAccount = {
    provider: string;
    createdAt: string;
};

type MergePreview = {
    provider: string;
    memberships: Array<{storeName: string; role: string}>;
};

const ROLE_LABELS: Record<string, string> = {
    owner: '오너',
    staff: '멤버',
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

const AUTH_ERROR_MESSAGES: Record<string, string> = {
    Configuration: '로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    OAuthAccountNotLinked: '이미 다른 계정에 연결된 SNS입니다.',
    'sync-error': '계정 동기화 중 오류가 발생했습니다. 다시 시도해 주세요.',
};

export function SNSLinkingSection() {
    const {data: session, status, update: updateSession} = useSession();
    const router = useRouter();
    const toast = useToastStore((s) => s.show);
    const isGuest = status === 'unauthenticated';
    const [linked, setLinked] = useState<LinkedAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);
    const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
    const [mergeLoading, setMergeLoading] = useState(false);

    useEffect(() => {
        const authError = typeof router.query.error === 'string' ? router.query.error : null;
        if (authError) {
            setError(AUTH_ERROR_MESSAGES[authError] ?? '연동 중 오류가 발생했습니다.');
            router.replace('/settings/sns', undefined, {shallow: true});
        }
    }, [router]);

    const fetchLinked = useCallback(async () => {
        try {
            const res = await fetch('/api/account/linked');
            if (res.ok) {
                const data: LinkedAccount[] = await res.json();
                setLinked(data);
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

    useEffect(() => {
        if (!session?.user?.pendingMerge) return;
        fetch('/api/account/merge-preview')
            .then((res) => res.ok ? res.json() : null)
            .then((data: MergePreview | null) => {
                if (data) setMergePreview(data);
            })
            .catch(() => {});
    }, [session?.user?.pendingMerge]);

    const handleMerge = async () => {
        setMergeLoading(true);
        try {
            const res = await fetch('/api/account/merge', {method: 'POST'});
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? '병합에 실패했습니다.');
                return;
            }
            await updateSession({clearPendingMerge: true});
            setMergePreview(null);
            await fetchLinked();
            toast('계정이 병합되었습니다.');
        } catch {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setMergeLoading(false);
        }
    };

    const handleMergeCancel = async () => {
        await updateSession({clearPendingMerge: true});
        setMergePreview(null);
    };

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
        setUnlinkTarget(null);
        const wasLastAccount = linked.length <= 1;
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
            if (wasLastAccount) {
                await signOut({callbackUrl: '/login'});
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

            {isGuest && <GuestNotice />}

            <StyledProviderCard>
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
                                        <StyledEditBtn
                                            type="button"
                                            onClick={() => setUnlinkTarget(p.id)}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? '처리 중...' : '연결 해제'}
                                        </StyledEditBtn>
                                    ) : (
                                        <StyledSaveBtn
                                            type="button"
                                            onClick={() => handleLink(p.id)}
                                            disabled={!!actionLoading}
                                        >
                                            {isProcessing ? '처리 중...' : '연결하기'}
                                        </StyledSaveBtn>
                                    )}
                                </StyledProviderAction>
                            </StyledProviderRow>
                        );
                    })
                )}
            </StyledProviderCard>

            {error && <StyledError>{error}</StyledError>}

            {unlinkTarget && (
                <StyledConfirmOverlay onClick={() => setUnlinkTarget(null)}>
                    <StyledConfirmModal onClick={(e) => e.stopPropagation()}>
                        <StyledHeader>
                            <h3>연결 해제</h3>
                        </StyledHeader>
                        <StyledModalContent>
                            <StyledModalMessage>
                                <strong>{PROVIDERS.find((p) => p.id === unlinkTarget)?.label}</strong> 연결을 해제하면 해당 계정으로 로그인할 수 없게 됩니다.
                                {linked.length <= 1 && ' 마지막 계정이므로 해제 시 로그아웃됩니다.'}
                                {' '}계속하시겠습니까?
                            </StyledModalMessage>
                        </StyledModalContent>
                        <StyledFooter>
                            <StyledActionButton type="button" onClick={() => setUnlinkTarget(null)}>취소</StyledActionButton>
                            <StyledActionButton
                                $danger
                                type="button"
                                disabled={!!actionLoading}
                                onClick={() => handleUnlink(unlinkTarget)}
                            >
                                {actionLoading ? '처리 중...' : '연결 해제'}
                            </StyledActionButton>
                        </StyledFooter>
                    </StyledConfirmModal>
                </StyledConfirmOverlay>
            )}

            {mergePreview && (
                <StyledConfirmOverlay onClick={handleMergeCancel}>
                    <StyledConfirmModal onClick={(e) => e.stopPropagation()}>
                        <StyledHeader>
                            <h3>계정 병합</h3>
                        </StyledHeader>
                        <StyledModalContent>
                            <StyledModalMessage>
                                {mergePreview.memberships.length > 0 ? (
                                    <>
                                        <StyledMergeList>
                                            {mergePreview.memberships.map((m, i) => (
                                                <StyledMergeItem key={i}>
                                                    <span>{m.storeName}</span>
                                                    <LabelBadge $tone={m.role === 'owner' ? 'purple' : 'neutral'}>
                                                        {ROLE_LABELS[m.role] ?? m.role}
                                                    </LabelBadge>
                                                </StyledMergeItem>
                                            ))}
                                        </StyledMergeList>
                                        <p>로 등록되어있습니다.</p>
                                    </>
                                ) : (
                                    <p>해당 SNS 계정이 다른 사용자에게 연결되어 있습니다.</p>
                                )}
                                <p>계정 병합 하시겠습니까?</p>
                            </StyledModalMessage>
                        </StyledModalContent>
                        <StyledFooter>
                            <StyledActionButton type="button" onClick={handleMergeCancel}>취소</StyledActionButton>
                            <StyledActionButton
                                $primary
                                type="button"
                                disabled={mergeLoading}
                                onClick={handleMerge}
                            >
                                {mergeLoading ? '처리 중...' : '병합'}
                            </StyledActionButton>
                        </StyledFooter>
                    </StyledConfirmModal>
                </StyledConfirmOverlay>
            )}
        </div>
    );
}


const StyledProviderCard = styled(StyledSettingsCard)`
    padding: 0;
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


const StyledError = styled.p`
    margin: 12px 0 0;
    font-size: 13px;
    color: var(--danger-color);
    font-weight: 500;
`;

const StyledMergeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
`;

const StyledMergeItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--dark-gray-color);
`;


