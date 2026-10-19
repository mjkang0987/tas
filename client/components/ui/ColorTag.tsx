import styled from 'styled-components';

import {readableTextOn} from '../../features/colors/contrast';

export const ColorTag = styled.span<{ $color: string; $shape?: 'pill' | 'soft' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${(p) => p.$shape === 'soft' ? '4px' : '999px'};
    background-color: ${(p) => p.$color};
    /* 바탕은 사장님이 고른 색 — 글자는 흰·검 중 더 잘 읽히는 쪽(노랑 위 흰 글자는 1.6:1 이었다) */
    color: ${(p) => readableTextOn(p.$color)};
    font-size: var(--xsmall-font);
    font-weight: 600;
    flex-shrink: 0;
`;
