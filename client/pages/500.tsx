import Link from 'next/link';

import styled from 'styled-components';

import {SeoHead} from '../components/ui/SeoHead';

export default function Error500() {
    return (
        <>
            <SeoHead title="서버 오류" />
            <StyledPage>
                <StyledCard>
                    <StyledCode>500</StyledCode>
                    <StyledTitle>서버 오류가 발생했습니다</StyledTitle>
                    <StyledDesc>일시적인 오류입니다. 잠시 후 다시 시도해 주세요.</StyledDesc>
                    <StyledHomeLink href="/">홈으로 돌아가기</StyledHomeLink>
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

const StyledCode = styled.p`
    font-size: 64px;
    font-weight: 700;
    line-height: 1;
    color: var(--danger-color);
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
