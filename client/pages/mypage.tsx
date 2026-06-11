import {useEffect, useMemo, useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';
import Link from 'next/link';

import {signIn, signOut, useSession} from 'next-auth/react';

import styled from 'styled-components';

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

const PROVIDER_LABELS: Record<string, string> = {
    google: 'Google',
    kakao: 'Kakao',
    naver: 'Naver',
};

const ROLE_LABELS: Record<string, string> = {
    owner: '오너',
    staff: '멤버',
};

type MyPageProps = {
    linkedProviders: string[];
};

const MyPage: NextPage<MyPageProps> = ({linkedProviders}) => {
    const linkedProvider = linkedProviders[0] ?? null;
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

                {!!session?.user && (
                    <StyledCard>
                        <StyledCardTitle>네이버 예약 연동</StyledCardTitle>
                        {linkedProvider === 'google' ? (
                            <>
                                <StyledSyncStatus $connected>
                                    <StyledSyncDot />
                                    Gmail 연동 활성화됨 — 네이버 예약 자동 동기화 중
                                </StyledSyncStatus>
                                <StyledHint>
                                    네이버 스마트플레이스에서 예약 알림 이메일을 이 Google 계정({session.user.email})으로 설정하면 예약이 자동으로 등록됩니다.
                                </StyledHint>
                                <StyledStepList>
                                    <li className="step">
                                        <strong className="step-em">네이버 스마트플레이스</strong> 접속 → 예약 관리 → 알림 설정
                                    </li>
                                    <li className="step">
                                        이메일 알림 주소를 <strong className="step-em">{session.user.email}</strong> 로 설정
                                    </li>
                                    <li className="step">
                                        이후 예약/취소 발생 시 앱 상단 🔔 아이콘에서 확인 가능
                                    </li>
                                    <li className="step">
                                        등록되지 않은 서비스명은 <strong className="step-em">자동으로 서비스에 추가</strong>됩니다
                                    </li>
                                </StyledStepList>
                            </>
                        ) : (
                            <>
                                <StyledSyncStatus $connected={false}>
                                    <StyledSyncDot />
                                    Gmail 미연동 — Google 계정으로 로그인해야 활성화됩니다
                                </StyledSyncStatus>
                                <StyledHint>
                                    네이버 예약 자동 동기화는 Gmail 읽기 권한이 필요합니다. 아래 버튼으로 Google 계정을 연결하세요.
                                </StyledHint>
                                <StyledStepList>
                                    <li className="step">
                                        <strong className="step-em">네이버 스마트플레이스</strong> → 예약 관리 → 알림 설정에서 Gmail 주소 등록
                                    </li>
                                    <li className="step">
                                        아래 버튼으로 Google 계정 로그인 (Gmail 읽기 권한 허용)
                                    </li>
                                    <li className="step">
                                        이후 예약/취소 발생 시 앱 상단 🔔 에서 자동 확인 가능
                                    </li>
                                    <li className="step">
                                        등록되지 않은 서비스명은 <strong className="step-em">자동으로 서비스에 추가</strong>됩니다
                                    </li>
                                </StyledStepList>
                                <StyledButtonRow>
                                    <StyledGoogleButton type="button" onClick={() => signIn('google')}>
                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                                            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                                        </svg>
                                        <span>Google로 연결하기</span>
                                    </StyledGoogleButton>
                                </StyledButtonRow>
                            </>
                        )}
                    </StyledCard>
                )}

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
                <StyledFooterCs>Take a seat CS: <a className="link" href="mailto:takeaseat.cs@gmail.com">takeaseat.cs@gmail.com</a></StyledFooterCs>
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
                                   onRestore={restoreReservation}/>
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

const StyledSection = styled.section`
    flex: 1;
    box-sizing: border-box;
`;

const StyledContainer = styled.div`
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 8px;
    box-sizing: border-box;
`;


const StyledCard = styled.div`
    margin-top: 8px;
    padding: 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--card-radius);
    background: var(--white-color);
    box-shadow: var(--shadow-sm);
`;

const StyledCardTitle = styled.h2`
    margin: 0 0 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid var(--black-color-10);

    &:first-of-type {
        border-top: none;
        padding-top: 0;
    }
`;

const StyledLabel = styled.span`
    font-size: 13px;
    color: var(--dark-gray-color2);
`;

const StyledValue = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: var(--black-color);
    text-align: right;
    word-break: break-word;
`;

const StyledButtonRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
`;

const StyledLogoutBtn = styled.button`
    ${actionButtonStyle};
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--light-gray-color);
    background: var(--black-color);
    color: var(--white-color);
`;

const StyledGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
`;

const StyledMetricLink = styled(Link)`
    display: block;
    padding: 14px 10px;
    border-radius: var(--radius-lg);
    background: var(--gray-color2);
    text-align: center;
    text-decoration: none;
    transition: background 0.15s;

    .value {
        display: block;
        font-size: 22px;
        color: var(--black-color);
    }

    .label {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: var(--dark-gray-color2);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover { background: var(--light-gray-color); }
    }
`;

const StyledHint = styled.p`
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--dark-gray-color2);
    line-height: 1.6;
`;

const StyledResetBtn = styled(StyledDeleteBtn)`
    margin-top: 14px;
`;

const StyledSyncStatus = styled.div<{$connected: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    background: ${(p) => p.$connected ? 'rgba(36,117,58,0.07)' : 'rgba(168,132,23,0.07)'};
    color: ${(p) => p.$connected ? 'var(--success-color)' : 'var(--caution-color)'};
    border: 1px solid ${(p) => p.$connected ? 'rgba(36,117,58,0.2)' : 'rgba(168,132,23,0.2)'};
`;

const StyledSyncDot = styled.span`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
`;

const StyledStepList = styled.ol`
    margin: 12px 0 0;
    padding: 0 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;

    .step {
        font-size: 13px;
        color: var(--dark-gray-color);
        line-height: 1.55;
    }

    .step-em {
        font-weight: 600;
        color: var(--black-color);
    }
`;

const StyledGoogleButton = styled.button`
    ${actionButtonStyle};
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--light-gray-color);
    background: var(--white-color);
    color: var(--black-color);
`;


const StyledNicknameView = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledNicknameBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    align-items: flex-end;
`;


const StyledNicknameEditRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    justify-content: flex-end;
`;

const StyledNicknameInput = styled.input`
    width: 140px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--brand-color);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--black-color);
    outline: none;
    box-sizing: border-box;

    &:disabled { opacity: 0.6; }
`;



const StyledSuggestions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
    width: 100%;
`;

const StyledSuggestionsLabel = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
`;

const StyledSuggestionList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
`;

const StyledSuggestionChip = styled.button`
    padding: 3px 10px;
    border: 1px solid var(--light-gray-color);
    border-radius: 999px;
    background: var(--gray-color2);
    font-size: 12px;
    color: var(--dark-gray-color);
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--brand-color);
            color: var(--brand-color);
            background: var(--brand-color-bg);
        }
    }
`;

const StyledFooterCs = styled.p`
    margin: auto 0 0;
    padding: 24px 0 0;
    text-align: center;
    font-size: 12px;
    color: var(--dark-gray-color2);

    .link {
        color: inherit;
        text-decoration: none;
        font-weight: 600;

        @media (hover: hover) and (pointer: fine) {
            &:hover { text-decoration: underline; }
        }
    }
`;
