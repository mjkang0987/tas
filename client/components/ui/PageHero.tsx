import styled from 'styled-components';

interface PageHeroProps {
    eyebrow: string;
    title: string;
    subtitle?: string;
}

export function PageHero({eyebrow, title, subtitle}: PageHeroProps) {
    return (
        <StyledHero>
            <StyledEyebrow>{eyebrow}</StyledEyebrow>
            <StyledTitle>{title}</StyledTitle>
            {subtitle && <StyledSubtitle>{subtitle}</StyledSubtitle>}
        </StyledHero>
    );
}

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
