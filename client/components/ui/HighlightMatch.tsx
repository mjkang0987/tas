import React from 'react';

import styled from 'styled-components';

import type {MatchRange} from '../../features/customers/search-highlight';

type HighlightMatchProps = {
    text: string;
    range: MatchRange | null;
};

// 검색어가 걸린 구간만 표시를 입힌다. 명단·검색 레이어 둘 다에서 쓴다.
export function HighlightMatch({text, range}: HighlightMatchProps) {
    if (!range) return <>{text}</>;

    return (
        <>
            {text.slice(0, range.start)}
            <StyledMark>{text.slice(range.start, range.end)}</StyledMark>
            {text.slice(range.end)}
        </>
    );
}

const StyledMark = styled.mark`
    background-color: var(--warning-bg-soft);
    color: inherit;
    border-radius: 2px;
`;
