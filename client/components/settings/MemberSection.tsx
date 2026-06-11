import {useCallback, useEffect, useState} from 'react';

import {useSession} from 'next-auth/react';

import styled from 'styled-components';
import {LabelBadge, type LabelBadgeTone} from '../ui/LabelBadge';
import {PageHero} from '../ui/PageHero';
import {EMPTY_TEXT, StyledEmpty, StyledSettingsCard, StyledSettingsCardTitle, StyledSettingsHint, StyledSaveBtn, StyledSelect} from './settings-styles';
import {FieldError} from '../ui/FieldError';
import {StyledConfirmOverlay, StyledConfirmModal, StyledHeader, StyledFooter, StyledActionButton} from '../calendar/overlays/ModalStyles';
import {useToastStore} from '../../store/toastStore';

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
        id: string;
        nickname: string;
        email: string | null;
    };
};

const ROLE_OPTIONS = [
    {value: 'manager', label: '멤버'},
    {value: 'staff', label: '스태프'},
] as const;

const ROLE_LABELS: Record<string, string> = {
    owner: '오너',
    manager: '멤버',
    staff: '스태프',
};

const ROLE_TONE: Record<string, LabelBadgeTone> = {
    owner: 'purple',
    manager: 'info',
    staff: 'neutral',
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
    const toast = useToastStore((s) => s.show);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [newRole, setNewRole] = useState<string>('staff');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [kickTarget, setKickTarget] = useState<Member | null>(null);
    const [kicking, setKicking] = useState(false);
    const [roleSaving, setRoleSaving] = useState<string | null>(null);

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
            toast('초대코드가 생성되었습니다.');
        } catch (err) {
            setError(err instanceof Error ? err.message : '초대코드 생성에 실패했습니다.');
        } finally {
            setCreating(false);
        }
    };

    const deleteInvite = async (id: string) => {
        setDeleteTarget(null);
        try {
            const res = await fetch('/api/invites', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id}),
            });
            if (res.ok) {
                await loadInvites();
                toast('초대코드가 취소되었습니다.', 'info');
            }
        } catch { /* ignore */ }
    };

    const kickMember = async (member: Member) => {
        setKicking(true);
        try {
            const res = await fetch('/api/members', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({membershipId: member.id}),
            });
            if (res.ok) {
                await loadMembers();
                toast(`${member.user.nickname}님을 멤버에서 제거했습니다.`, 'info');
            } else {
                const data = await res.json().catch(() => null);
                toast(data?.error ?? '멤버 제거에 실패했습니다.', 'error');
            }
        } catch {
            toast('멤버 제거에 실패했습니다.', 'error');
        } finally {
            setKicking(false);
            setKickTarget(null);
        }
    };

    const changeRole = async (membershipId: string, role: string) => {
        setRoleSaving(membershipId);
        try {
            const res = await fetch('/api/members', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({membershipId, role}),
            });
            if (res.ok) {
                await loadMembers();
                toast('역할이 변경되었습니다.');
            } else {
                const data = await res.json().catch(() => null);
                toast(data?.error ?? '역할 변경에 실패했습니다.', 'error');
            }
        } catch {
            toast('역할 변경에 실패했습니다.', 'error');
        } finally {
            setRoleSaving(null);
        }
    };

    const activeInvites = invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > new Date());
    const usedOrExpiredInvites = invites.filter((inv) => inv.usedAt || new Date(inv.expiresAt) <= new Date());
    const isGuest = !session?.user;
    const isOwner = session?.user?.role === 'owner';
    const isManager = isOwner || session?.user?.role === 'manager';
    const myUserId = session?.user?.id;

    if (isGuest) {
        return (
            <StyledContainer>
                <PageHero eyebrow="MEMBER" title="멤버 관리" subtitle="초대코드를 생성하고 매장 멤버를 관리합니다." />
                <StyledGuestCard>
                    <StyledGuestTitle>게스트 모드</StyledGuestTitle>
                    <StyledGuestDesc>
                        멤버 관리 기능은 로그인 후 이용할 수 있습니다.
                        매장 오너 또는 멤버 권한이 있는 계정으로 로그인하면
                        초대코드 생성, 멤버 조회 등의 기능을 사용할 수 있습니다.
                    </StyledGuestDesc>
                </StyledGuestCard>
            </StyledContainer>
        );
    }

    if (!isManager) {
        return (
            <StyledContainer>
                <PageHero eyebrow="MEMBER" title="멤버 관리" subtitle="초대코드를 생성하고 매장 멤버를 관리합니다." />
                <StyledSettingsHint>멤버 관리는 오너 또는 멤버만 가능합니다.</StyledSettingsHint>
            </StyledContainer>
        );
    }

    return (<>
        <StyledContainer>
            <PageHero eyebrow="MEMBER" title="멤버 관리" subtitle="초대코드를 생성하고 매장 멤버를 관리합니다." />

            <StyledSettingsCard>
                <StyledSettingsCardTitle>초대코드 생성</StyledSettingsCardTitle>
                <StyledCreateRow>
                    <StyledSelect
                        id="member-role"
                        aria-label="역할 선택"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                    >
                        {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </StyledSelect>
                    <StyledSaveBtn type="button" onClick={createInvite} disabled={creating}>
                        {creating ? '생성 중...' : '코드 생성'}
                    </StyledSaveBtn>
                </StyledCreateRow>
                <FieldError>{error}</FieldError>
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>사용 가능한 초대코드</StyledSettingsCardTitle>
                {activeInvites.length > 0 ? (
                    <StyledList>
                        {activeInvites.map((inv) => (
                            <StyledInviteItem key={inv.id}>
                                <StyledCodeBlock>
                                    <StyledCode>{inv.code}</StyledCode>
                                    <StyledBadge $tone={ROLE_TONE[inv.role] ?? 'neutral'}>{ROLE_LABELS[inv.role] ?? inv.role}</StyledBadge>
                                </StyledCodeBlock>
                                <StyledInviteActions>
                                    <StyledExpiry>{formatExpiry(inv.expiresAt)}</StyledExpiry>
                                    <CopyButton text={inv.code} />
                                    <StyledDeleteButton type="button" onClick={() => setDeleteTarget(inv.id)}>
                                        취소
                                    </StyledDeleteButton>
                                </StyledInviteActions>
                            </StyledInviteItem>
                        ))}
                    </StyledList>
                ) : (
                    <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                )}
            </StyledSettingsCard>

            <StyledSettingsCard>
                <StyledSettingsCardTitle>현재 멤버</StyledSettingsCardTitle>
                {members.length > 0 ? (
                    <StyledList>
                        {members.map((m) => {
                            const isSelf = m.user.id === myUserId;
                            const isTargetOwner = m.role === 'owner';
                            const canManage = isOwner && !isSelf && !isTargetOwner;
                            const saving = roleSaving === m.id;
                            return (
                                <StyledMemberItem key={m.id}>
                                    <StyledMemberInfo>
                                        <StyledMemberName>
                                            {m.user.nickname}
                                            {isSelf && <StyledSelfTag>나</StyledSelfTag>}
                                        </StyledMemberName>
                                        {m.user.email && <StyledMemberEmail>{m.user.email}</StyledMemberEmail>}
                                    </StyledMemberInfo>
                                    <StyledMemberActions>
                                        {canManage ? (
                                            <StyledRoleSelect
                                                value={m.role}
                                                disabled={saving}
                                                onChange={(e) => changeRole(m.id, e.target.value)}
                                                aria-label={`${m.user.nickname} 역할 변경`}
                                            >
                                                <option value="manager">멤버</option>
                                                <option value="staff">스태프</option>
                                            </StyledRoleSelect>
                                        ) : (
                                            <StyledBadge $tone={ROLE_TONE[m.role] ?? 'neutral'}>
                                                {ROLE_LABELS[m.role] ?? m.role}
                                            </StyledBadge>
                                        )}
                                        {canManage && (
                                            <StyledKickButton
                                                type="button"
                                                disabled={saving}
                                                onClick={() => setKickTarget(m)}
                                            >
                                                제거
                                            </StyledKickButton>
                                        )}
                                    </StyledMemberActions>
                                </StyledMemberItem>
                            );
                        })}
                    </StyledList>
                ) : (
                    <StyledEmpty>{EMPTY_TEXT}</StyledEmpty>
                )}
            </StyledSettingsCard>

            {usedOrExpiredInvites.length > 0 && (
                <StyledSettingsCard>
                    <StyledSettingsCardTitle>사용/만료된 코드</StyledSettingsCardTitle>
                    <StyledList>
                        {usedOrExpiredInvites.map((inv) => (
                            <StyledInviteItem key={inv.id} $dimmed>
                                <StyledCodeBlock>
                                    <StyledCode $dimmed>{inv.code}</StyledCode>
                                    <StyledBadge $tone={ROLE_TONE[inv.role] ?? 'neutral'}>{ROLE_LABELS[inv.role] ?? inv.role}</StyledBadge>
                                </StyledCodeBlock>
                                <StyledExpiry>
                                    {inv.usedAt
                                        ? `사용됨${inv.usedByUser ? ` (${inv.usedByUser.nickname})` : ''}`
                                        : '만료됨'}
                                </StyledExpiry>
                            </StyledInviteItem>
                        ))}
                    </StyledList>
                </StyledSettingsCard>
            )}
        </StyledContainer>

        {deleteTarget && (
            <StyledConfirmOverlay onClick={() => setDeleteTarget(null)}>
                <StyledConfirmModal onClick={(e) => e.stopPropagation()}>
                    <StyledHeader><h3>초대코드 취소</h3></StyledHeader>
                    <StyledConfirmText>초대코드를 취소하면 더 이상 사용할 수 없습니다. 계속하시겠습니까?</StyledConfirmText>
                    <StyledFooter>
                        <StyledActionButton type="button" onClick={() => setDeleteTarget(null)}>닫기</StyledActionButton>
                        <StyledActionButton type="button" $danger onClick={() => deleteInvite(deleteTarget)}>취소하기</StyledActionButton>
                    </StyledFooter>
                </StyledConfirmModal>
            </StyledConfirmOverlay>
        )}

        {kickTarget && (
            <StyledConfirmOverlay onClick={() => !kicking && setKickTarget(null)}>
                <StyledConfirmModal onClick={(e) => e.stopPropagation()}>
                    <StyledHeader><h3>멤버 제거</h3></StyledHeader>
                    <StyledConfirmText>
                        <strong>{kickTarget.user.nickname}</strong>님을 매장에서 제거하면
                        더 이상 이 매장에 접근할 수 없습니다. 계속하시겠습니까?
                    </StyledConfirmText>
                    <StyledFooter>
                        <StyledActionButton type="button" disabled={kicking} onClick={() => setKickTarget(null)}>
                            취소
                        </StyledActionButton>
                        <StyledActionButton type="button" $danger disabled={kicking} onClick={() => kickMember(kickTarget)}>
                            {kicking ? '제거 중...' : '제거하기'}
                        </StyledActionButton>
                    </StyledFooter>
                </StyledConfirmModal>
            </StyledConfirmOverlay>
        )}
    </>
    );
};

const StyledContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
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
    background: ${(p) => p.$dimmed ? 'var(--gray-color2)' : 'var(--brand-color-bg)'};
    border: 1px solid ${(p) => p.$dimmed ? 'var(--border-color)' : 'var(--brand-color-border)'};
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
    color: ${(p) => p.$dimmed ? 'var(--dark-gray-color2)' : 'var(--brand-color)'};
    user-select: all;
`;

const StyledBadge = styled(LabelBadge).attrs({
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

const StyledMemberInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const StyledMemberName = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledSelfTag = styled.span`
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: var(--chip-radius);
    background: var(--black-color-10);
    color: var(--dark-gray-color2);
`;

const StyledMemberActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 640px) {
        width: 100%;
        justify-content: flex-end;
    }
`;

const StyledMemberEmail = styled.span`
    font-size: 12px;
    color: var(--dark-gray-color2);
`;

const StyledRoleSelect = styled.select`
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    color: var(--dark-gray-color);
    font-size: 12px;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const StyledKickButton = styled.button`
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-md);
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 11px;
    font-weight: 600;
    transition: opacity 0.15s;

    &:disabled {
        opacity: 0.4;
        cursor: default;
    }

    @media (hover: hover) and (pointer: fine) {
        &:not(:disabled):hover {
            opacity: 0.8;
        }
    }
`;


const StyledGuestCard = styled.div`
    padding: 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
`;

const StyledGuestTitle = styled.h3`
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledGuestDesc = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--dark-gray-color2);
`;

const StyledConfirmText = styled.p`
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--dark-gray-color);
    line-height: 1.6;
`;
