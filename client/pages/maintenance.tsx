import Head from 'next/head';

import styled from 'styled-components';

import {SeoHead} from '../components/ui/SeoHead';

// 점검중 페이지. DB/Prisma·인증을 일절 호출하지 않는 순수 정적 페이지로,
// 마이그레이션 등으로 백엔드가 깨진 동안에도 안전하게 렌더된다.
export default function MaintenancePage() {
    return (
        <>
            <SeoHead title="점검 중" description="서비스 점검 중입니다. 잠시 후 다시 접속해 주세요." />
            <Head>
                <meta name="robots" content="noindex" />
            </Head>
            <StyledPage>
                <StyledCard>
                    <StyledIcon aria-hidden="true">🛠️</StyledIcon>
                    <StyledTitle>점검 중입니다</StyledTitle>
                    <StyledDesc>
                        더 나은 서비스를 위해 잠시 시스템을 점검하고 있습니다.
                        잠시 후 다시 접속해 주세요.
                    </StyledDesc>
                </StyledCard>
            </StyledPage>
        </>
    );
}

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

const StyledIcon = styled.p`
    font-size: 56px;
    line-height: 1;
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
