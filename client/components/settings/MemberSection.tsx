import {useCallback, useEffect, useState} from 'react';

import {useSession} from 'next-auth/react';

import {LabelBadge, type LabelBadgeTone} from '../ui/LabelBadge';
import {PageHero} from '../ui/PageHero';
import {EMPTY_TEXT, StyledEmpty, StyledSettingsCard, StyledSettingsCardTitle, StyledSettingsHint, StyledSaveBtn, StyledSelect} from './settings-styles';
import {FieldError} from '../ui/FieldError';
import {StyledConfirmOverlay, StyledConfirmModal, StyledHeader, StyledHeaderTitle, StyledFooter, StyledActionButton} from '../calendar/overlays/ModalStyles';
import {useToastStore} from '../../store/toastStore';
import {
    StyledContainer,
    StyledCreateRow,
    StyledList,
    StyledInviteItem,
    StyledCodeBlock,
    StyledCode,
    StyledBadge,
    StyledInviteActions,
    StyledExpiry,
    StyledCopyButton,
    StyledDeleteButton,
    StyledMemberItem,
    StyledMemberInfo,
    StyledMemberName,
    StyledSelfTag,
    StyledMemberActions,
    StyledMemberEmail,
    StyledRoleSelect,
    StyledKickButton,
    StyledGuestCard,
    StyledGuestTitle,
    StyledGuestDesc,
    StyledConfirmText,
} from './MemberSection.styles';
import {ROLE_LABELS} from '../../utils/labels';

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
    {value: 'owner', label: '오너'},
    {value: 'staff', label: '멤버'},
] as const;

const ROLE_TONE: Record<string, LabelBadgeTone> = {
    owner: 'purple',
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

function buildInviteLink(code: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/login?invite=${code}`;
}

function CopyButton({text, label = '복사'}: {text: string; label?: string}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <StyledCopyButton type="button" onClick={handleCopy} aria-label={`${label} 복사`}>
            {copied ? '복사됨' : label}
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

    if (!isOwner) {
        return (
            <StyledContainer>
                <PageHero eyebrow="MEMBER" title="멤버 관리" subtitle="초대코드를 생성하고 매장 멤버를 관리합니다." />
                <StyledSettingsHint>멤버 관리는 오너만 가능합니다.</StyledSettingsHint>
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
                <StyledSettingsHint>
                    &lsquo;링크&rsquo;를 복사해 전달하면 받는 사람이 코드를 입력하지 않아도 자동으로 매장에 합류합니다.
                </StyledSettingsHint>
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
                                    <CopyButton text={inv.code} label="코드" />
                                    <CopyButton text={buildInviteLink(inv.code)} label="링크" />
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
                            const canManage = isOwner && !isSelf;
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
                                                {ROLE_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
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
                    <StyledHeader><StyledHeaderTitle>초대코드 취소</StyledHeaderTitle></StyledHeader>
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
                    <StyledHeader><StyledHeaderTitle>멤버 제거</StyledHeaderTitle></StyledHeader>
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
