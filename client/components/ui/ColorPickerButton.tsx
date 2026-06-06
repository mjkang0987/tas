import styled from 'styled-components';

export const ColorPickerButton = styled.button<{
    $color: string;
    $selected: boolean;
    $size?: number;
}>`
    width: ${(p) => p.$size ?? 20}px;
    height: ${(p) => p.$size ?? 20}px;
    border-radius: 50%;
    border: 2px solid ${(p) => p.$selected ? 'var(--dark-gray-color)' : 'transparent'};
    background-color: ${(p) => p.$color};
    padding: 0;
    box-sizing: border-box;
    flex-shrink: 0;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.8;
        }
    }
`;
