import {prisma} from '../db/prisma';

// 환경별 Slack 채널 분리.
// 운영(NODE_ENV=production, 클라우드 Docker)은 SLACK_WEBHOOK_URL,
// 그 외(로컬 next dev)는 SLACK_WEBHOOK_URL_DEV를 사용한다.
// 개발에서 운영 변수로 폴백하지 않는다 — 로컬이 실수로 운영 채널을 때리는 사고를 원천 차단.
function resolveWebhookUrl(): string | undefined {
    return process.env.NODE_ENV === 'production'
        ? process.env.SLACK_WEBHOOK_URL
        : process.env.SLACK_WEBHOOK_URL_DEV;
}

// Slack Incoming Webhook 알림 전송.
// webhook 미설정 시 no-op. 전송 실패는 호출부 동작에 영향을 주지 않도록 삼킨다.
export async function notifySlack(text: string): Promise<void> {
    const url = resolveWebhookUrl();
    if (!url) return;

    try {
        await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text}),
        });
    } catch (err) {
        console.error('[slack] 알림 전송 실패:', err);
    }
}

// 지정한 매장(SLACK_STORE_ID)의 알림만 전송. 웹훅이 전역(단일 채널)이라
// 다른 매장 알림이 섞이지 않도록, 설정된 매장 외에는 보내지 않는다.
// SLACK_STORE_ID 미설정 시 모든 매장 전송(매장명 prefix 부착).
export async function notifySlackForStore(storeId: string, text: string): Promise<void> {
    if (!resolveWebhookUrl()) return;

    const allowedStoreId = process.env.SLACK_STORE_ID;
    if (allowedStoreId && storeId !== allowedStoreId) return;

    const store = await prisma.store.findUnique({where: {id: storeId}, select: {name: true}});
    const prefix = store?.name ? `*[${store.name}]* ` : '';
    await notifySlack(prefix + text);
}
