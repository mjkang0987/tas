import {useCallback, useEffect, useState} from 'react';

import {useSession} from 'next-auth/react';

import styled from 'styled-components';
import {LabelBadge} from '../ui/LabelBadge';

type Invite = {
    id: string;
    code: string;
    role: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
    usedByUser: {nickname: string} | null;
};

type Member = {
    id: string;
    role: string;
    user: {
        nickname: string;
        email: string | null;
    };
};

const ROLE_OPTIONS = [
    {value: 'manager', label: '매니저'},
    {value: 'staff', label: '스태프'},
] as const;

const ROLE_LABELS: Record<string, string> = {
    owner: '오너',
    manager: '매니저',
    staff: '스태프',
};

function formatExpiry(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return '만료됨';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
}

function CopyButton({text}: {text: string}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <StyledCopyButton type="button" onClick={handleCopy} aria-label="코드 복사">
            {copied ? '복사됨' : '복사'}
        </StyledCopyButton>
    );
}

export const MemberSection = () => {
    const {data: session} = useSession();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [newRole, setNewRole] = useState<string>('staff');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInvites = useCallback(async () => {
        try {
            const res = await fetch('/api/invites');
            if (res.ok) setInvites(await res.json());
        } catch { /* ignore */ }
    }, []);

    const loadMembers = useCallback(async () => {
        try {
            const res = await fetch('/api/members');
            if (res.ok) setMembers(await res.json());
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        loadInvites();
        loadMembers();
    }, [loadInvites, loadMembers]);

    const createInvite = async () => {
        setCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/invites', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({role: newRole}),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error ?? '초대코드 생성에 실패했습니다.');
            }

            await loadInvites();
        } catch (err) {
            setError(err instanceof Error ? err.message : '초대코드 생성에 실패했습니다.');
        } finally {
            setCreating(false);
        }
    };

    const deleteInvite = async (id: string) => {
        try {
            const res = await fetch('/api/invites', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id}),
            });
            if (res.ok) await loadInvites();
        } catch { /* ignore */ }
    };

    const activeInvites = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > new Date());
    const usedOrExpiredInvites = invites.filter((inv) => inv.usedAt || new Date(inv.expiresAt) <= new Date());
    const isManager = session?.user?.role === 'owner' || session?.user?.role === 'manager';

    if (!isManager) {
        return (
            <StyledContainer>
                <StyledSectionTitle>멤버 관리</StyledSectionTitle>
                <StyledHint>멤버 관리는 오너 또는 매니저만 가능합니다.</StyledHint>
            </StyledContainer>
        );
    }

    return (
        <StyledContainer>
            <StyledSectionTitle>멤버 관리</StyledSectionTitle>

            <StyledCard>
                <StyledCardTitle>초대코드 생성</StyledCardTitle>
                <StyledCreateRow>
                    <StyledSelect
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                    >
                        {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </StyledSelect>
                    <StyledPrimaryButton type="button" onClick={createInvite} disabled={creating}>
                        {creating ? '생성 중...' : '코드 생성'}
                    </StyledPrimaryButton>
                </StyledCreateRow>
                {error && <StyledError>{error}</StyledError>}
            </StyledCard>

            {activeInvites.length > 0 && (
                <StyledCard>
                    <StyledCardTitle>활성 초대코드</StyledCardTitle>
                    <StyledList>
                        {activeInvites.map((inv) => (
                            <StyledInviteItem key={inv.id}>
                                <StyledCodeBlock>
                                    <StyledCode>{inv.code}</StyledCode>
                                    <StyledBadge>{ROLE_LABELS[inv.role] ?? inv.role}</StyledBadge>
                                </StyledCodeBlock>
                                <StyledInviteActions>
                                    <StyledExpiry>{formatExpiry(inv.expiresAt)}</StyledExpiry>
                                    <CopyButton text={inv.code} />
                                    <StyledDeleteButton type="button" onClick={() => deleteInvite(inv.id)}>
                                        취소
                                    </StyledDeleteButton>
                                </StyledInviteActions>
                            </StyledInviteItem>
                        ))}
                    </StyledList>
                </StyledCard>
            )}

            {members.length > 0 && (
                <StyledCard>
                    <StyledCardTitle>현재 멤버</StyledCardTitle>
                    <StyledList>
                        {members.map((m) => (
                            <StyledMemberItem key={m.id}>
                                <StyledMemberName>{m.user.nickname}</StyledMemberName>
                                <StyledMemberMeta>
                                    {m.user.email && <StyledMemberEmail>{m.user.email}</StyledMemberEmail>}
                                    <StyledBadge>{ROLE_LABELS[m.role] ?? m.role}</StyledBadge>
                                </StyledMemberMeta>
                            </StyledMemberItem>
                        ))}
                    </StyledList>
                </StyledCard>
            )}

            {usedOrExpiredInvites.length > 0 && (
                <StyledCard>
                    <StyledCardTitle>사용/만료된 코드</StyledCardTitle>
                    <StyledList>
                        {usedOrExpiredInvites.map((inv) => (
                            <StyledInviteItem key={inv.id} $dimmed>
                                <StyledCodeBlock>
                                    <StyledCode $dimmed>{inv.code}</StyledCode>
                                    <StyledBadge>{ROLE_LABELS[inv.role] ?? inv.role}</StyledBadge>
                                </StyledCodeBlock>
                                <StyledExpiry>
                                    {inv.usedAt
                                        ? `사용됨${inv.usedByUser ? ` (${inv.usedByUser.nickname})` : ''}`
                                        : '만료됨'}
                                </StyledExpiry>
                            </StyledInviteItem>
                        ))}
                    </StyledList>
                </StyledCard>
            )}
        </StyledContainer>
    );
};

const StyledContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0;
`;

const StyledSectionTitle = styled.h2`
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--black-color);
`;

const StyledCard = styled.div`
    padding: 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
`;

const StyledCardTitle = styled.h3`
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledCreateRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;

    @media (max-width: 640px) {
        flex-wrap: wrap;

        > * {
            flex: 1;
            min-width: 0;
        }
    }
`;

const StyledSelect = styled.select`
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    background: var(--white-color);
    color: var(--black-color);
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
        border-color: var(--blue-color);
        box-shadow: 0 0 0 3px rgba(0, 169, 230, 0.14);
    }
`;

const StyledPrimaryButton = styled.button`
    height: 36px;
    padding: 0 16px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--blue-color);
    color: var(--white-color);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) {
            opacity: 0.85;
        }
    }
`;

const StyledError = styled.p`
    margin: 8px 0 0;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    color: var(--danger-color);
    font-size: 12px;
`;

const StyledList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledInviteItem = styled.div<{$dimmed?: boolean}>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: ${(p) => p.$dimmed ? 'var(--gray-color2)' : 'rgba(0, 169, 230, 0.06)'};
    border: 1px solid ${(p) => p.$dimmed ? 'var(--border-color)' : 'rgba(0, 169, 230, 0.18)'};
    opacity: ${(p) => p.$dimmed ? 0.65 : 1};

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const StyledCodeBlock = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const StyledCode = styled.span<{$dimmed?: boolean}>`
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 3px;
    color: ${(p) => p.$dimmed ? 'var(--dark-gray-color2)' : 'var(--blue-color)'};
    user-select: all;
`;

const StyledBadge = styled(LabelBadge).attrs({
    $tone: 'neutral',
    $shape: 'soft',
    $size: 'sm',
})``;

const StyledInviteActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 640px) {
        width: 100%;
        justify-content: flex-end;
    }
`;

const StyledExpiry = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
    white-space: nowrap;
`;

const StyledCopyButton = styled.button`
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    color: var(--dark-gray-color);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--gray-color2);
            border-color: var(--dark-gray-color2);
        }
    }
`;

const StyledDeleteButton = styled.button`
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.8;
        }
    }
`;

const StyledMemberItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--gray-color2);
    border: 1px solid var(--border-color);

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const StyledMemberName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledMemberMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledMemberEmail = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledHint = styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
`;
