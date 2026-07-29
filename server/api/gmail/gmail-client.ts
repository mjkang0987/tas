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

// 메일 본문 조회 실패 원인. 예전엔 전부 null 하나로 뭉개져 있어서, 알림에 messageId만 남고
// "HTTP 403인지 / 메일에 HTML 파트가 없는지"를 사후에 구분할 수 없었다(2026-07 동기화 실패 조사).
export type EmailFetchFailure =
    | {reason: 'http'; status: number; detail: string}
    | {reason: 'no_html_part'}
    | {reason: 'network'; detail: string}
    | {reason: 'cooldown'};

export type EmailFetchResult =
    | {ok: true; html: string}
    | {ok: false; failure: EmailFetchFailure};

export function describeEmailFetchFailure(failure: EmailFetchFailure): string {
    switch (failure.reason) {
        case 'http':
            return `HTTP ${failure.status}${failure.detail ? ` (${failure.detail})` : ''}`;
        case 'no_html_part':
            return 'HTML 본문 파트 없음';
        case 'network':
            return `네트워크 오류 (${failure.detail})`;
        case 'cooldown':
            return 'Gmail 호출 제한 쿨다운 중';
    }
}

// Google 에러 응답의 reason(예: rateLimitExceeded, insufficientPermissions)을 뽑는다.
// 본문을 소비하므로 응답당 한 번만 호출할 것.
async function readErrorDetail(res: Response): Promise<string> {
    try {
        const text = await res.text();
        const json = JSON.parse(text) as {
            error?: {errors?: Array<{reason?: string}>; status?: string; message?: string};
        };
        return json.error?.errors?.[0]?.reason
            ?? json.error?.status
            ?? json.error?.message
            ?? text.slice(0, 200);
    } catch {
        return '';
    }
}

export async function getEmailContent(
    accessToken: string,
    messageId: string,
): Promise<EmailFetchResult> {
    if (isRateLimited()) return {ok: false, failure: {reason: 'cooldown'}};

    const url = `${GMAIL_API}/messages/${messageId}?format=full`;

    let res: Response;
    try {
        res = await fetch(url, {
            headers: {Authorization: `Bearer ${accessToken}`},
        });
    } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error('[gmail-client] 메일 조회 네트워크 오류', messageId, detail);
        return {ok: false, failure: {reason: 'network', detail}};
    }

    if (!res.ok) {
        handleRateLimit(res);
        const detail = await readErrorDetail(res);
        console.error('[gmail-client] 메일 조회 실패', messageId, res.status, detail);
        return {ok: false, failure: {reason: 'http', status: res.status, detail}};
    }

    const json = await res.json() as GmailMessage;
    const html = extractHtmlBody(json.payload);
    if (!html) {
        console.error('[gmail-client] 메일에 HTML 파트가 없음', messageId);
        return {ok: false, failure: {reason: 'no_html_part'}};
    }

    return {ok: true, html};
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
