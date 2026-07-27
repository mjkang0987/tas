import type {NextFetchEvent, NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {auth} from './auth';
import {
    BOOKING_ORIGIN,
    BOOK_ROUTE_PREFIX,
    isBookLang,
    isBookingHost,
    isMainHost,
    resolveRequestHost,
} from './features/booking/routing';
import {SITE_URL} from './lib/seo';
import {CURRENT_TERMS_VERSION} from './utils/terms';

const authMiddleware = auth((req) => {
    const {pathname} = req.nextUrl;

    const user = req.auth?.user;

    // 약관 동의·온보딩 가드에서 항상 허용하는 경로 (인프라 + 동의/약관 관련 페이지)
    const isExempt =
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next') ||
        // public/ 정적 자산(로고·og 이미지 등): 확장자 있는 경로는 게이트 제외.
        // 미포함 시 로그인+미동의 상태에서 /logo/*.svg 요청까지 /consent로 리다이렉트돼 로고가 깨진다.
        /\.[^/]+$/.test(pathname) ||
        pathname.startsWith('/book/') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/about') ||
        pathname.startsWith('/logout') ||
        pathname.startsWith('/consent') ||
        pathname.startsWith('/terms') ||
        pathname.startsWith('/privacy') ||
        pathname === '/favicon.ico';

    // 0) DPA(처리위탁) 약관은 운영자 전용 — 미인증(SNS 로그인 안 함) 접근은 로그인으로 보낸다.
    if (pathname.startsWith('/dpa') && !user?.id) {
        return Response.redirect(new URL('/login', req.url));
    }

    // 1) 약관 동의 게이트: 로그인된 실제 계정인데 현재 약관 버전 미동의 → /consent
    //    단, 게스트로 이미 동의(쿠키)한 경우는 통과시키고 처리위탁(DPA) 동의만 앱 위 레이어로 받는다.
    const guestTermsAgreed = req.cookies.get('tas-guest-terms')?.value === CURRENT_TERMS_VERSION;
    if (user?.id && !user.loginError && user.termsVersion !== CURRENT_TERMS_VERSION && !isExempt && !guestTermsAgreed) {
        return Response.redirect(new URL('/consent', req.url));
    }

    // 2) 온보딩 게이트: 매장은 있으나 온보딩 미완료 → /onboarding
    //    단, 게스트로 이미 온보딩·동의(쿠키)한 경우는 온보딩 페이지 대신 데이터 마이그레이션으로 처리하므로 건너뜀.
    const storeId = user?.storeId;
    const onboarded = user?.onboarded;
    if (storeId && !onboarded && !guestTermsAgreed) {
        const isAllowed = pathname.startsWith('/onboarding') || isExempt;
        if (!isAllowed) {
            return Response.redirect(new URL('/onboarding', req.url));
        }
    }

    // 온보딩된 사용자가 온보딩 경로로 진입하면 페이지 가드가 이전 페이지로 돌려보냄
    // (미들웨어는 고정 URL로만 보낼 수 있어 '이전 페이지' 처리를 클라이언트 가드에 위임)
});

// 고객 예약 서브도메인(book.takeaseat.co.kr) 요청 처리.
// 공개 구역이므로 인증·약관·온보딩 게이트를 전부 우회하고, 루트 바로 아래 슬러그를
// 내부 라우트(/book/[slug])로 rewrite 한다. 공개 URL엔 /book 이 드러나지 않는다.
function handleBookingHost(req: NextRequest) {
    const {pathname} = req.nextUrl;

    // 인프라·정적 자산(확장자 있는 경로)은 손대지 않는다.
    if (pathname.startsWith('/_next') || pathname.startsWith('/__') || /\.[^/]+$/.test(pathname)) {
        return NextResponse.next();
    }
    // 공개 예약 API만 허용. 운영자 API는 세션 쿠키가 없어도 굳이 노출하지 않는다.
    if (pathname.startsWith('/api/')) {
        return pathname.startsWith('/api/book/')
            ? NextResponse.next()
            : new NextResponse(null, {status: 404});
    }
    // 이미 내부 라우트로 들어온 요청(클라 라우팅의 _next/data 조회)은 그대로 통과.
    if (pathname === BOOK_ROUTE_PREFIX || pathname.startsWith(`${BOOK_ROUTE_PREFIX}/`)) {
        return NextResponse.next();
    }
    // 슬러그 없는 루트 진입은 보여줄 매장이 없으므로 메인 사이트로.
    if (pathname === '/') {
        return NextResponse.redirect(SITE_URL);
    }

    const segments = pathname.split('/').filter(Boolean);
    const url = req.nextUrl.clone();
    // /{lang}/{slug}… → lang 쿼리로 변환(메인 도메인의 next.config rewrite와 같은 결과).
    if (segments.length > 1 && isBookLang(segments[0])) {
        url.searchParams.set('lang', segments[0]);
        segments.shift();
    }
    url.pathname = `${BOOK_ROUTE_PREFIX}/${segments.join('/')}`;
    return NextResponse.rewrite(url);
}

// 메인 도메인의 구 예약 경로(/book/*)를 예약 서브도메인의 같은 경로로 이전.
// 이미 배포된 예약 확인 링크와 오너가 복사해 둔 URL을 살려두기 위한 것.
//
// 308(영구)이 아니라 307(임시)인 이유 — 구 경로는 외부에 공개된 적이 없어서
// 영구 리다이렉트가 넘겨줄 검색엔진 신호도, 보존할 기배포 링크도 없다. 반면 308/301은
// 브라우저가 사실상 무기한 캐시해서 되돌려야 할 때 서버 롤백이 클라이언트에 닿지 않는다.
// 얻는 것 없이 되돌릴 길만 막히므로 307을 유지한다.
const LEGACY_REDIRECT_STATUS = 307;

function redirectLegacyBookPath(req: NextRequest) {
    const path = req.nextUrl.pathname.slice(BOOK_ROUTE_PREFIX.length) || '/';
    const url = new URL(path, BOOKING_ORIGIN);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url, LEGACY_REDIRECT_STATUS);
}

