import type {NextRequest} from 'next/server';

import {handlers, authRequestContext} from '../../../../auth';

const INVITE_COOKIE = 'tas-invite-code';

function shouldClearInviteCookie(request: NextRequest) {
    return request.nextUrl.pathname.includes('/api/auth/callback/');
}

function appendClearCookie(response: Response) {
    const headers = new Headers(response.headers);
    headers.append(
        'Set-Cookie',
        `${INVITE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
    );
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

    const response = await authRequestContext.run({inviteCode}, callback);

    if (!shouldClearInviteCookie(request)) {
        return response;
    }

    return appendClearCookie(response);
}

export async function GET(request: NextRequest) {
    return handleAuthRequest(request, () => handlers.GET(request));
}

export async function POST(request: NextRequest) {
    return handleAuthRequest(request, () => handlers.POST(request));
}
