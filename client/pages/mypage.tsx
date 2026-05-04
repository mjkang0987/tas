import {useEffect, useMemo, useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';

import {signIn, signOut, useSession} from 'next-auth/react';

import styled from 'styled-components';

import {AuthActionIcon} from '../components/ui/AuthActionIcon';

import {
    createDefaultLocalDbSnapshot,
    loadLocalDbSnapshot,
    saveLocalDbSnapshot,
    shouldUseLocalDb,
    subscribeLocalDb,
    type LocalDbSnapshot,
} from '../lib/local-db';

type ProviderInfo = {
    id: string;
    label: string;
    accent: string;
    tint: string;
    border: string;
};

type MyPageProps = {
    providerIds: string[];
};

const ALL_PROVIDERS: ProviderInfo[] = [
    {id: 'google', label: 'Google', accent: '#4285F4', tint: '#EEF4FF', border: '#B9D2FF'},
    {id: 'kakao', label: 'Kakao', accent: '#FEE500', tint: '#FFF9CC', border: '#F4DD63'},
    {id: 'naver', label: 'Naver', accent: '#03C75A', tint: '#ECFFF4', border: '#95E2B8'},
];

const ENV_KEYS: Record<string, string> = {
    google: 'AUTH_GOOGLE_ID',
    kakao: 'AUTH_KAKAO_ID',
    naver: 'AUTH_NAVER_ID',
};

const MyPage: NextPage<MyPageProps> = ({providerIds}) => {
    const {data: session, status} = useSession();
    const isLocalMode = shouldUseLocalDb();
    const [localSnapshot, setLocalSnapshot] = useState<LocalDbSnapshot | null>(() => (
        isLocalMode ? loadLocalDbSnapshot() : null
    ));

    useEffect(() => {
        if (!isLocalMode) {
            return;
        }

        return subscribeLocalDb(setLocalSnapshot);
    }, [isLocalMode, status]);

    const effectiveLocalSnapshot = isLocalMode ? localSnapshot : null;
    const storageModeLabel = isLocalMode ? '게스트 로컬 저장 모드' : '로그인 계정 모드';
    const connectedProvider = session?.user?.provider ?? '';
    const availableProviders = ALL_PROVIDERS.filter((provider) => providerIds.includes(provider.id));

    const localSummary = useMemo(() => ({
        customers: effectiveLocalSnapshot?.customers.length ?? 0,
        reservations: effectiveLocalSnapshot?.reservations.length ?? 0,
        history: effectiveLocalSnapshot?.history.length ?? 0,
        services: effectiveLocalSnapshot?.services.length ?? 0,
        designers: effectiveLocalSnapshot?.designers.length ?? 0,
    }), [effectiveLocalSnapshot]);

    const resetGuestData = () => {
        saveLocalDbSnapshot(createDefaultLocalDbSnapshot());
    };

    return (
        <StyledSection>
            <StyledContainer>
                <StyledHero>
                    <StyledEyebrow>MY PAGE</StyledEyebrow>
                    <StyledTitle>내 정보</StyledTitle>
                    <StyledSubtitle>{storageModeLabel}</StyledSubtitle>
                </StyledHero>

                <StyledCard>
                    <StyledCardTitle>사용 상태</StyledCardTitle>
                    <StyledRow>
                        <StyledLabel>세션 상태</StyledLabel>
                        <StyledValue>{status}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>이름</StyledLabel>
                        <StyledValue>{session?.user?.name ?? '게스트'}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>이메일</StyledLabel>
                        <StyledValue>{session?.user?.email ?? '-'}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>권한</StyledLabel>
                        <StyledValue>{session?.user?.role ?? '없음'}</StyledValue>
                    </StyledRow>
                    <StyledRow>
                        <StyledLabel>매장 ID</StyledLabel>
                        <StyledValue>{session?.user?.storeId ?? '-'}</StyledValue>
                    </StyledRow>
                </StyledCard>

                <StyledCard>
                    <StyledCardTitle>SNS 연동</StyledCardTitle>
                    <StyledButtonRow>
                        {availableProviders.map((provider) => {
                            const isConnected = connectedProvider === provider.id;

                            return (
                                <StyledProviderButton
                                    key={provider.id}
                                    type="button"
                                    $accent={provider.accent}
                                    $tint={provider.tint}
                                    $border={provider.border}
                                    $connected={isConnected}
                                    onClick={() => {
                                        if (isConnected) return;
                                        void signIn(provider.id, {callbackUrl: '/mypage'});
                                    }}
                                >
                                    <span>{provider.label}</span>
                                    <strong>{isConnected ? '연동완료' : '연동하기'}</strong>
                                </StyledProviderButton>
                            );
                        })}
                        {availableProviders.length === 0 && (
                            <StyledHint>
                                현재 설정된 SNS 로그인 제공자가 없습니다.
                            </StyledHint>
                        )}
                    </StyledButtonRow>
                    {!!session?.user && (
                        <StyledButtonRow>
                            <StyledActionButton type="button" onClick={() => signOut({callbackUrl: '/login'})}>
                                <AuthActionIcon direction="logout" />
                                <span>로그아웃</span>
                            </StyledActionButton>
                        </StyledButtonRow>
                    )}
                </StyledCard>

                {isLocalMode && effectiveLocalSnapshot && (
                    <StyledCard>
                        <StyledCardTitle>게스트 저장 데이터</StyledCardTitle>
                        <StyledGrid>
                            <StyledMetric>
                                <strong>{localSummary.customers}</strong>
                                <span>고객</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.reservations}</strong>
                                <span>예약</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.history}</strong>
                                <span>이력</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.services}</strong>
                                <span>서비스</span>
                            </StyledMetric>
                            <StyledMetric>
                                <strong>{localSummary.designers}</strong>
                                <span>디자이너</span>
                            </StyledMetric>
                        </StyledGrid>
                        <StyledHint>
                            게스트 모드 데이터는 현재 브라우저의 `localStorage`에만 저장됩니다.
                        </StyledHint>
                        <StyledDangerButton type="button" onClick={resetGuestData}>
                            게스트 데이터 초기화
                        </StyledDangerButton>
                    </StyledCard>
                )}
            </StyledContainer>
        </StyledSection>
    );
};

