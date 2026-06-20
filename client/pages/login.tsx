import {useEffect, useState} from 'react';

import Link from 'next/link';
import {useRouter} from 'next/router';

import {signIn, signOut, useSession} from 'next-auth/react';

import type {GetServerSideProps} from 'next';

import styled from 'styled-components';

import {AuthActionIcon} from '../components/ui/AuthActionIcon';
import {AdBanner} from '../components/ad/AdBanner';
import {SeoHead} from '../components/ui/SeoHead';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {LoadingOverlay} from '../components/ui/LoadingOverlay';
import {getGuestTermsVersion, hasGuestData, markGuestEntryResolved} from '../lib/local-db';
import {CURRENT_TERMS_VERSION} from '../utils/terms';

type ProviderInfo = {id: string; label: string; bg: string; color: string; border: string};
type LoginPageProps = {
    providerIds: string[];
    isDatabaseConfigured: boolean;
    loginError: string | null;
};

function getMonthEntryPath(): string {
    const today = new Date();
    return `/month/${today.getFullYear()}/${today.getMonth() + 1}`;
}

const ALL_PROVIDERS: ProviderInfo[] = [
    {id: 'google', label: 'Google 로그인', bg: '#fff', color: '#333', border: '#ddd'},
    {id: 'kakao', label: '카카오 로그인', bg: '#FEE500', color: '#191919', border: '#FEE500'},
    {id: 'naver', label: '네이버 로그인', bg: '#03C75A', color: '#fff', border: '#03C75A'}
];

const ENV_KEYS: Record<string, string> = {
    google: 'AUTH_GOOGLE_ID',
    kakao: 'AUTH_KAKAO_ID',
    naver: 'AUTH_NAVER_ID'
};

const ERROR_MESSAGES: Record<string, string> = {
    'no-account': '등록된 계정이 없습니다. 초대코드를 입력한 후 로그인해 주세요.',
    'invalid-invite': '유효하지 않은 초대코드입니다.',
    'invite-used': '이미 사용된 초대코드입니다.',
    'invite-expired': '만료된 초대코드입니다.',
    'Configuration': '로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    'OAuthAccountNotLinked': '이미 다른 계정에 연결된 SNS입니다.',
    'sync-error': '계정 동기화 중 오류가 발생했습니다. 다시 시도해 주세요.',
};

// http(로컬) 환경에서는 secure 쿠키가 저장되지 않으므로 https일 때만 secure 부여
function secureFlag(): string {
    return typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; secure' : '';
}

function setInviteCookie(code: string) {
    document.cookie = `tas-invite-code=${encodeURIComponent(code)}; path=/; max-age=600; samesite=lax${secureFlag()}`;
}

function clearInviteCookie() {
    document.cookie = `tas-invite-code=; path=/; max-age=0; samesite=lax${secureFlag()}`;
}

// 카카오톡·인스타·네이버앱 등 인앱(WebView) 브라우저 감지.
// Google OAuth는 인앱 브라우저에서 'disallowed_useragent'로 차단되므로 안내가 필요.
function isInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /KAKAOTALK|Instagram|NAVER\(|; ?wv\)|Line\/|FBAN|FBAV|FB_IAB|Daum|everytimeApp|Threads|Snapchat/i.test(ua);
}

