import {useEffect, useState} from 'react';

/** 미디어 쿼리 구독. 서버 렌더에는 `false` 로 시작해 마운트 후 실제 값으로 맞춘다. */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
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
    }, [query]);

    return matches;
}
