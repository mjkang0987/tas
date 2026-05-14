import styled from 'styled-components';

interface DotProps {
    color: string;
    size?: number;
    className?: string;
}

export function Dot({color, size = 10, className}: DotProps) {
    return <StyledDot className={className} $color={color} $size={size} />;
}

export const StyledDot = styled.span<{ $color: string; $size: number }>`
    display: inline-block;
    flex-shrink: 0;
    width: ${(props) => props.$size}px;
    height: ${(props) => props.$size}px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
`;
