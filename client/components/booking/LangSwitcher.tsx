// 고객 예약 페이지 하단 고정 언어 전환기.
// - 네이티브 <select> 사용(프론트 표준: 커스텀 드롭다운 대신 브라우저 기본 UI).
// - 언어 = URL 접두(/en|ja|zh, 한국어는 접두 없음)가 단일 소스. localStorage 미사용.
// - 전환 시 해당 언어 경로로 이동, <html lang> 동기화(WCAG).
import {useCallback, useEffect} from 'react';

import {useRouter} from 'next/router';
import styled from 'styled-components';

import {BOOK_LANGS, HTML_LANG, bookHref, bookRoute, isBookLang, type BookLang} from '../../features/booking/i18n';
import {StyledFieldSelect} from '../ui/FormControls';

// 하단 고정 바가 콘텐츠를 가리지 않도록 페이지 하단에 확보할 여백(예약 sticky 바도 이 높이 위에 둔다).
export const LANG_BAR_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 52px)';

// URL(router.query.lang, rewrite로 주입됨)로 현재 언어를 읽고, 전환 시 언어 경로로 이동하는 훅.
// bookBase = 호스트별 공개 경로 접두(예약 서브도메인 '' / 그 외 '/book'). 페이지가 SSR에서 계산해 넘긴다.
export function useBookLang(bookBase: string): [BookLang, (l: BookLang) => void] {
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
        // 서브도메인의 공개 경로는 미들웨어 rewrite 결과라 클라 라우터가 직접 못 푼다 → 내부 라우트를 href로, 공개 URL을 as로.
        const sub = token ? {token} : (m ? {m} : undefined);
        router.push(bookRoute(l, slug, sub), bookHref(l, slug, sub, bookBase), {scroll: false});
    }, [router, bookBase]);

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

// 테두리·포커스·화살표는 공유 정의(StyledFieldSelect)를 따르고,
// 하단 고정 바 전용 치수(36px — LANG_BAR_OFFSET 52px = 8+36+8)와 굵기만 덮어쓴다.
const StyledSelect = styled(StyledFieldSelect)`
    height: 36px;
    padding: 0 32px 0 12px;
    font-weight: 600;
`;
