import {auth} from './auth';

export default auth((req) => {
    const {pathname} = req.nextUrl;
    const session = req.auth;
    const storeId = session?.user?.storeId;
    const onboarded = session?.user?.onboarded;

    if (storeId && !onboarded) {
        const isAllowed =
            pathname.startsWith('/onboarding') ||
            pathname.startsWith('/api/') ||
            pathname.startsWith('/login') ||
            pathname.startsWith('/logout') ||
            pathname.startsWith('/_next') ||
            pathname === '/favicon.ico';

        if (!isAllowed) {
            return Response.redirect(new URL('/onboarding', req.url));
        }
    }

    if (onboarded && pathname.startsWith('/onboarding')) {
        return Response.redirect(new URL('/', req.url));
    }
});

export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'],
};
