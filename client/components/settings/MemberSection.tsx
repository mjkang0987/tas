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
            if (res.ok) {
                setInvites(await res.json());
            }
        } catch {
            // ignore
        }
    }, []);

    const loadMembers = useCallback(async () => {
        try {
            const res = await fetch('/api/members');
            if (res.ok) {
                setMembers(await res.json());
            }
        } catch {
            // ignore
        }
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

            if (res.ok) {
                await loadInvites();
            }
        } catch {
            // ignore
        }
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
                    <StyledSelect value={newRole} onChange={(e) => setNewRole(e.target.value)}>
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
                                <StyledInviteMeta>
                                    <span>{formatExpiry(inv.expiresAt)}</span>
                                    <StyledDeleteButton type="button" onClick={() => deleteInvite(inv.id)}>
                                        취소
                                    </StyledDeleteButton>
                                </StyledInviteMeta>
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
                                    {m.user.email && <span>{m.user.email}</span>}
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
                                <StyledInviteMeta>
                                    <span>
                                        {inv.usedAt
                                            ? `사용됨${inv.usedByUser ? ` (${inv.usedByUser.nickname})` : ''}`
                                            : '만료됨'}
                                    </span>
                                </StyledInviteMeta>
                            </StyledInviteItem>
                        ))}
                    </StyledList>
                </StyledCard>
            )}
        </StyledContainer>
    );
};

const StyledContainer = styled.div`
    padding: 20px 0;
`;

const StyledSectionTitle = styled.h2`
    margin: 0 0 16px;
    font-size: 20px;
    font-weight: 700;
    color: #111827;
`;

const StyledCard = styled.div`
    margin-bottom: 14px;
    padding: 18px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
`;

const StyledCardTitle = styled.h3`
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: #374151;
`;

const StyledCreateRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
`;

const StyledSelect = styled.select`
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background: #fff;
    cursor: pointer;
`;

const StyledPrimaryButton = styled.button`
    padding: 8px 18px;
    border: none;
    border-radius: 8px;
    background: #2d7ff9;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: default;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) {
            background: #1a6ddf;
        }
    }
`;

const StyledError = styled.p`
    margin: 10px 0 0;
    color: #dc2626;
    font-size: 13px;
`;

const StyledList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledInviteItem = styled.div<{$dimmed?: boolean}>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 10px;
    background: ${(p) => p.$dimmed ? '#f9fafb' : '#f0f7ff'};
    opacity: ${(p) => p.$dimmed ? 0.7 : 1};
`;

const StyledCodeBlock = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledCode = styled.span<{$dimmed?: boolean}>`
    font-family: monospace;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    color: ${(p) => p.$dimmed ? '#9ca3af' : '#1e40af'};
`;

const StyledBadge = styled(LabelBadge).attrs({
    $tone: 'neutral',
    $shape: 'soft',
    $size: 'sm',
})`
    color: #374151;
`;

const StyledInviteMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #6b7280;
`;

const StyledDeleteButton = styled.button`
    padding: 4px 10px;
    border: 1px solid #fecaca;
    border-radius: 6px;
    background: #fff;
    color: #dc2626;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
`;

const StyledMemberItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f9fafb;
`;

const StyledMemberName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #111827;
`;

const StyledMemberMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #6b7280;
`;

const StyledHint = styled.p`
    color: #6b7280;
    font-size: 14px;
`;
