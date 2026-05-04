import styled from 'styled-components';

export const AuthActionIcon = ({direction}: { direction: 'login' | 'logout' }) => (
    <StyledAuthActionIcon viewBox="0 0 24 24" aria-hidden="true">
        {direction === 'login' ? (
            <>
                <path d="M10 7L15 12L10 17" />
                <path d="M4.5 12H14.5" />
                <path d="M19 4.5V19.5" />
            </>
        ) : (
            <>
                <path d="M14 7L9 12L14 17" />
                <path d="M19.5 12H9.5" />
                <path d="M5 4.5V19.5" />
            </>
        )}
    </StyledAuthActionIcon>
);

const StyledAuthActionIcon = styled.svg`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
`;
