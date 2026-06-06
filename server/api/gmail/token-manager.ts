import {prisma} from '../../db/prisma';

interface GoogleTokens {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
}

export async function saveGoogleTokens(userId: string, tokens: GoogleTokens): Promise<void> {
    const data: Record<string, unknown> = {
        accessToken: tokens.accessToken,
        tokenExpiresAt: tokens.expiresAt,
    };

    if (tokens.refreshToken) {
        data.refreshToken = tokens.refreshToken;
    }

    await prisma.authAccount.update({
        where: {userId},
        data,
    });
}

type TokenFailReason = 'not_google' | 'no_refresh_token' | 'token_expired';

export async function getValidAccessToken(userId: string): Promise<string | null> {
    const result = await getValidAccessTokenWithReason(userId);
    return result.token;
}

export async function getValidAccessTokenWithReason(userId: string): Promise<{token: string | null; reason: TokenFailReason | null}> {
    const account = await prisma.authAccount.findUnique({
        where: {userId},
        select: {
            provider: true,
            accessToken: true,
            refreshToken: true,
            tokenExpiresAt: true,
        },
    });

    if (!account || account.provider !== 'google' || !account.accessToken) {
        return {token: null, reason: 'not_google'};
    }

    const now = new Date();
    const bufferMs = 60_000;
    const isExpired = account.tokenExpiresAt
        && account.tokenExpiresAt.getTime() - bufferMs < now.getTime();

    if (!isExpired) {
        return {token: account.accessToken, reason: null};
    }

    if (!account.refreshToken) {
        return {token: null, reason: 'no_refresh_token'};
    }

    const refreshed = await refreshAccessToken(account.refreshToken);
    if (!refreshed) {
        return {token: null, reason: 'token_expired'};
    }

    await saveGoogleTokens(userId, {
        accessToken: refreshed.accessToken,
        refreshToken: null,
        expiresAt: refreshed.expiresAt,
    });

    return {token: refreshed.accessToken, reason: null};
}

async function refreshAccessToken(
    refreshToken: string,
): Promise<{accessToken: string; expiresAt: Date} | null> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID!,
            client_secret: process.env.AUTH_GOOGLE_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!res.ok) {
        console.error('[token-manager] refresh failed', res.status, await res.text());
        return null;
    }

    const json = await res.json() as {access_token: string; expires_in: number};
    return {
        accessToken: json.access_token,
        expiresAt: new Date(Date.now() + json.expires_in * 1000),
    };
}