// 점검 모드 게이트 — auth() '밖', 가장 먼저 실행.
// NextAuth가 요청 URL을 AUTH_URL origin으로 치환하기 전의 '진짜 요청 origin'을 써야
// 내부 rewrite가 외부 프록시로 새지 않는다. auth가 깨져도 점검 페이지는 뜬다(인증 독립).
// env(가벼운 신호)만 사용 — 미들웨어 Edge 런타임이라 무거운 import 금지.
export default function middleware(req: NextRequest, ev: NextFetchEvent) {
    const {pathname} = req.nextUrl;
    if (
        process.env.MAINTENANCE_MODE === 'true'
        && pathname !== '/maintenance'
        && !pathname.startsWith('/_next')
    ) {
        const url = req.nextUrl.clone();
        url.pathname = '/maintenance';
        url.search = '';
        return NextResponse.rewrite(url);
    }

    // 호스트 분기 — 인증(auth) 진입 전에 판정한다. 예약 서브도메인은 공개 구역이라
    // 세션·약관·온보딩 게이트를 아예 타지 않아야 한다.
    const host = resolveRequestHost(req.headers.get('x-forwarded-host'), req.headers.get('host'));
    if (isBookingHost(host)) {
        return handleBookingHost(req);
    }
    if (isMainHost(host) && (pathname === BOOK_ROUTE_PREFIX || pathname.startsWith(`${BOOK_ROUTE_PREFIX}/`))) {
        return redirectLegacyBookPath(req);
    }

    // NextAuth auth()가 반환하는 핸들러의 2번째 인자 타입이 라우트핸들러용으로
    // 좁게 잡혀 NextFetchEvent와 안 맞음(런타임은 정상) → 타입만 우회.
    return authMiddleware(req, ev as never);
}

// 점검 모드 게이트가 /login도 덮어야 하므로 matcher에서 login은 제외하지 않는다.
// 정상 모드에서 /login은 authMiddleware의 isExempt로 통과하므로 동작 변화 없음.
export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