// 현재 페이지를 외부 브라우저(가능하면 크롬)에서 열도록 유도.
function openInExternalBrowser() {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const ua = navigator.userAgent || '';

    // 카카오톡 인앱: 전용 스킴으로 외부 브라우저 열기
    if (/KAKAOTALK/i.test(ua)) {
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
        return;
    }
    // 안드로이드: 크롬으로 강제 오픈(intent)
    if (/Android/i.test(ua)) {
        const noScheme = url.replace(/^https?:\/\//, '');
        window.location.href = `intent://${noScheme}#Intent;scheme=https;package=com.android.chrome;end`;
        return;
    }
    // iOS 등: 강제 불가 → 주소 복사 후 안내
    navigator.clipboard?.writeText(url).catch(() => {});
    alert('주소가 복사되었습니다.\nSafari 등 브라우저에 붙여넣어 접속해 주세요.');
}

export default function LoginPage({providerIds, isDatabaseConfigured, loginError}: LoginPageProps) {
    const {data: session, status} = useSession();
    const router = useRouter();
    const hasAccess = !!session?.user?.role && !!session.user?.storeId;
    const hasLoginError = session?.user?.loginError === 'no-account';
    const isAuthenticatedWithoutAccess = status === 'authenticated' && !hasAccess;
    const monthEntryPath = getMonthEntryPath();
    const [inviteCode, setInviteCode] = useState('');
    const [showGuestLoad, setShowGuestLoad] = useState(false);
    const [inApp, setInApp] = useState(false);

    // 인앱 브라우저 감지(마운트 후 1회) — SSR 하이드레이션 불일치 방지를 위해 effect에서 처리
    useEffect(() => {
        setInApp(isInAppBrowser());
    }, []);

    const authError = typeof router.query.error === 'string' ? router.query.error : null;

    // 초대 링크(/login?invite=CODE)로 진입 시 코드 자동 입력 + 쿠키 세팅
    // → 로그인 직후 OAuth 콜백에서 초대가 적용되어 새 매장이 아닌 초대 매장으로 가입됨
    useEffect(() => {
        const q = router.query.invite;
        const code = typeof q === 'string' ? q.trim().toUpperCase().slice(0, 6) : '';
        if (code) {
            setInviteCode(code);
            setInviteCookie(code);
        }
    }, [router.query.invite]);

    useEffect(() => {
        if (!authError && hasAccess) {
            router.replace(monthEntryPath);
            return;
        }
        if (authError && status === 'authenticated') {
            router.replace(`/settings/sns?error=${authError}`);
        }
    }, [hasAccess, monthEntryPath, router, authError, status]);

    if (hasAccess && !authError) {
        return null;
    }

    const filteredProviders = ALL_PROVIDERS.filter((p) => providerIds.includes(p.id));
    // 인앱 브라우저에선 카카오 로그인이 가장 안정적이므로 맨 위로 노출
    const providers = inApp
        ? [...filteredProviders].sort((a, b) => Number(b.id === 'kakao') - Number(a.id === 'kakao'))
        : filteredProviders;
    const canStartLogin = providers.length > 0;
    const displayError = authError ?? loginError ?? (hasLoginError ? 'no-account' : null);

    const startProviderLogin = (providerId: string) => {
        const trimmedCode = inviteCode.trim().toUpperCase();
        if (trimmedCode) {
            setInviteCookie(trimmedCode);
        } else {
            clearInviteCookie();
        }
        void signIn(providerId, {callbackUrl: monthEntryPath});
    };

    const startGuest = () => {
        if (hasGuestData()) {
            setShowGuestLoad(true);
            return;
        }
        // 데이터 없음 → (미동의면) 약관 동의 먼저, 그다음 온보딩
        markGuestEntryResolved();
        if (getGuestTermsVersion() !== CURRENT_TERMS_VERSION) {
            router.push('/consent/onboarding/guest');
        } else {
            router.push('/onboarding/guest');
        }
    };

    return (
        <StyledWrapper>
            <SeoHead title="로그인" />
            {status === 'loading' && (
                <LoadingOverlay backdrop="blur" boxed size={30} zIndex={100} text="로그인 상태 확인 중" />
            )}
            <StyledCard>
                <StyledTitle>
                    <StyledBrandLink href="/" aria-label="홈으로 이동">
                        <StyledBrandLogo src="/logo/logo-black.svg" alt="TAS" />
                    </StyledBrandLink>
                </StyledTitle>
                <StyledSubtitle>SNS 계정으로 로그인</StyledSubtitle>
                {inApp && (
                    <StyledInAppNotice>
                        <StyledInAppTitle>📱 인앱 브라우저로 접속 중이에요</StyledInAppTitle>
                        <StyledInAppText>
                            구글 로그인은 보안 정책상 인앱 브라우저에서 차단됩니다.{' '}
                            <b>카카오 로그인</b>을 이용하시거나, 아래 버튼으로 외부 브라우저에서 열어 주세요.
                        </StyledInAppText>
                        <StyledInAppButton type="button" onClick={openInExternalBrowser}>
                            외부 브라우저로 열기
                        </StyledInAppButton>
                    </StyledInAppNotice>
                )}
                {displayError && ERROR_MESSAGES[displayError] && (
                    <StyledLoginError>
                        <StyledLoginErrorText>{ERROR_MESSAGES[displayError]}</StyledLoginErrorText>
                    </StyledLoginError>
                )}
                <StyledInviteSection>
                    <StyledInviteLabel htmlFor="invite-code">초대코드 (신규 등록 시)</StyledInviteLabel>
                    <StyledInviteInput
                        id="invite-code"
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="6자리 코드 입력"
                        maxLength={6}
                        autoComplete="off"
                    />
                </StyledInviteSection>
                {canStartLogin ? (
                    <StyledButtonGroup>
                        {providers.map((p) => (
                            <StyledButton
                                key={p.id}
                                type="button"
                                $bg={p.bg}
                                $color={p.color}
                                $border={p.border}
                                onClick={() => startProviderLogin(p.id)}
                            >
                                <AuthActionIcon direction="login" />
                                <span>{p.label}</span>
                            </StyledButton>
                        ))}
                    </StyledButtonGroup>
                ) : (
                    <StyledEmptyState>
                        로그인 제공자가 설정되지 않았습니다. `AUTH_*` 환경변수를 확인해 주세요.
                    </StyledEmptyState>
                )}
                <StyledSecondaryButton type="button" onClick={startGuest}>
                    <span>게스트로 사용하기</span>
                </StyledSecondaryButton>
                {!isDatabaseConfigured && (
                    <StyledNotice>
                        현재 `DATABASE_URL`이 설정되지 않아 로그인 후 권한 연결이 완료되지 않을 수 있습니다.
                    </StyledNotice>
                )}
                {isAuthenticatedWithoutAccess && !hasLoginError && (
                    <StyledNotice>
                        현재 계정에는 연결된 매장 권한이 없습니다. 관리자에게 초대코드를 요청하세요.
                    </StyledNotice>
                )}
                {isAuthenticatedWithoutAccess && (
                    <StyledSecondaryButton type="button" onClick={() => signOut({callbackUrl: '/login'})}>
                        <AuthActionIcon direction="login" />
                        <span>다른 계정으로 로그인</span>
                    </StyledSecondaryButton>
                )}
            </StyledCard>
            <StyledAuthAd>
                <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_AUTH_SLOT ?? ''} adFormat="horizontal" />
            </StyledAuthAd>
            {showGuestLoad && (
                <ConfirmDialog
                    title="이전 데이터 불러오기"
                    message="게스트모드 데이터가 있습니다. 이전 데이터를 불러오시겠습니까?"
                    confirmLabel="예"
                    cancelLabel="아니오"
                    showCloseButton={false}
                    layerKey="guest-load"
                    onConfirm={() => {
                        markGuestEntryResolved();
                        setShowGuestLoad(false);
                        // 불러오기: 약관 미동의면 동의 먼저
                        if (getGuestTermsVersion() !== CURRENT_TERMS_VERSION) {
                            router.replace(`/consent${monthEntryPath}`);
                        } else {
                            router.replace(monthEntryPath);
                        }
                    }}
                    onClose={() => {
                        // 아니오: (미동의면) 약관 동의 먼저 → 새 온보딩 (완료 시 기존 로컬데이터 폐기)
                        markGuestEntryResolved();
                        setShowGuestLoad(false);
                        const dest = '/onboarding/guest?fresh=1';
                        if (getGuestTermsVersion() !== CURRENT_TERMS_VERSION) {
                            router.push(`/consent${dest}`);
                        } else {
                            router.push(dest);
                        }
                    }}
                />
            )}
        </StyledWrapper>
    );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const providerIds = ALL_PROVIDERS
        .filter((p) => {
            const val = process.env[ENV_KEYS[p.id]];
            return val && !val.startsWith('REPLACE');
        })
        .map((p) => p.id);

    return {
        props: {
            providerIds,
            isDatabaseConfigured: !!process.env.DATABASE_URL,
            loginError: typeof ctx.query.error === 'string' ? ctx.query.error : null,
        }
    };
};

const StyledWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-height: 100%;
    padding: 10px;
    box-sizing: border-box;

    /* 모바일: 풀블리드(좌우 여백 제거). 흰 배경이라 박스 없이도 풀스크린처럼 보임 */
    @media (max-width: 640px) {
        padding: 0;
    }
`;

const StyledAuthAd = styled.div`
    width: 100%;
    max-width: 360px;
    flex-shrink: 0;

    /* 모바일: 카드 폭에 맞춰 가로 꽉 + 좌우 인셋(카드 본문과 정렬) */
    @media (max-width: 640px) {
        max-width: none;
        padding: 0 20px;
        box-sizing: border-box;
    }
`;

const StyledCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: auto 0;
    padding: 40px 30px;
    background-color: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    width: 100%;
    max-width: 360px;
    box-sizing: border-box;

    /* 모바일: 박스 디자인(그림자·라운드·고정폭) 제거 — 흰 배경에 녹아들어 풀스크린처럼 */
    @media (max-width: 640px) {
        max-width: none;
        border-radius: 0;
        box-shadow: none;
        padding: 32px 20px;
    }
`;

const StyledTitle = styled.h1`
    margin: 0 0 8px;
`;

const StyledBrandLink = styled(Link)`
    display: inline-block;
    line-height: 0;
`;

