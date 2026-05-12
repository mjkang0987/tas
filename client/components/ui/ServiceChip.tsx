import styled from 'styled-components';

export const StyledServiceText = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 999px;
    background-color: ${(props) => `${props.$color}18`};
    color: ${(props) => props.$color};
    font-size: 11px;
    font-weight: 600;
`;

export const StyledServiceToken = styled.span`
    display: inline-flex;
    align-items: center;
    min-width: 0;
`;

export const StyledServiceList = styled.span`
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;
