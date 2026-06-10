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
    color: var(--blue-color);
`;

const StyledTitle = styled.h1`
    margin: 0;
    font-size: 32px;
    line-height: 1.1;
    color: var(--dark-gray-color);
`;

const StyledSubtitle = styled.p`
    margin: 10px 0 0;
    color: var(--dark-gray-color2);
    font-size: 15px;
`;
