import type {NextApiRequest, NextApiResponse} from 'next';

import {notifySlackOps} from '../notify/slack';

// 브라우저에서 터진 렌더 오류를 ops 채널로 올린다.
//
// 서버 500 은 이미 notifySlackOpsError 로 들어오는데 브라우저 크래시만 사각지대였다.
// 제품 안에 대시보드를 두지 않는 건 설정 화면이 "매장 사장님" 자리이기 때문이다 —
// 스택 트레이스는 사장님이 보고 할 수 있는 게 없고, 운영자용 화면을 따로 두려면
// 역할 체계(현재는 매장 단위 owner/manager/staff 뿐)부터 새로 만들어야 한다.

// 본문 크기 상한(bodyParser)은 라우트 파일(client/pages/api/client-errors.ts)에 있다 —
// Next 가 정적으로 읽어야 해서 재export 가 안 된다.

// 스택은 운영에서 난독화돼 길어봐야 못 읽는다. 알림이 스크롤되지 않게 앞부분만 남긴다.
const LIMIT = {layer: 100, message: 500, path: 300, userAgent: 200, stack: 400} as const;

// 같은 오류가 반복돼도 채널을 덮지 않게 쿨다운을 건다.
// 인스턴스 메모리라 Cloud Run 인스턴스 수만큼 중복될 수 있다 — 그 정도 중복은
// 받아들이고 공유 저장소(DB·Redis)를 들이지 않는다.
const COOLDOWN_MS = 10 * 60 * 1000;
const MAX_KEYS = 200;
const lastSentAt = new Map<string, number>();

// 쿨다운은 `레이어|메시지` 단위라, 메시지를 매번 바꿔 보내면 그만큼 알림이 나간다.
// 인증을 걸 수 없는 공개 엔드포인트이므로(비로그인 크래시도 받아야 한다) 창 단위
// 총량에도 상한을 둔다. 넘으면 조용히 버린다 — 채널이 잠기는 것보다 낫다.
const MAX_SENDS_PER_WINDOW = 20;
let windowStartedAt = 0;
let sentInWindow = 0;

function clip(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const message = clip(req.body?.message, LIMIT.message);
    if (!message) {
        return res.status(400).json({error: 'message 가 필요합니다.'});
    }

    const layer = clip(req.body?.layer, LIMIT.layer) || '알 수 없음';
    const path = clip(req.body?.path, LIMIT.path);
    const stack = clip(req.body?.stack, LIMIT.stack);
    const userAgent = clip(req.headers['user-agent'], LIMIT.userAgent);

    const key = `${layer}|${message}`;
    const now = Date.now();

    if (now - (lastSentAt.get(key) ?? 0) < COOLDOWN_MS) {
        return res.status(202).json({skipped: true});
    }
    if (now - windowStartedAt >= COOLDOWN_MS) {
        windowStartedAt = now;
        sentInWindow = 0;
    }
    if (sentInWindow >= MAX_SENDS_PER_WINDOW) {
        return res.status(202).json({skipped: true, reason: 'rate-limited'});
    }

    // 키가 무한정 쌓이지 않게 한도를 넘으면 통째로 비운다(쿨다운이 한 번 풀릴 뿐이다).
    if (lastSentAt.size >= MAX_KEYS) lastSentAt.clear();
    lastSentAt.set(key, now);
    sentInWindow += 1;

    // 개발 서버(next dev)는 슬랙으로 보내지 않는다 — 고치는 중인 화면의 오류(HMR 등)가 운영 알림처럼 와서 헷갈렸다. 서버 로그에만.
    if (process.env.NODE_ENV !== 'production') {
        console.warn(`[client-error] ${layer}: ${message}${path ? ` (${path})` : ''}`);
        return res.status(202).json({skipped: true, reason: 'dev'});
    }
    await notifySlackOps(
        '🧨 *브라우저 오류* `prod`'
        + `\n• 레이어: ${layer}`
        + `\n• 내용: ${message}`
        + (path ? `\n• 경로: ${path}` : '')
        + (userAgent ? `\n• 브라우저: ${userAgent}` : '')
        // 운영 번들은 스택이 난독화돼 있다. 그래도 청크·오프셋이 남아 빌드와 대조할 수 있다.
        + (stack ? `\n\`\`\`${stack}\`\`\`` : ''),
    );

    return res.status(202).json({sent: true});
}
