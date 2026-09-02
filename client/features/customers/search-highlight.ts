// 검색어가 문자열의 어느 구간에 걸렸는지 찾는다(하이라이트용). 일반 부분일치를
// 먼저 보고, 못 찾으면 초성 부분일치(`chosung.ts`)를 본다 — 두 검색 화면의 매칭
// 규칙(이름 OR 초성)과 정확히 같은 순서라 실제 매칭과 하이라이트가 어긋나지 않는다.

import {getChosung, isChosungQuery} from './chosung';

export interface MatchRange {
    start: number;
    end: number;
}

export function findMatchRange(text: string, query: string, options?: {caseInsensitive?: boolean}): MatchRange | null {
    if (!query) return null;

    const haystack = options?.caseInsensitive ? text.toLowerCase() : text;
    const needle = options?.caseInsensitive ? query.toLowerCase() : query;
    const plainIndex = haystack.indexOf(needle);
    if (plainIndex !== -1) return {start: plainIndex, end: plainIndex + query.length};

    if (isChosungQuery(query)) {
        // getChosung은 글자 수를 그대로 보존(음절 1개 → 초성 1개)하므로 초성열에서 찾은
        // 인덱스가 원문 인덱스와 그대로 대응한다.
        const chosungIndex = getChosung(text).indexOf(query);
        if (chosungIndex !== -1) return {start: chosungIndex, end: chosungIndex + query.length};
    }

    return null;
}
