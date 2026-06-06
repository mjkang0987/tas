export const GMAIL_API = 'https://www.googleapis.com/gmail/v1/users/me';

let rateLimitUntil = 0;

function isRateLimited(): boolean {
    return Date.now() < rateLimitUntil;
}

function handleRateLimit(res: Response): void {
    if (res.status === 429) {
        // 기본 15분 쿨다운, Retry-After 헤더가 있으면 사용
        rateLimitUntil = Date.now() + 15 * 60 * 1000;
    }
}

export async function listNaverBookingEmails(
    accessToken: string,
    afterTimestamp: number,
): Promise<string[]> {
    if (isRateLimited()) return [];

    const query = `from:naverbooking_noreply@navercorp.com 예약 확정 after:${afterTimestamp}`;

    const url = new URL(`${GMAIL_API}/messages`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '500');

    const res = await fetch(url.toString(), {
        headers: {Authorization: `Bearer ${accessToken}`},
    });

    if (!res.ok) {
        handleRateLimit(res);
        console.error('[gmail-client] list failed', res.status, await res.text());
        return [];
    }

    const json = await res.json() as {messages?: Array<{id: string}>};
    return (json.messages ?? []).map((m) => m.id);
}

export async function listNaverCancellationEmails(
    accessToken: string,
    afterTimestamp: number,
): Promise<string[]> {
    if (isRateLimited()) return [];

    const query = `from:naverbooking_noreply@navercorp.com 취소 after:${afterTimestamp}`;

    const url = new URL(`${GMAIL_API}/messages`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '500');

    const res = await fetch(url.toString(), {
        headers: {Authorization: `Bearer ${accessToken}`},
    });

    if (!res.ok) {
        handleRateLimit(res);
        console.error('[gmail-client] list cancellations failed', res.status, await res.text());
        return [];
    }

    const json = await res.json() as {messages?: Array<{id: string}>};
    return (json.messages ?? []).map((m) => m.id);
}

export async function getEmailContent(
    accessToken: string,
    messageId: string,
): Promise<string | null> {
    if (isRateLimited()) return null;

    const url = `${GMAIL_API}/messages/${messageId}?format=full`;

    const res = await fetch(url, {
        headers: {Authorization: `Bearer ${accessToken}`},
    });

    if (!res.ok) {
        handleRateLimit(res);
        console.error('[gmail-client] get message failed', res.status);
        return null;
    }

    const json = await res.json() as GmailMessage;
    return extractHtmlBody(json.payload);
}

interface GmailMessagePart {
    mimeType: string;
    body?: {data?: string};
    parts?: GmailMessagePart[];
}

interface GmailMessage {
    payload: GmailMessagePart;
}

function extractHtmlBody(part: GmailMessagePart): string | null {
    if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64Url(part.body.data);
    }

    if (part.parts) {
        for (const child of part.parts) {
            const html = extractHtmlBody(child);
            if (html) return html;
        }
    }

    return null;
}

function decodeBase64Url(encoded: string): string {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
}
