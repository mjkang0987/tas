import type {NextApiRequest, NextApiResponse} from 'next';

import {getApiSession, requireRole} from '../auth/api-session';
import {notifySlackOps} from '../notify/slack';

// ⚠️ 임시 검증용 — 배포된 앱이 실제로 ops 채널까지 전송하는지 1회 확인용.
// 확인 후 제거할 것(이 파일 + client/pages/api/ops-ping.ts).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);
    if (!requireRole(session, 'owner', res)) return;

    await notifySlackOps('🧪 운영 ops 핑 — 앱→Slack 경로 확인 (임시 엔드포인트)');
    return res.status(200).json({ok: true});
}