const StyledBrandLogo = styled.img`
    height: 88px;
    width: auto;
    display: block;
`;

const StyledSubtitle = styled.p`
    font-size: var(--font);
    color: var(--dark-gray-color2);
    margin: 0 0 30px;
`;

const StyledInviteSection = styled.div`
    width: 100%;
    margin-bottom: 20px;
`;

const StyledInviteLabel = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color2);
    margin-bottom: 6px;
`;

const StyledInviteInput = styled.input`
    width: 100%;
    padding: 10px 14px;
    box-sizing: border-box;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 4px;
    text-align: center;
    text-transform: uppercase;
    outline: none;

    &:focus {
        border-color: #2d7ff9;
        box-shadow: 0 0 0 2px rgba(45, 127, 249, 0.15);
    }

    &::placeholder {
        letter-spacing: normal;
        font-weight: 400;
        font-size: 14px;
    }
`;

const StyledInAppNotice = styled.div`
    width: 100%;
    margin: 0 0 16px;
    padding: 12px 14px;
    box-sizing: border-box;
    border: 1px solid #fde68a;
    border-radius: 10px;
    background: #fffbeb;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StyledInAppTitle = styled.strong`
    font-size: 13px;
    font-weight: 700;
    color: #92400e;
`;

const StyledInAppText = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: #92400e;

    b {
        font-weight: 700;
    }
`;

const StyledInAppButton = styled.button`
    align-self: flex-start;
    margin-top: 2px;
    padding: 8px 14px;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    background: #f59e0b;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover { opacity: 0.9; }
    }
`;

const StyledButtonGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
`;

const StyledEmptyState = styled.p`
    width: 100%;
    margin: 0;
    padding: 10px 8px;
    box-sizing: border-box;
    border: 1px solid var(--light-gray-color);
    border-radius: 10px;
    background: #f8fafc;
    color: var(--dark-gray-color2);
    font-size: 13px;
    line-height: 1.6;
    text-align: center;
`;

const StyledNotice = styled.p`
    width: 100%;
    margin: 16px 0 0;
    padding: 10px 8px;
    box-sizing: border-box;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff1f2;
    color: #9f1239;
    font-size: 13px;
    line-height: 1.6;
    text-align: center;
`;

const StyledButton = styled.button<{ $bg: string; $color: string; $border: string }>`
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid ${(props) => props.$border};
    background-color: ${(props) => props.$bg};
    color: ${(props) => props.$color};
    font-size: 15px;
    font-weight: 600;
    transition: opacity 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
        opacity: 0.85;
    }
    }
`;

const StyledLoginError = styled.div`
    width: 100%;
    margin: 0 0 16px;
    padding: 10px 8px;
    box-sizing: border-box;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff1f2;
    text-align: center;
`;

const StyledLoginErrorText = styled.strong`
    display: block;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
    color: #9f1239;
`;

const StyledSecondaryButton = styled.button`
    width: 100%;
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--light-gray-color);
    background-color: var(--white-color);
    color: var(--black-color);
    font-size: 14px;
    font-weight: 600;
`;

