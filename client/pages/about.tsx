import Link from 'next/link';

import styled from 'styled-components';

import {SeoHead} from '../components/ui/SeoHead';

type Feature = {title: string; desc: string};

const FEATURES: Feature[] = [
    {title: '예약 캘린더', desc: '일·주·월 보기로 예약을 한눈에 확인하고 관리합니다.'},
    {title: '고객 관리', desc: '방문 이력·메모·적립금까지 고객 정보를 통합 관리합니다.'},
    {title: '담당자·서비스', desc: '담당자별 스케줄과 시술·가격을 손쉽게 설정합니다.'},
    {title: '결제·매출', desc: '결제 내역과 매출을 기록하고 자동으로 집계합니다.'},
];

export default function AboutPage() {
    return (
        <StyledWrapper>
            <SeoHead
                title="서비스 소개"
                description="예약·고객 관리 서비스 TAS. 네이버·당근 등 여러 플랫폼의 예약을 한 곳에서 통합 관리하세요."
                path="/about"
            />
            <StyledMain>
                <StyledHero>
                    <StyledBrandLogo src="/logo/logo-black.svg" alt="Take a Seat" />
                    <StyledTagline>예약·고객 관리 서비스</StyledTagline>
                    <StyledLead>
                        예약 캘린더부터 고객·담당자·매출까지, 매장 운영에 필요한 기능을 한 곳에서 관리하세요.
                        로그인 없이도 서비스가 무엇을 도와주는지 아래에서 확인할 수 있습니다.
                    </StyledLead>
                </StyledHero>

                <StyledFeatureGrid>
                    {FEATURES.map((f) => (
                        <StyledFeatureCard key={f.title}>
                            <StyledFeatureTitle>{f.title}</StyledFeatureTitle>
                            <StyledFeatureDesc>{f.desc}</StyledFeatureDesc>
                        </StyledFeatureCard>
                    ))}
                </StyledFeatureGrid>

                <StyledCtaRow>
                    <StyledCtaLink href="/login">시작하기 · 로그인</StyledCtaLink>
                </StyledCtaRow>

                <StyledFooter>
                    <StyledFooterLink href="/privacy">개인정보처리방침</StyledFooterLink>
                    <StyledFooterDivider aria-hidden="true">·</StyledFooterDivider>
                    <StyledFooterLink href="/terms">이용약관</StyledFooterLink>
                </StyledFooter>
            </StyledMain>
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div`
    display: flex;
    justify-content: center;
    min-height: 100%;
    padding: 40px 16px;
    box-sizing: border-box;
    background: var(--white-color);
`;

const StyledMain = styled.main`
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    margin: auto 0;
`;

const StyledHero = styled.section`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
`;

const StyledBrandLogo = styled.img`
    height: 72px;
    width: auto;
    display: block;
`;

const StyledTagline = styled.p`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--black-color);
`;

const StyledLead = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: var(--dark-gray-color2);
    max-width: 460px;
`;

const StyledFeatureGrid = styled.section`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

const StyledFeatureCard = styled.div`
    padding: 18px 16px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-lg);
    background: #fafafa;
`;

const StyledFeatureTitle = styled.h2`
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
    color: var(--black-color);
`;

const StyledFeatureDesc = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dark-gray-color2);
`;

const StyledCtaRow = styled.div`
    display: flex;
    justify-content: center;
`;

const StyledCtaLink = styled(Link)`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 28px;
    border-radius: 8px;
    background: var(--brand-color);
    color: var(--white-color);
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
`;

const StyledFooter = styled.footer`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding-top: 8px;
`;

const StyledFooterLink = styled(Link)`
    font-size: 13px;
    color: var(--dark-gray-color2);
    text-decoration: none;
`;

const StyledFooterDivider = styled.span`
    color: var(--light-gray-color);
`;
