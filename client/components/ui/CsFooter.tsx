import styled from 'styled-components';

export function CsFooter() {
    return (
        <StyledFooterCs>
            Take a seat CS: <StyledCsLink href="mailto:takeaseat.cs@gmail.com">takeaseat.cs@gmail.com</StyledCsLink>
        </StyledFooterCs>
    );
}

const StyledFooterCs = styled.p`
    margin: auto 0 0;
    padding: 24px 0 0;
    text-align: center;
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
`;

const StyledCsLink = styled.a`
    color: inherit;
    text-decoration: none;
    font-weight: 600;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            text-decoration: underline;
        }
    }
`;
