// 한글 초성(첫소리) 검색. "김민수" 를 "ㄱㅁㅅ" 로도 찾을 수 있게 한다.

const CHOSUNG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const HANGUL_SYLLABLE_START = 0xAC00; // '가'
const HANGUL_SYLLABLE_END = 0xD7A3; // '힣'
const JUNGSUNG_JONGSUNG_COUNT = 588; // 중성(21) × 종성(28)

const CHOSUNG_SET = new Set<string>(CHOSUNG_LIST);

// 한글 음절은 초성으로, 그 외 문자(자모 단독·영문·숫자·기호)는 원문 그대로 통과시킨다.
export function getChosung(text: string): string {
    let result = '';

    for (const ch of text) {
        const code = ch.codePointAt(0) ?? 0;
        if (code >= HANGUL_SYLLABLE_START && code <= HANGUL_SYLLABLE_END) {
            const chosungIndex = Math.floor((code - HANGUL_SYLLABLE_START) / JUNGSUNG_JONGSUNG_COUNT);
            result += CHOSUNG_LIST[chosungIndex];
        } else {
            result += ch;
        }
    }

    return result;
}

// 빈 문자열이 아니고, 모든 글자가 초성 자모(ㄱ~ㅎ)일 때만 초성 질의로 본다.
export function isChosungQuery(query: string): boolean {
    return query.length > 0 && [...query].every((ch) => CHOSUNG_SET.has(ch));
}

// 초성 질의일 때만 대상 문자열의 초성열에 부분일치시킨다. 초성 질의가 아니면 항상 false —
// 일반 문자열 일치는 호출부가 기존 규칙(대소문자·트림 등)대로 별도로 처리한다.
export function matchesChosung(target: string, query: string): boolean {
    if (!isChosungQuery(query)) return false;
    return getChosung(target).includes(query);
}
