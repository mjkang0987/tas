import type {NextApiRequest, NextApiResponse} from 'next';

import {getApiSession, requireRole} from '../../auth/api-session';
import {saveGmailConnection} from './token-manager';
import {GMAIL_OAUTH_STATE_COOKIE, buildStateCookie, getBaseUrl, getRedirectUri} from './oauth-shared';

const SETTINGS_PATH = '/settings/naver';

function fail(res: NextApiResponse, reason: string) {
    return res.redirect(302, `${SETTINGS_PATH}?gmail=error&reason=${encodeURIComponent(reason)}`);
}

function parseIdTokenEmail(idToken: string): string | null {
    try {
        const payload = idToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {email?: string};
        return decoded.email ?? null;
    } catch {
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!session) {
        return res.redirect(302, '/login');
    }
    if (!requireRole(session, 'owner', res)) return;

    // state 쿠키는 1회용 — 결과와 무관하게 즉시 만료
    const secure = getBaseUrl(req).startsWith('https');
    res.setHeader('Set-Cookie', buildStateCookie('', 0, secure));

    if (typeof req.query.error === 'string') {
        return fail(res, req.query.error === 'access_denied' ? 'denied' : 'oauth');
    }

    const code = req.query.code;
    const state = req.query.state;
    const cookieState = req.cookies[GMAIL_OAUTH_STATE_COOKIE];

    if (typeof code !== 'string' || typeof state !== 'string' || !cookieState || state !== cookieState) {
        return fail(res, 'state');
    }

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({
                client_id: process.env.AUTH_GOOGLE_ID!,
                client_secret: process.env.AUTH_GOOGLE_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: getRedirectUri(req),
            }),
        });

        if (!tokenRes.ok) {
            console.error('[gmail-oauth] token exchange failed', tokenRes.status, await tokenRes.text());
            return fail(res, 'exchange');
        }

        const tokens = await tokenRes.json() as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            id_token?: string;
        };

        if (!tokens.access_token) {
            return fail(res, 'exchange');
        }

        const email = tokens.id_token ? parseIdTokenEmail(tokens.id_token) : null;

        await saveGmailConnection(session.userId, email ?? '', {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? null,
            expiresAt: tokens.expires_in
                ? new Date(Date.now() + tokens.expires_in * 1000)
                : null,
        });

        return res.redirect(302, `${SETTINGS_PATH}?gmail=connected`);
    } catch (error) {
        console.error('[gmail-oauth] callback failed:', error);
        return fail(res, 'unknown');
    }
}
