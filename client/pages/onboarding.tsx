import {useState} from 'react';

import type {GetServerSideProps, NextPage} from 'next';
import {useRouter} from 'next/router';
import Head from 'next/head';

import styled from 'styled-components';

import {getPageSession} from '../lib/page-data';

type ShopType = 'hair' | 'nail' | 'waxing' | 'lash' | 'skin';

const SHOP_TYPES: {type: ShopType; label: string; emoji: string; desc: string}[] = [
    {type: 'hair', label: '헤어샵', emoji: '✂️', desc: '커트·펌·염색·클리닉'},
    {type: 'nail', label: '네일샵', emoji: '💅', desc: '젤네일·케어·아트'},
    {type: 'waxing', label: '왁싱샵', emoji: '🪷', desc: '바디·페이스 왁싱'},
    {type: 'lash', label: '속눈썹샵', emoji: '👁️', desc: '연장·펌·리무브'},
    {type: 'skin', label: '피부관리실', emoji: '🧴', desc: '기본·스페셜·클렌징'},
];

const OnboardingPage: NextPage = () => {
    const router = useRouter();
    const [shopName, setShopName] = useState('');
    const [shopType, setShopType] = useState<ShopType | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!shopName.trim()) {
            setError('샵 이름을 입력해 주세요.');
            return;
        }
        if (!shopType) {
            setError('업종을 선택해 주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({shopName, shopType}),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? '오류가 발생했습니다.');
                return;
            }

            router.replace('/');
        } catch {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <StyledPage>
            <Head>
                <title>TAS | 초기 설정</title>
            </Head>
            <StyledCard>
                <StyledHeader>
                    <StyledLogo>TAS</StyledLogo>
                    <StyledTitle>시작하기</StyledTitle>
                    <StyledSubtitle>샵 정보를 입력하면 기본 서비스가 자동으로 설정됩니다.</StyledSubtitle>
                </StyledHeader>

                <StyledSection>
                    <StyledLabel htmlFor="shop-name">샵 이름</StyledLabel>
                    <StyledInput
                        id="shop-name"
                        type="text"
                        value={shopName}
                        onChange={(e) => {
                            setShopName(e.target.value);
                            setError('');
                        }}
                        placeholder="예) 홍길동 헤어샵"
                        autoFocus
                    />
                </StyledSection>

                <StyledSection>
                    <StyledLabel>업종</StyledLabel>
                    <StyledTypeGrid>
                        {SHOP_TYPES.map(({type, label, emoji, desc}) => (
                            <StyledTypeCard
                                key={type}
                                $selected={shopType === type}
                                onClick={() => {
                                    setShopType(type);
                                    setError('');
                                }}
                            >
                                <StyledTypeEmoji>{emoji}</StyledTypeEmoji>
                                <StyledTypeLabel>{label}</StyledTypeLabel>
                                <StyledTypeDesc>{desc}</StyledTypeDesc>
                            </StyledTypeCard>
                        ))}
                    </StyledTypeGrid>
                </StyledSection>

                {error && <StyledError>{error}</StyledError>}

                <StyledSubmitBtn
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? '설정 중...' : '시작하기'}
                </StyledSubmitBtn>
            </StyledCard>
        </StyledPage>
    );
};

export default OnboardingPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const session = await getPageSession(ctx);

    if (!session) {
        return {redirect: {destination: '/login', permanent: false}};
    }
    if (session.onboarded) {
        return {redirect: {destination: '/', permanent: false}};
    }

    return {props: {}};
};

/* ── Styles ── */

const StyledPage = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px 16px;
    box-sizing: border-box;
`;

const StyledCard = styled.div`
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 36px 32px;
    background: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);

    @media (max-width: 480px) {
        padding: 28px 20px;
        gap: 22px;
    }
`;

const StyledHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StyledLogo = styled.p`
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: var(--blue-color);
`;

const StyledTitle = styled.h1`
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--black-color);
`;

const StyledSubtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: var(--dark-gray-color2);
    line-height: 1.5;
`;

const StyledSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const StyledLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
`;

const StyledInput = styled.input`
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    font-size: 15px;
    color: var(--black-color);
    background: var(--white-color);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;

    &::placeholder { color: var(--gray-color); }

    &:focus { border-color: var(--blue-color); }
`;

const StyledTypeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;

    @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const StyledTypeCard = styled.button<{$selected: boolean}>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 8px;
    border: 2px solid ${(p) => p.$selected ? 'var(--blue-color)' : 'var(--light-gray-color)'};
    border-radius: var(--radius-lg);
    background: ${(p) => p.$selected ? 'rgba(45, 127, 249, 0.06)' : 'var(--white-color)'};
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--blue-color);
            background: rgba(45, 127, 249, 0.04);
        }
    }
`;

const StyledTypeEmoji = styled.span`
    font-size: 26px;
    line-height: 1;
`;

const StyledTypeLabel = styled.strong`
    font-size: 13px;
    font-weight: 600;
    color: var(--black-color);
`;

const StyledTypeDesc = styled.span`
    font-size: 11px;
    color: var(--dark-gray-color2);
    text-align: center;
    line-height: 1.4;
`;

const StyledError = styled.p`
    margin: 0;
    padding: 10px 14px;
    font-size: 13px;
    color: var(--danger-color);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: var(--radius-md);
`;

const StyledSubmitBtn = styled.button`
    height: 48px;
    border: 1px solid var(--blue-color);
    border-radius: var(--radius-md);
    background: var(--blue-color);
    font-size: 15px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
    transition: opacity 0.15s;

    &:disabled { opacity: 0.6; cursor: default; }

    @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) { opacity: 0.88; }
    }
`;
