import {useEffect} from 'react';

import {useRouter} from 'next/router';

import {signIn, useSession} from 'next-auth/react';

import type {GetServerSideProps} from 'next';

import styled from 'styled-components';

type ProviderInfo = {id: string; label: string; bg: string; color: string; border: string};

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

export default function LoginPage({providerIds}: {providerIds: string[]}) {
    const {status} = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace('/');
        }
    }, [status, router]);

    if (status === 'loading' || status === 'authenticated') {
        return null;
    }

    const providers = ALL_PROVIDERS.filter((p) => providerIds.includes(p.id));

    return (
        <StyledWrapper>
            <StyledCard>
                <StyledTitle>Chairtime</StyledTitle>
                <StyledSubtitle>SNS 계정으로 로그인</StyledSubtitle>
                <StyledButtonGroup>
                    {providers.map((p) => (
                        <StyledButton
                            key={p.id}
                            type="button"
                            $bg={p.bg}
                            $color={p.color}
                            $border={p.border}
                            onClick={() => signIn(p.id, {callbackUrl: '/'})}
                        >
                            {p.label}
                        </StyledButton>
                    ))}
                </StyledButtonGroup>
            </StyledCard>
        </StyledWrapper>
    );
}

export const getServerSideProps: GetServerSideProps = async () => {
    const providerIds = ALL_PROVIDERS
        .filter((p) => {
            const val = process.env[ENV_KEYS[p.id]];
            return val && !val.startsWith('REPLACE');
        })
        .map((p) => p.id);

    return {props: {providerIds}};
};

const StyledWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
    background-color: var(--gray-color2);
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

const StyledButtonGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
`;

const StyledButton = styled.button<{ $bg: string; $color: string; $border: string }>`
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid ${(props) => props.$border};
    background-color: ${(props) => props.$bg};
    color: ${(props) => props.$color};
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
        opacity: 0.85;
    }
`;
