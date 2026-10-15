// 브라우저에서 터진 렌더 오류를 서버로 한 줄 보낸다. 서버가 ops 슬랙으로 올린다.
//
// 보내는 건 레이어 이름·에러·스택·경로뿐이다. 고객 데이터는 애초에 들어가지 않는다 —
// 에러 경계가 들고 있는 정보가 그게 전부다.
export function reportClientError(layer: string, error: unknown, stack?: string): void {
    if (typeof window === 'undefined') return;

    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

    // 보고가 실패해도 화면은 그대로 가야 한다 — 여기서 또 던지면 경계가 제 할 일을 못 한다.
    try {
        void fetch('/api/client-errors', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            // 사용자가 곧바로 페이지를 떠나도 전송이 끊기지 않게.
            keepalive: true,
            body: JSON.stringify({
                layer,
                message,
                stack: stack ?? (error instanceof Error ? error.stack ?? '' : ''),
                path: window.location.pathname,
            }),
        }).catch(() => {});
    } catch {
        // 무시한다.
    }
}
