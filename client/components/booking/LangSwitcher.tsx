// 고객 예약 페이지 하단 고정 언어 전환기.
// - 네이티브 <select> 사용(프론트 표준: 커스텀 드롭다운 대신 브라우저 기본 UI).
// - 언어 = URL 접두(/en|ja|zh, 한국어는 접두 없음)가 단일 소스. localStorage 미사용.
// - 전환 시 해당 언어 경로로 이동, <html lang> 동기화(WCAG).
import {useCallback, useEffect} from 'react';

import {useRouter} from 'next/router';
import styled from 'styled-components';

import {BOOK_LANGS, HTML_LANG, bookHref, isBookLang, type BookLang} from '../../features/booking/i18n';

// 하단 고정 바가 콘텐츠를 가리지 않도록 페이지 하단에 확보할 여백(예약 sticky 바도 이 높이 위에 둔다).
export const LANG_BAR_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 52px)';

// URL(router.query.lang, rewrite로 주입됨)로 현재 언어를 읽고, 전환 시 언어 경로로 이동하는 훅.
export function useBookLang(): [BookLang, (l: BookLang) => void] {
    const router = useRouter();
    const q = router.query.lang;
    const lang: BookLang = typeof q === 'string' && isBookLang(q) ? q : 'ko';

    // lang 변경 시 <html lang> 동기화(외부 시스템 sync — setState 아님).
    useEffect(() => {
        document.documentElement.lang = HTML_LANG[lang];
    }, [lang]);

    const setLang = useCallback((l: BookLang) => {
        const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
        if (!slug) return;
        const token = typeof router.query.token === 'string' ? router.query.token : undefined;
        const m = typeof router.query.m === 'string' ? router.query.m : undefined;
        // 언어 경로로 이동(한국어=접두 없음). 뷰 상태(?m=)는 보존.
        const href = bookHref(l, slug, token ? {token} : (m ? {m} : undefined));
        router.push(href, undefined, {scroll: false});
    }, [router]);

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
