import {prisma} from '../../db/prisma';

interface GoogleTokens {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
}

export async function saveGmailConnection(
    userId: string,
    email: string,
    tokens: GoogleTokens,
): Promise<void> {
    const update: Record<string, unknown> = {
        email,
        accessToken: tokens.accessToken,
        tokenExpiresAt: tokens.expiresAt,
    };

    // refresh 토큰은 재동의 없이는 다시 내려오지 않으므로 값이 있을 때만 갱신
    if (tokens.refreshToken) {
        update.refreshToken = tokens.refreshToken;
    }

    await prisma.gmailConnection.upsert({
        where: {userId},
        update,
        create: {
            userId,
            email,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
        },
    });
}

export async function getGmailConnection(userId: string): Promise<{email: string} | null> {
    const connection = await prisma.gmailConnection.findUnique({
        where: {userId},
        select: {email: true},
    });
    return connection;
}

export async function deleteGmailConnection(userId: string): Promise<void> {
    await prisma.gmailConnection.deleteMany({where: {userId}});
}

type TokenFailReason = 'not_connected' | 'no_refresh_token' | 'token_expired';

export async function getValidAccessTokenWithReason(userId: string): Promise<{token: string | null; reason: TokenFailReason | null}> {
    const connection = await prisma.gmailConnection.findUnique({
        where: {userId},
        select: {
            accessToken: true,
            refreshToken: true,
            tokenExpiresAt: true,
        },
    });

    if (!connection || !connection.accessToken) {
        return {token: null, reason: 'not_connected'};
    }

    const now = new Date();
    const bufferMs = 60_000;
    const isExpired = connection.tokenExpiresAt
        && connection.tokenExpiresAt.getTime() - bufferMs < now.getTime();

    if (!isExpired) {
        return {token: connection.accessToken, reason: null};
    }

    if (!connection.refreshToken) {
        return {token: null, reason: 'no_refresh_token'};
    }

    const refreshed = await refreshAccessToken(connection.refreshToken);
    if (!refreshed) {
        return {token: null, reason: 'token_expired'};
    }

    await prisma.gmailConnection.update({
        where: {userId},
        data: {
            accessToken: refreshed.accessToken,
            tokenExpiresAt: refreshed.expiresAt,
        },
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
