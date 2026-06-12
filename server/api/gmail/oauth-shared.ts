import type {NextApiRequest} from 'next';

export const GMAIL_OAUTH_STATE_COOKIE = 'tas-gmail-oauth-state';
export const GMAIL_OAUTH_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email';

export function getBaseUrl(req: NextApiRequest): string {
    if (process.env.AUTH_URL) {
        return process.env.AUTH_URL.replace(/\/$/, '');
    }
    const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
    return `${proto}://${req.headers.host}`;
}

export function getRedirectUri(req: NextApiRequest): string {
    return `${getBaseUrl(req)}/api/gmail/oauth-callback`;
}

export function buildStateCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
    const parts = [
        `${GMAIL_OAUTH_STATE_COOKIE}=${value}`,
        'Path=/api/gmail',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${maxAgeSeconds}`,
    ];
    if (secure) parts.push('Secure');
    return parts.join('; ');
}
