import type {NextFetchEvent, NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {auth} from './auth';
import {CURRENT_TERMS_VERSION} from './utils/terms';

const authMiddleware = auth((req) => {
    const {pathname} = req.nextUrl;

    const user = req.auth?.user;

    // 약관 동의·온보딩 가드에서 항상 허용하는 경로 (인프라 + 동의/약관 관련 페이지)
    const isExempt =
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next') ||
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
    // NextAuth auth()가 반환하는 핸들러의 2번째 인자 타입이 라우트핸들러용으로
    // 좁게 잡혀 NextFetchEvent와 안 맞음(런타임은 정상) → 타입만 우회.
    return authMiddleware(req, ev as never);
}

// 점검 모드 게이트가 /login도 덮어야 하므로 matcher에서 login은 제외하지 않는다.
// 정상 모드에서 /login은 authMiddleware의 isExempt로 통과하므로 동작 변화 없음.
export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
