import {useEffect, useMemo, useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';
import Link from 'next/link';

import {signOut, useSession} from 'next-auth/react';

import {AuthActionIcon} from '../components/ui/AuthActionIcon';
import {FieldError} from '../components/ui/FieldError';
import {PageHero} from '../components/ui/PageHero';
import {AccountDeleteModal} from '../components/account/AccountDeleteModal';
import {GuestNotice} from '../components/ui/GuestNotice';
import {CustomerDetail} from '../components/calendar/overlays/CustomerDetail';
import {ReservationDetail} from '../components/calendar/overlays/ReservationDetail';
import {useCalendarStore} from '../store/calendarStore';
import {auth} from '../auth';
import {prisma} from '../lib/prisma';

import {
    createDefaultLocalDbSnapshot,
    loadLocalDbSnapshot,
    saveLocalDbSnapshot,
    shouldUseLocalDb,
    subscribeLocalDb,
    type LocalDbSnapshot,
} from '../lib/local-db';
import {StyledEmptyCard, StyledEditBtn, StyledSaveBtn, StyledCancelBtn, StyledDeleteBtn, actionButtonStyle} from '../components/settings/settings-styles';
import {SeoHead} from '../components/ui/SeoHead';
import {
    StyledSection,
    StyledContainer,
    StyledCard,
    StyledCardTitle,
    StyledRow,
    StyledLabel,
    StyledValue,
    StyledButtonRow,
    StyledLogoutBtn,
    StyledGrid,
    StyledMetricLink,
    StyledResetBtn,
    StyledNicknameView,
    StyledNicknameBlock,
    StyledNicknameEditRow,
    StyledNicknameInput,
    StyledSuggestions,
    StyledSuggestionsLabel,
    StyledSuggestionList,
    StyledSuggestionChip,
} from '../components/mypage/mypage.styles';
import {PROVIDER_LABELS, ROLE_LABELS} from '../utils/labels';
import {CsFooter} from '../components/ui/CsFooter';

type MyPageProps = {
    linkedProviders: string[];
};

const MyPage: NextPage<MyPageProps> = ({linkedProviders}) => {
    const {data: session, status, update: updateSession} = useSession();
    const [isLocalMode, setIsLocalMode] = useState(false);
    const storeCustomerMap = useCalendarStore((s) => s.customerMap);
    const storeReservationMap = useCalendarStore((s) => s.reservationMap);
    const selectedCustomerId = useCalendarStore((s) => s.selectedCustomerId);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);
    const openReservationDetailFromCustomer = useCalendarStore((s) => s.openReservationDetailFromCustomer);
    const selectedReservationIds = useCalendarStore((s) => s.selectedReservations);
    const closeReservationDetail = useCalendarStore((s) => s.closeReservationDetail);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const restoreReservation = useCalendarStore((s) => s.restoreReservation);
    const deleteReservation = useCalendarStore((s) => s.deleteReservation);
    const storeHistory = useCalendarStore((s) => s.reservationHistory);
    const selectedReservations = useMemo(() => {
        const all = Object.values(storeReservationMap).flat();
        return selectedReservationIds
            .map((id) => all.find((r) => r.id === id) ?? null)
            .filter((r): r is NonNullable<typeof r> => r !== null);
    }, [selectedReservationIds, storeReservationMap]);
    const [localSnapshot, setLocalSnapshot] = useState<LocalDbSnapshot | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nicknameInput, setNicknameInput] = useState('');
    const [nicknameError, setNicknameError] = useState('');
    const [nicknameSuggestions, setNicknameSuggestions] = useState<string[]>([]);
    const [nicknameLoading, setNicknameLoading] = useState(false);

    useEffect(() => {
        const localMode = status !== 'authenticated' && shouldUseLocalDb();
        setIsLocalMode(localMode);

        if (localMode) {
            setLocalSnapshot(loadLocalDbSnapshot());
            return subscribeLocalDb(setLocalSnapshot);
        } else {
            setLocalSnapshot(null);
        }
    }, [status]);

    const effectiveLocalSnapshot = isLocalMode ? localSnapshot : null;
    const storageModeLabel = isLocalMode ? '게스트 회원' : '로그인 회원';

    const handleSaveNickname = async () => {
        const trimmed = nicknameInput.trim();
        if (trimmed.length < 2) {
            setNicknameError('닉네임은 2자 이상 입력해 주세요.');
            return;
        }
        setNicknameLoading(true);
        setNicknameError('');
        setNicknameSuggestions([]);

        try {
            const res = await fetch('/api/user/nickname', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({nickname: trimmed}),
            });
            const data = await res.json() as {nickname?: string; error?: string; suggestions?: string[]};

            if (res.status === 409) {
                setNicknameError('이미 사용 중인 닉네임입니다.');
                setNicknameSuggestions(data.suggestions ?? []);
                return;
            }

            if (!res.ok) {
                setNicknameError(data.error ?? '오류가 발생했습니다.');
                return;
            }

            await updateSession({name: trimmed});
            setIsEditingNickname(false);
        } catch {
            setNicknameError('네트워크 오류가 발생했습니다.');
        } finally {
            setNicknameLoading(false);
        }
    };

    const localSummary = useMemo(() => ({
        customers: effectiveLocalSnapshot?.customers.length ?? 0,
        reservations: effectiveLocalSnapshot?.reservations.length ?? 0,
        history: effectiveLocalSnapshot?.history.length ?? 0,
        services: effectiveLocalSnapshot?.services.length ?? 0,
        designers: effectiveLocalSnapshot?.designers.length ?? 0,
    }), [effectiveLocalSnapshot]);

    const resetGuestData = () => {
        saveLocalDbSnapshot(createDefaultLocalDbSnapshot());
        window.location.reload();
    };

    return (
        <StyledSection>
            <SeoHead title="계정 관리" />
            <StyledContainer>
                <PageHero eyebrow="MY PAGE" title="계정 관리" subtitle={storageModeLabel} />

                {isLocalMode && <GuestNotice />}

                <StyledCard>
                    <StyledCardTitle>사용 상태</StyledCardTitle>
                    <StyledRow>
                        <StyledLabel>세션 상태</StyledLabel>
                        <StyledValue>{{ authenticated: '로그인됨', unauthenticated: '미로그인', loading: '확인 중' }[status] ?? status}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel as="label" htmlFor="mypage-nickname">별명</StyledLabel>
                        {!isLocalMode && session?.user ? (
                            isEditingNickname ? (
                                <StyledNicknameBlock>
                                    <StyledNicknameEditRow>
                                        <StyledNicknameInput
                                            id="mypage-nickname"
                                            type="text"
                                            value={nicknameInput}
                                            onChange={(e) => {
                                                setNicknameInput(e.target.value);
                                                setNicknameError('');
                                                setNicknameSuggestions([]);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveNickname();
                                                if (e.key === 'Escape') {
                                                    setIsEditingNickname(false);
                                                    setNicknameError('');
                                                    setNicknameSuggestions([]);
                                                }
                                            }}
                                            placeholder="2~20자"
                                            autoFocus
                                            maxLength={20}
                                            disabled={nicknameLoading}
                                        />
                                        <StyledSaveBtn type="button" onClick={handleSaveNickname} disabled={nicknameLoading}>
                                            {nicknameLoading ? '...' : '저장'}
                                        </StyledSaveBtn>
                                        <StyledCancelBtn type="button" onClick={() => {
                                            setIsEditingNickname(false);
                                            setNicknameError('');
                                            setNicknameSuggestions([]);
                                        }}>
                                            취소
                                        </StyledCancelBtn>
                                    </StyledNicknameEditRow>
                                    <FieldError variant="inline">{nicknameError}</FieldError>
                                    {nicknameSuggestions.length > 0 && (
                                        <StyledSuggestions>
                                            <StyledSuggestionsLabel>추천 닉네임</StyledSuggestionsLabel>
                                            <StyledSuggestionList>
                                                {nicknameSuggestions.map((s) => (
                                                    <StyledSuggestionChip
                                                        key={s}
                                                        type="button"
                                                        onClick={() => {
                                                            setNicknameInput(s);
                                                            setNicknameError('');
                                                            setNicknameSuggestions([]);
                                                        }}
                                                    >
                                                        {s}
                                                    </StyledSuggestionChip>
                                                ))}
                                            </StyledSuggestionList>
                                        </StyledSuggestions>
                                    )}
                                </StyledNicknameBlock>
                            ) : (
                                <StyledNicknameView>
                                    <StyledValue>{session.user.name ?? '-'}</StyledValue>
                                    <StyledEditBtn
                                        type="button"
                                        onClick={() => {
                                            setNicknameInput(session.user?.name ?? '');
                                            setIsEditingNickname(true);
                                        }}
                                    >
                                        수정
                                    </StyledEditBtn>
                                </StyledNicknameView>
                            )
                        ) : (
                            <StyledValue>게스트</StyledValue>
                        )}
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>이메일</StyledLabel>
                        <StyledValue>{session?.user?.email ?? '-'}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>권한</StyledLabel>
                        <StyledValue>{session?.user?.role ? (ROLE_LABELS[session.user.role] ?? session.user.role) : '없음'}</StyledValue>
                    </StyledRow>
                </StyledCard>

                <StyledCard>
                    <StyledCardTitle>로그인 계정</StyledCardTitle>
                    {isLocalMode ? (
                        <StyledEmptyCard>연결된 SNS 계정이 없습니다. 설정 → SNS 연동에서 계정을 연결해 보세요.</StyledEmptyCard>
                    ) : (
                        <>
                            <StyledRow>
                                <StyledLabel>연결된 SNS</StyledLabel>
                                <StyledValue>
                                    {linkedProviders.length > 0
                                        ? linkedProviders.map((p) => PROVIDER_LABELS[p] ?? p).join(', ')
                                        : '-'}
                                </StyledValue>
                            </StyledRow>
                            {!!session?.user && (
                                <StyledButtonRow>
                                    <StyledLogoutBtn type="button" onClick={() => signOut({callbackUrl: '/login'})}>
                                        <AuthActionIcon direction="logout" />
                                        <span>로그아웃</span>
                                    </StyledLogoutBtn>
                                    <StyledDeleteBtn type="button" onClick={() => setShowDeleteModal(true)}>
                                        회원탈퇴
                                    </StyledDeleteBtn>
                                </StyledButtonRow>
                            )}
                        </>
                    )}
                </StyledCard>

                {isLocalMode && effectiveLocalSnapshot && (
                    <StyledCard>
                        <StyledCardTitle>게스트 저장 데이터</StyledCardTitle>
                        <StyledGrid>
                            <StyledMetricLink href="/address">
                                <strong className="value">{localSummary.customers}</strong>
                                <span className="label">고객</span>
                            </StyledMetricLink>
                            <StyledMetricLink href="/">
                                <strong className="value">{localSummary.reservations}</strong>
                                <span className="label">예약</span>
                            </StyledMetricLink>
                            <StyledMetricLink href="/">
                                <strong className="value">{localSummary.history}</strong>
                                <span className="label">이력</span>
                            </StyledMetricLink>
                            <StyledMetricLink href="/settings/service">
                                <strong className="value">{localSummary.services}</strong>
                                <span className="label">서비스</span>
                            </StyledMetricLink>
                            <StyledMetricLink href="/settings/designer">
                                <strong className="value">{localSummary.designers}</strong>
                                <span className="label">디자이너</span>
                            </StyledMetricLink>
                        </StyledGrid>
                        <StyledResetBtn type="button" onClick={resetGuestData}>
                            게스트 데이터 초기화
                        </StyledResetBtn>
                    </StyledCard>
                )}
                <CsFooter />
            </StyledContainer>
            {selectedReservations.map((reservation, index) => (
                <ReservationDetail key={`${reservation.id}-${index}`}
                                   reservation={reservation}
                                   customerMap={storeCustomerMap}
                                   reservationMap={storeReservationMap}
                                   history={storeHistory}
                                   onClose={() => closeReservationDetail(index)}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={updateReservation}
                                   onCancel={cancelReservation}
                                   onRestore={restoreReservation}
                                   onDelete={deleteReservation}/>
            ))}
            {showDeleteModal && (
                <AccountDeleteModal role={session?.user?.role}
                                    onClose={() => setShowDeleteModal(false)} />
            )}
            {selectedCustomerId !== null && storeCustomerMap[selectedCustomerId] && (
                <CustomerDetail customer={storeCustomerMap[selectedCustomerId]}
                                reservationMap={storeReservationMap}
                                onReservationClick={openReservationDetailFromCustomer}
                                onClose={() => setSelectedCustomerId(null)}/>
            )}
        </StyledSection>
    );
};

export default MyPage;

export const getServerSideProps: GetServerSideProps<MyPageProps> = async (ctx) => {
    const session = await auth(ctx);
    let linkedProviders: string[] = [];

    if (session?.user?.id) {
        const accounts = await prisma.authAccount.findMany({
            where: {userId: session.user.id},
            select: {provider: true},
            orderBy: {createdAt: 'asc'},
        });
        linkedProviders = accounts.map((a) => a.provider);
    }

    return {
        props: {
            linkedProviders,
        }
    };
};
