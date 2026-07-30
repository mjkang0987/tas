import {prisma} from '../../db/prisma';

interface GoogleTokens {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
}

export async function saveGmailConnection(
    storeId: string,
    connectedByUserId: string,
    email: string,
    tokens: GoogleTokens,
): Promise<void> {
    const update: Record<string, unknown> = {
        email,
        connectedByUserId,
        accessToken: tokens.accessToken,
        tokenExpiresAt: tokens.expiresAt,
    };

    // refresh 토큰은 재동의 없이는 다시 내려오지 않으므로 값이 있을 때만 갱신
    if (tokens.refreshToken) {
        update.refreshToken = tokens.refreshToken;
    }

    await prisma.gmailConnection.upsert({
        where: {storeId},
        update,
        create: {
            storeId,
            connectedByUserId,
            email,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
        },
    });
}

export async function getGmailConnection(storeId: string): Promise<{email: string; connectedByUserId: string | null} | null> {
    const connection = await prisma.gmailConnection.findUnique({
        where: {storeId},
        select: {email: true, connectedByUserId: true},
    });
    return connection;
}

export async function deleteGmailConnection(storeId: string): Promise<void> {
    await prisma.gmailConnection.deleteMany({where: {storeId}});
}

type TokenFailReason = 'not_connected' | 'no_refresh_token' | 'token_expired';

export async function getValidAccessTokenWithReason(storeId: string): Promise<{token: string | null; reason: TokenFailReason | null}> {
    const connection = await prisma.gmailConnection.findUnique({
        where: {storeId},
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
    // 동기화 한 번이 몇 분씩 걸릴 수 있다 — 월말엔 재스캔 대상이 4주치로 쌓이고, 일시적 실패에는
    // 건당 최대 4.6초 백오프 재시도가 붙는다. 버퍼가 60초면 "시작 시점엔 유효"했던 토큰이
    // 실행 도중 만료돼 뒷부분이 통째로 401로 떨어진다. 여유를 5분으로 둔다.
    const bufferMs = 5 * 60_000;
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
        where: {storeId},
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
