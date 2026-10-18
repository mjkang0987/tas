import styled from 'styled-components';

interface PageHeroProps {
    eyebrow: string;
    /** 헤더에 제목이 없는 페이지(정책 문서 — 로그아웃 상태에선 헤더 자체가 없다)만 넘긴다 */
    title?: string;
    subtitle?: string;
}

// 페이지 위 소개(영문 eyebrow + 설명). 페이지 제목은 보통 헤더(`Header`의 h1)가 보여 주므로 넘기지 않는다
// — 같은 제목이 헤더와 겹쳐 두 번 보이고 h1 도 두 개가 됐다(2026-10-16 제거).
export function PageHero({eyebrow, title, subtitle}: PageHeroProps) {
    return (
        <StyledHero>
            <StyledEyebrow>{eyebrow}</StyledEyebrow>
            {title && <StyledTitle>{title}</StyledTitle>}
            {subtitle && <StyledSubtitle>{subtitle}</StyledSubtitle>}
        </StyledHero>
    );
}

const StyledHero = styled.div`
    margin-bottom: 18px;
`;

const StyledEyebrow = styled.p`
    margin: 0 0 8px;
    font-size: var(--xsmall-font);
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--blue-color);
`;

const StyledTitle = styled.h1`
    margin: 0 0 10px;
    font-size: var(--display-md);
    line-height: 1.1;
    color: var(--dark-gray-color);
`;

const StyledSubtitle = styled.p`
    margin: 0;
    color: var(--dark-gray-color2);
    font-size: var(--large-font);
`;
