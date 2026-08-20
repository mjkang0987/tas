// 서버 반영 실패를 삼키지 않는지 고정한다.
//
// 예전 구현은 `fetch(...).then(() => undefined).catch(() => {})` 였다. `fetch` 는
// 500·403·401 에도 정상 resolve 하므로 `res.ok` 를 보지 않으면 실패가 `.catch` 에
// 걸리지 않는다. 즉 **성공으로 처리됐다.** 화면은 저장된 것처럼 남고, 사용자는
// 새로고침하고 나서야 사라진 것을 알았다. 이 파일은 그 회귀를 막는다.

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {jsonRequest, requestServerSync} from './calendarStoreHelpers';
import {useToastStore} from './toastStore';

function toastMessages(): string[] {
    return useToastStore.getState().toasts.map((t) => t.message);
}

function response(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: {'Content-Type': 'application/json'},
    });
}

beforeEach(() => {
    useToastStore.setState({toasts: []});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('requestServerSync', () => {
    it('2xx 면 true 를 주고 알림을 띄우지 않는다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, {ok: true})));

        await expect(requestServerSync('/api/x', jsonRequest('PUT', {}), '실패')).resolves.toBe(true);
        expect(toastMessages()).toEqual([]);
    });

    it('500 이면 false 를 주고 알림을 띄운다 — 예전엔 여기가 성공으로 흘러갔다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(500, {error: '서버 오류'})));

        await expect(requestServerSync('/api/x', jsonRequest('PUT', {}), '저장 실패')).resolves.toBe(false);
        expect(toastMessages()).toEqual(['저장 실패']);
    });

    it('403 도 마찬가지다 — 권한 없음이 조용히 지나가면 안 된다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, {error: '권한 없음'})));

        await expect(requestServerSync('/api/x', jsonRequest('DELETE', {id: 1}), '삭제 실패')).resolves.toBe(false);
        expect(toastMessages()).toEqual(['삭제 실패']);
    });

    it('네트워크 오류도 알린다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

        await expect(requestServerSync('/api/x', jsonRequest('POST', {}), '전송 실패')).resolves.toBe(false);
        expect(toastMessages()).toEqual(['전송 실패']);
    });

    it('알림 종류는 error 다 — 성공 토스트와 같은 색이면 실패로 안 읽힌다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(500)));

        await requestServerSync('/api/x', jsonRequest('PUT', {}), '저장 실패');

        expect(useToastStore.getState().toasts[0]?.type).toBe('error');
    });

    it('본문이 JSON 이 아니어도 죽지 않는다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', {status: 502})));

        await expect(requestServerSync('/api/x', jsonRequest('PUT', {}), '저장 실패')).resolves.toBe(false);
        expect(toastMessages()).toEqual(['저장 실패']);
    });
});

describe('jsonRequest', () => {
    it('메서드·헤더·본문을 한 벌로 만든다', () => {
        expect(jsonRequest('PATCH', {id: 7})).toEqual({
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: '{"id":7}',
        });
    });
});
