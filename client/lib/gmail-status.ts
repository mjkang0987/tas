export interface GmailStatus {
    connected: boolean;
    email: string | null;
}

let cached: Promise<GmailStatus> | null = null;

// 여러 컴포넌트가 동시에 상태를 조회해도 요청은 페이지 로드당 1회만 나가도록 캐시
export function fetchGmailStatus(force = false): Promise<GmailStatus> {
    if (force || !cached) {
        cached = fetch('/api/gmail/status')
            .then((res) => (res.ok ? res.json() as Promise<GmailStatus> : {connected: false, email: null}))
            .catch(() => ({connected: false, email: null}));
    }
    return cached;
}
