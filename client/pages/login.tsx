import {useEffect, useState} from 'react';

import {useRouter} from 'next/router';

import {signIn, signOut, useSession} from 'next-auth/react';

import type {GetServerSideProps} from 'next';

import styled from 'styled-components';

import {AuthActionIcon} from '../components/ui/AuthActionIcon';

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
};

function setInviteCookie(code: string) {
    document.cookie = `tas-invite-code=${encodeURIComponent(code)}; path=/; max-age=600; samesite=lax; secure`;
}

function clearInviteCookie() {
    document.cookie = 'tas-invite-code=; path=/; max-age=0; samesite=lax; secure';
}

export default function LoginPage({providerIds, isDatabaseConfigured, loginError}: LoginPageProps) {
    const {data: session, status} = useSession();
    const router = useRouter();
    const hasAccess = !!session?.user?.role && !!session.user?.storeId;
    const hasLoginError = session?.user?.loginError === 'no-account';
    const isAuthenticatedWithoutAccess = status === 'authenticated' && !hasAccess;
    const monthEntryPath = getMonthEntryPath();
    const [inviteCode, setInviteCode] = useState('');

    useEffect(() => {
        if (hasAccess) {
            router.replace(monthEntryPath);
        }
    }, [hasAccess, monthEntryPath, router]);

    if (hasAccess) {
        return null;
    }

    const providers = ALL_PROVIDERS.filter((p) => providerIds.includes(p.id));
    const canStartLogin = providers.length > 0;
    const displayError = loginError ?? (hasLoginError ? 'no-account' : null);

    const startProviderLogin = (providerId: string) => {
        const trimmedCode = inviteCode.trim().toUpperCase();
        if (trimmedCode) {
            setInviteCookie(trimmedCode);
        } else {
            clearInviteCookie();
        }
        void signIn(providerId, {callbackUrl: monthEntryPath});
    };

    return (
        <StyledWrapper>
            <StyledCard>
                <StyledTitle>TAS</StyledTitle>
                <StyledSubtitle>SNS 계정으로 로그인</StyledSubtitle>
                {displayError && ERROR_MESSAGES[displayError] && (
                    <StyledLoginError>
                        <strong>{ERROR_MESSAGES[displayError]}</strong>
                    </StyledLoginError>
                )}
                <StyledInviteSection>
                    <StyledInviteLabel>초대코드 (신규 등록 시)</StyledInviteLabel>
                    <StyledInviteInput
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
                        {status === 'loading' && (
                            <StyledLoadingRow>
                                <StyledSpinner aria-hidden="true"/>
                                <span>로그인 상태 확인 중</span>
                            </StyledLoadingRow>
                        )}
                    </StyledButtonGroup>
                ) : (
                    <StyledEmptyState>
                        로그인 제공자가 설정되지 않았습니다. `AUTH_*` 환경변수를 확인해 주세요.
                    </StyledEmptyState>
                )}
                <StyledSecondaryButton type="button" onClick={() => router.push('/')}>
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
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 10px;
    box-sizing: border-box;
`;

const StyledCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 30px;
    background-color: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    width: 100%;
    max-width: 360px;

    @media (max-width: 640px) {
        padding: 32px 20px;
    }
`;

const StyledTitle = styled.h1`
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--black-color);
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

const StyledButtonGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
`;

const StyledLoadingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 4px;
    color: var(--dark-gray-color2);
    font-size: 13px;
`;

const StyledSpinner = styled.span`
    width: 16px;
    height: 16px;
    border: 2px solid #dbe7ff;
    border-top-color: #2d7ff9;
    border-radius: 50%;
    animation: loginSpin 0.8s linear infinite;

    @keyframes loginSpin {
        to {
            transform: rotate(360deg);
        }
    }
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

    strong {
        display: block;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.5;
        color: #9f1239;
    }
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