export default MyPage;

export const getServerSideProps: GetServerSideProps<MyPageProps> = async () => {
    const providerIds = ALL_PROVIDERS
        .filter((provider) => {
            const envKey = ENV_KEYS[provider.id];
            const value = process.env[envKey];
            return value && !value.startsWith('REPLACE');
        })
        .map((provider) => provider.id);

    return {
        props: {
            providerIds,
        }
    };
};

const StyledSection = styled.section`
    flex: 1;
    overflow-y: auto;
    box-sizing: border-box;
    background:
        radial-gradient(circle at top left, rgba(45, 127, 249, 0.12), transparent 32%),
        linear-gradient(180deg, #f8fbff 0%, #ffffff 52%);
`;

const StyledContainer = styled.div`
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    padding: 28px 16px 48px;
    box-sizing: border-box;
`;

const StyledHero = styled.div`
    margin-bottom: 18px;
`;

const StyledEyebrow = styled.p`
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #2d7ff9;
`;

const StyledTitle = styled.h1`
    margin: 0;
    font-size: 32px;
    line-height: 1.1;
    color: #111827;
`;

const StyledSubtitle = styled.p`
    margin: 10px 0 0;
    color: #4b5563;
    font-size: 15px;
`;

const StyledCard = styled.div`
    margin-top: 14px;
    padding: 20px;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
`;

const StyledCardTitle = styled.h2`
    margin: 0 0 14px;
    font-size: 18px;
    color: #111827;
`;

const StyledRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid #f1f5f9;

    &:first-of-type {
        border-top: none;
        padding-top: 0;
    }
`;

const StyledLabel = styled.span`
    color: #6b7280;
    font-size: 14px;
`;

const StyledValue = styled.span`
    color: #111827;
    font-size: 14px;
    font-weight: 600;
    text-align: right;
    word-break: break-word;
`;

const StyledButtonRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
`;

const buttonLikeStyle = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 140px;
    height: 42px;
    padding: 0 16px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    box-sizing: border-box;
`;

const StyledActionButton = styled.button`
    ${buttonLikeStyle}
    border: none;
    background: #111827;
    color: #fff;
`;

const StyledProviderButton = styled.button<{
    $accent: string;
    $tint: string;
    $border: string;
    $connected: boolean;
}>`
    ${buttonLikeStyle}
    min-width: 180px;
    justify-content: space-between;
    border: 1px solid ${(props) => props.$connected ? props.$accent : props.$border};
    background: ${(props) => props.$connected ? props.$accent : props.$tint};
    color: ${(props) => {
        if (!props.$connected) return '#111827';
        return props.$accent === '#FEE500' ? '#3B2F00' : '#ffffff';
    }};

    strong {
        font-size: 12px;
        color: ${(props) => {
            if (!props.$connected) return props.$accent;
            return props.$accent === '#FEE500' ? '#5F4B00' : 'rgba(255, 255, 255, 0.88)';
        }};
    }
`;

const StyledGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;
`;

const StyledMetric = styled.div`
    padding: 16px 12px;
    border-radius: 14px;
    background: #f8fafc;
    text-align: center;

    strong {
        display: block;
        font-size: 24px;
        color: #111827;
    }

    span {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        color: #6b7280;
    }
`;

const StyledHint = styled.p`
    margin: 14px 0 0;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.6;
`;

const StyledDangerButton = styled.button`
    margin-top: 14px;
    ${buttonLikeStyle}
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #be123c;
`;
