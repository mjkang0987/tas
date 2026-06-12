import {useEffect, useState} from 'react';

import Link from 'next/link';
import {useRouter} from 'next/router';

import styled from 'styled-components';

import {SeoHead} from '../components/ui/SeoHead';

const REDIRECT_SECONDS = 5;

export default function Error404() {
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

    useEffect(() => {
        if (secondsLeft <= 0) {
            void router.replace('/');
            return;
        }
        const timerId = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearTimeout(timerId);
    }, [secondsLeft, router]);

    return (
        <>
            <SeoHead title="페이지를 찾을 수 없습니다" />
            <StyledPage>
                <StyledCard>
                    <StyledCode>404</StyledCode>
                    <StyledTitle>페이지를 찾을 수 없습니다</StyledTitle>
                    <StyledDesc>요청하신 페이지가 존재하지 않거나 이동되었습니다.</StyledDesc>
                    <StyledRedirectNotice>{secondsLeft}초 후 홈으로 자동 이동합니다.</StyledRedirectNotice>
                    <StyledHomeLink href="/">홈으로 돌아가기</StyledHomeLink>
                </StyledCard>
            </StyledPage>
        </>
    );
}

const StyledRedirectNotice = styled.p`
    font-size: 12px;
    color: var(--dark-gray-color2);
    margin: 0;
`;

const StyledPage = styled.div`
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--black-color-10);
    padding: 24px;
`;

const StyledCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--white-color);
    border-radius: var(--card-radius);
    padding: 48px 40px;
    max-width: 400px;
    width: 100%;
    text-align: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`;

const StyledCode = styled.p`
    font-size: 64px;
    font-weight: 700;
    line-height: 1;
    color: var(--brand-color);
    margin: 0;
`;

const StyledTitle = styled.h1`
    font-size: 18px;
    font-weight: 600;
    color: var(--black-color);
    margin: 0;
`;

const StyledDesc = styled.p`
    font-size: 13px;
    color: var(--dark-gray-color2);
    line-height: 1.6;
    margin: 0;
`;

const StyledHomeLink = styled(Link)`
    display: inline-block;
    margin-top: 8px;
    height: 36px;
    line-height: 36px;
    padding: 0 20px;
    background: var(--brand-color);
    color: var(--white-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;

    &:hover {
        opacity: 0.88;
    }
`;
