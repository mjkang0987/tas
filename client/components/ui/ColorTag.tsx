import styled from 'styled-components';

import {backgroundForWhiteText} from '../../features/colors/contrast';

export const ColorTag = styled.span<{ $color: string; $shape?: 'pill' | 'soft' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${(p) => p.$shape === 'soft' ? '4px' : '999px'};
    /* 사장님이 고른 색 — 흰 글자가 안 읽히는 밝은 색(노랑 등)만 같은 색을 진하게 */
    background-color: ${(p) => backgroundForWhiteText(p.$color)};
    color: var(--white-color);
    font-size: var(--xsmall-font);
    font-weight: 600;
    flex-shrink: 0;
`;
