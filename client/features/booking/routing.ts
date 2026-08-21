// 고객 공개 예약 페이지의 호스트·경로 규칙 단일 소스.
// 미들웨어(Edge 런타임)와 클라이언트가 함께 쓰므로 순수 문자열 로직만 둔다
// (문구 사전 i18n.ts를 미들웨어가 끌고 오지 않도록 언어 코드도 여기에 있다).
//
// 공개 URL: book.takeaseat.co.kr/{slug} · /{lang}/{slug} · /{slug}/r/{token}
// 내부 라우트: /book/[slug] · /book/[slug]/r/[token] (미들웨어 rewrite로 연결)

export type BookLang = 'ko' | 'en' | 'zh' | 'ja';

export const BOOK_LANGS: {value: BookLang; label: string}[] = [
    {value: 'ko', label: '한국어'},
    {value: 'en', label: 'English'},
    {value: 'ja', label: '日本語'},
    {value: 'zh', label: '中文'},
];

const BOOK_LANG_SET = new Set<string>(BOOK_LANGS.map((l) => l.value));

export function isBookLang(v: unknown): v is BookLang {
    return typeof v === 'string' && BOOK_LANG_SET.has(v);
}

// 고객 예약 페이지가 서비스되는 호스트. 로컬에서 서브도메인 동작을 확인하려면
// NEXT_PUBLIC_BOOKING_HOST=book.localhost:3000 처럼 포트까지 포함해 덮어쓴다.
export const BOOKING_HOST = (process.env.NEXT_PUBLIC_BOOKING_HOST || 'book.takeaseat.co.kr').toLowerCase();
export const BOOKING_ORIGIN = `https://${BOOKING_HOST}`;

// 운영 메인 도메인. 여기로 들어온 구 경로(/book/*)만 예약 서브도메인으로 영구 이전한다.
// localhost·dev.*·*.run.app 은 목록 밖이라 리다이렉트 없이 /book/[slug] 가 그대로 동작한다.
const MAIN_HOSTS = ['takeaseat.co.kr', 'www.takeaseat.co.kr'];

// 내부 Next 라우트 접두. 예약 서브도메인에서는 공개 URL에 노출되지 않는다.
export const BOOK_ROUTE_PREFIX = '/book';

// 공개 예약 페이지의 내부 라우트인지(= 비로그인 고객 구역). `router.pathname` 기준이라
// 호스트·rewrite와 무관하게 항상 `/book/...` 이다. 앱 셸·세션·게이트 예외 판정의 단일 소스.
export function isBookingRoute(pathname: string | undefined | null): boolean {
    return !!pathname && pathname.startsWith(`${BOOK_ROUTE_PREFIX}/`);
}

// 프록시가 Host를 갈아끼우는 경우가 있어 x-forwarded-host를 우선 본다(둘 다 없으면 빈 문자열).
export function resolveRequestHost(forwardedHost?: string | null, host?: string | null): string {
    const raw = forwardedHost || host || '';
    // x-forwarded-host 는 프록시가 겹치면 콤마로 이어붙는다 → 최초 값(원 요청 호스트)만 쓴다.
    return raw.split(',')[0].trim().toLowerCase();
}

// SSR(`getServerSideProps`)의 요청 헤더에서 원 요청 호스트를 얻는다.
// Node 는 중복 헤더를 ', ' 로 이어붙이지만 타입은 `string[]` 도 허용하므로 여기서 한 번만 좁힌다
// (호출부마다 `as string | undefined` 로 캐스팅하던 것을 대체한다).
export function resolveHostFromHeaders(headers: {'x-forwarded-host'?: string | string[]; host?: string}): string {
    const forwarded = headers['x-forwarded-host'];
    return resolveRequestHost(Array.isArray(forwarded) ? forwarded[0] : forwarded, headers.host);
}

export function isBookingHost(host?: string | null): boolean {
    return resolveRequestHost(null, host) === BOOKING_HOST;
}

export function isMainHost(host?: string | null): boolean {
    return MAIN_HOSTS.includes(resolveRequestHost(null, host));
}

// 호스트별 공개 경로 접두 — 예약 서브도메인이면 슬러그가 루트 바로 아래, 그 외엔 /book.
export function bookBaseForHost(host?: string | null): string {
    return isBookingHost(host) ? '' : BOOK_ROUTE_PREFIX;
}

type BookSub = {token?: string; m?: string};

// 공개 URL 생성(단일 소스). 한국어는 언어 접두 없음, 그 외 /{lang}/ 접두.
// base = 호스트별 접두(bookBaseForHost). 서브도메인이면 '' 이라 /{slug} 가 된다.
export function bookHref(lang: BookLang, slug: string, sub?: BookSub, base: string = BOOK_ROUTE_PREFIX): string {
    const prefix = lang === 'ko' ? '' : `/${lang}`;
    const s = encodeURIComponent(slug);
    if (sub?.token) return `${base}${prefix}/${s}/r/${encodeURIComponent(sub.token)}`;
    const path = `${base}${prefix}/${s}`;
    return sub?.m ? `${path}?m=${encodeURIComponent(sub.m)}` : path;
}

// 클라이언트 라우팅용 내부 라우트. 공개 URL(bookHref)을 as 로 함께 넘겨
// router.push(bookRoute(...), bookHref(...)) 형태로 쓴다.
// 서브도메인의 공개 경로는 미들웨어 rewrite 결과라 클라 라우터가 스스로 풀 수 없기 때문.
export function bookRoute(lang: BookLang, slug: string, sub?: BookSub): {pathname: string; query: Record<string, string>} {
    const query: Record<string, string> = {slug};
    if (lang !== 'ko') query.lang = lang;
    if (sub?.token) return {pathname: '/book/[slug]/r/[token]', query: {...query, token: sub.token}};
    if (sub?.m) query.m = sub.m;
    return {pathname: '/book/[slug]', query};
}
