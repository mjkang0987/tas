// 고객 예약 페이지 하단 고정 언어 전환기.
// - 네이티브 <select> 사용(프론트 표준: 커스텀 드롭다운 대신 브라우저 기본 UI).
// - 같은 경로에서 즉시 전환 + localStorage 영속(다음 방문 유지) + <html lang> 동기화(WCAG).
import {useCallback, useEffect, useSyncExternalStore} from 'react';

import styled from 'styled-components';

import {BOOK_LANGS, HTML_LANG, detectBookLang, isBookLang, type BookLang} from '../../features/booking/i18n';

const LANG_STORAGE_KEY = 'tas-book-lang';

// 하단 고정 바가 콘텐츠를 가리지 않도록 페이지 하단에 확보할 여백(예약 sticky 바도 이 높이 위에 둔다).
export const LANG_BAR_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 52px)';

// 언어 상태를 localStorage에 두고 useSyncExternalStore로 구독(SSR 안전 + 탭 간 동기화).
// setState-in-effect 없이 외부 스토어를 읽는 표준 패턴.
const langListeners = new Set<() => void>();
function emitLangChange() { langListeners.forEach((l) => l()); }

function subscribeLang(cb: () => void): () => void {
    langListeners.add(cb);
    const onStorage = (e: StorageEvent) => { if (e.key === LANG_STORAGE_KEY) cb(); };
    window.addEventListener('storage', onStorage);
    return () => { langListeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

// 클라 스냅샷: localStorage → navigator.language 순. 실패/미지원이면 기본 ko.
function getLangSnapshot(): BookLang {
    try {
        const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
        if (isBookLang(stored)) return stored;
        const detected = detectBookLang(window.navigator?.language);
        if (detected) return detected;
    } catch { /* localStorage 접근 불가(프라이버시 모드 등) → 기본값 */ }
    return 'ko';
}

// 서버 스냅샷: 항상 ko(하이드레이션 기준). 마운트 후 클라 스냅샷으로 동기화된다.
function getLangServerSnapshot(): BookLang { return 'ko'; }

// 저장된 언어(없으면 브라우저 언어 자동감지, 그래도 없으면 기본 ko)를 반환하는 훅.
export function useBookLang(): [BookLang, (l: BookLang) => void] {
    const lang = useSyncExternalStore(subscribeLang, getLangSnapshot, getLangServerSnapshot);

    // lang 변경 시 <html lang> 동기화(외부 시스템 sync — setState 아님).
    useEffect(() => {
        document.documentElement.lang = HTML_LANG[lang];
    }, [lang]);

    const setLang = useCallback((l: BookLang) => {
        try { window.localStorage.setItem(LANG_STORAGE_KEY, l); } catch { /* 저장 실패 무시 */ }
        emitLangChange();
    }, []);

    return [lang, setLang];
}

interface LangSwitcherProps {
    lang: BookLang;
    onChange: (l: BookLang) => void;
}

export function LangSwitcher({lang, onChange}: LangSwitcherProps) {
    return (
        <StyledBar>
            <StyledInner>
                <StyledLabel htmlFor="book-lang-select" aria-hidden="true">🌐</StyledLabel>
                <StyledSelect
                    id="book-lang-select"
                    aria-label="Language"
                    value={lang}
                    onChange={(e) => onChange(e.target.value as BookLang)}
                >
                    {BOOK_LANGS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                </StyledSelect>
            </StyledInner>
        </StyledBar>
    );
}

const StyledBar = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20; /* 예약 sticky 요약 바(z-index:5)보다 위 */
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    padding: 8px 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
    background: var(--white-color);
    border-top: 1px solid var(--light-gray-color);
`;

const StyledInner = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const StyledLabel = styled.label`
    font-size: var(--small-font);
    line-height: 1;
`;

// 네이티브 select. 디자인 토큰 준수(radius·보더·폰트).
const StyledSelect = styled.select`
    height: 36px;
    padding: 0 32px 0 12px;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    color: var(--black-color);
    font-size: var(--small-font);
    font-weight: 600;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
`;
