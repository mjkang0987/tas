export const GMAIL_API = 'https://www.googleapis.com/gmail/v1/users/me';

// 일시적 실패 재시도 간격. Gmail은 순간 burst에 403 rateLimitExceeded를 흩뿌리는데,
// 재시도가 없으면 그 메일이 이번 폴링에서 통째로 버려진다(2026-07 동기화 실패 원인).
// 429는 여기서 재시도하지 않는다 — handleRateLimit이 쿨다운을 걸어 호출부 전체가 멈춰야 한다.
const RETRY_DELAYS_MS = [400, 1200, 3000];

let rateLimitUntil = 0;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 재시도해서 나아질 수 있는 실패인지. 403은 사유에 따라 갈린다 —
// rateLimitExceeded/userRateLimitExceeded는 일시적이지만, insufficientPermissions는
// 스코프 문제라 몇 번을 다시 불러도 같다.
function isRetryableStatus(status: number, detail: string): boolean {
    if (status >= 500) return true;
    if (status === 403) return /rateLimit|quotaExceeded|backendError/i.test(detail);
    return false;
}

function isRateLimited(): boolean {
    return Date.now() < rateLimitUntil;
}

function handleRateLimit(res: Response): void {
    if (res.status === 429) {
        // 기본 15분 쿨다운, Retry-After 헤더가 있으면 사용
        rateLimitUntil = Date.now() + 15 * 60 * 1000;
    }
}

// 검색 결과가 PAGE_SIZE를 넘으면 nextPageToken으로 이어 받는다. 예전엔 첫 페이지만 읽어서
// 월 500건을 넘는 매장은 오래된 메일이 조용히 잘려나갔다.
// MAX_PAGES는 폭주 방지용 상한 — 도달하면 경고를 남긴다.
const PAGE_SIZE = 500;
const MAX_PAGES = 10;

async function listMessageIds(
    accessToken: string,
    query: string,
    label: string,
): Promise<string[]> {
    if (isRateLimited()) return [];

    const ids: string[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
        const url = new URL(`${GMAIL_API}/messages`);
        url.searchParams.set('q', query);
        url.searchParams.set('maxResults', String(PAGE_SIZE));
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const res = await fetch(url.toString(), {
            headers: {Authorization: `Bearer ${accessToken}`},
        });

        if (!res.ok) {
            handleRateLimit(res);
            console.error(`[gmail-client] ${label} 목록 조회 실패`, res.status, await readErrorDetail(res));
            // 이미 받은 페이지는 살린다 — 전부 버리면 그 폴링이 통째로 비어버린다.
            return ids;
        }

        const json = await res.json() as {messages?: Array<{id: string}>; nextPageToken?: string};
        for (const m of json.messages ?? []) ids.push(m.id);

        if (!json.nextPageToken) return ids;
        pageToken = json.nextPageToken;
    }

    console.warn(`[gmail-client] ${label} 목록이 상한(${MAX_PAGES}페이지)에 도달해 이후를 건너뜀`, ids.length);
    return ids;
}

export async function listNaverBookingEmails(
    accessToken: string,
    afterTimestamp: number,
): Promise<string[]> {
    return listMessageIds(
        accessToken,
        `from:naverbooking_noreply@navercorp.com 예약 확정 after:${afterTimestamp}`,
        '예약',
    );
}

export async function listNaverCancellationEmails(
    accessToken: string,
    afterTimestamp: number,
): Promise<string[]> {
    return listMessageIds(
        accessToken,
        `from:naverbooking_noreply@navercorp.com 취소 after:${afterTimestamp}`,
        '취소',
    );
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

    for (let attempt = 0; ; attempt++) {
        const canRetry = attempt < RETRY_DELAYS_MS.length;

        let res: Response;
        try {
            res = await fetch(url, {
                headers: {Authorization: `Bearer ${accessToken}`},
            });
        } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            if (canRetry) {
                await sleep(RETRY_DELAYS_MS[attempt]);
                continue;
            }
            console.error('[gmail-client] 메일 조회 네트워크 오류', messageId, detail);
            return {ok: false, failure: {reason: 'network', detail}};
        }

        if (res.ok) {
            const json = await res.json() as GmailMessage;
            const html = extractHtmlBody(json.payload);
            if (!html) {
                console.error('[gmail-client] 메일에 HTML 파트가 없음', messageId);
                return {ok: false, failure: {reason: 'no_html_part'}};
            }
            return {ok: true, html};
        }

        handleRateLimit(res);
        const detail = await readErrorDetail(res);

        if (canRetry && isRetryableStatus(res.status, detail)) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            continue;
        }

        console.error('[gmail-client] 메일 조회 실패', messageId, res.status, detail, `시도 ${attempt + 1}회`);
        return {ok: false, failure: {reason: 'http', status: res.status, detail}};
    }
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
