import type {NextRequest} from 'next/server';

import {handlers, authRequestContext} from '../../../../auth';

const INVITE_COOKIE = 'tas-invite-code';
const LINK_COOKIE = 'tas-link-user';

function isCallbackRoute(request: NextRequest) {
    return request.nextUrl.pathname.includes('/api/auth/callback/');
}

function appendClearCookies(response: Response, cookieNames: string[]) {
    const headers = new Headers(response.headers);
    for (const name of cookieNames) {
        headers.append(
            'Set-Cookie',
            `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
        );
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

async function handleAuthRequest(
    request: NextRequest,
    callback: () => Promise<Response>
) {
    const inviteCode = request.cookies.get(INVITE_COOKIE)?.value ?? null;
    const linkUserId = request.cookies.get(LINK_COOKIE)?.value ?? null;

    const response = await authRequestContext.run({inviteCode, linkUserId}, callback);

    if (!isCallbackRoute(request)) {
        return response;
    }

    const cookiesToClear: string[] = [INVITE_COOKIE];
    if (linkUserId) cookiesToClear.push(LINK_COOKIE);

    return appendClearCookies(response, cookiesToClear);
}

export async function GET(request: NextRequest) {
    return handleAuthRequest(request, () => handlers.GET(request));
}

export async function POST(request: NextRequest) {
    return handleAuthRequest(request, () => handlers.POST(request));
}
