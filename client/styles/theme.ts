import {css} from 'styled-components';

import {isBookingRoute} from '../features/booking/routing';

// 어두운 화면을 쓰지 않는(밝게 고정) 화면 — 손님이 보는 공개 예약·소개 화면과 정책 문서.
// 정책 문서는 독립 HTML 스코프(policyCss)가 자기 색을 쓰고, 손님 화면은 매장마다 따로 다룬다.
const LIGHT_ONLY_PATHS = new Set(['/terms', '/privacy', '/dpa']);

export function isLightOnlyPage(pathname: string | undefined, landing = false): boolean {
    if (!pathname) return false;
    if (landing && pathname === '/') return true;
    return LIGHT_ONLY_PATHS.has(pathname) || isBookingRoute(pathname);
}

/** html[data-theme] 값 — 밝게 고정하는 화면만 'light', 나머지는 시스템 설정을 따른다(속성 없음). */
export function themeAttribute(pathname: string | undefined, landing = false): 'light' | undefined {
    return isLightOnlyPage(pathname, landing) ? 'light' : undefined;
}

/**
 * 사장님이 고른 색(서비스 카테고리·담당자)으로 칠하는 칩 — 옅은 바탕 + 그 색 글자.
 * 어두운 화면에선 고른 색 그대로면 안 읽혀 iOS `tintText`/`tintFill` 처럼 글자는 흰색 쪽으로 섞고 바탕은 진하게.
 * `alpha` 는 밝은 화면 바탕 불투명도(16진 두 자리, 예: '18' = 9.4%).
 */
export const tintChip = (color: string, alpha = '18') => css`
    background-color: ${color}${alpha};
    color: ${color};

    @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) & {
            background-color: ${color}47;
            color: color-mix(in srgb, ${color} 45%, white);
        }
    }
`;
