import styled from 'styled-components';

export const ColorTag = styled.span<{ $color: string; $shape?: 'pill' | 'soft' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${(p) => p.$shape === 'soft' ? '4px' : '999px'};
    background-color: ${(p) => p.$color};
    color: var(--white-color);
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
`;
