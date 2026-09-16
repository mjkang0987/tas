import {useEffect, useState} from 'react';

/**
 * 미디어 쿼리 구독. 서버 렌더에는 `false` 로 시작해 마운트 후 실제 값으로 맞춘다.
 *
 * `enabled: false` 면 구독 자체를 만들지 않는다 — 결과를 쓰지 않는 화면에서 리스너와
 * 리렌더가 붙는 것을 막는다(주 뷰는 Timeline 이 7개라 그대로 두면 리스너가 7개 생긴다).
 */
export function useMediaQuery(query: string, enabled = true): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

        const mediaQuery = window.matchMedia(query);
        const update = () => setMatches(mediaQuery.matches);
        update();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', update);
            return () => mediaQuery.removeEventListener('change', update);
        }

        // Safari 13 이하 — addEventListener 미지원.
        mediaQuery.addListener(update);
        return () => mediaQuery.removeListener(update);
    }, [query, enabled]);

    return matches;
}
