import {prisma} from '../db/prisma';

// Slack 채널 분기.
// - biz: 예약·문의 등 매장 비즈니스 알림. 운영(production)은 SLACK_WEBHOOK_URL,
//   그 외(로컬 next dev)는 SLACK_WEBHOOK_URL_DEV.
// - ops: 서버 에러·동기화 실패 등 운영/시스템 알림. 운영은 SLACK_WEBHOOK_URL_OPS,
//   그 외는 SLACK_WEBHOOK_URL_OPS_DEV.
// 개발에서 운영 변수로 폴백하지 않는다 — 로컬이 실수로 운영 채널을 때리는 사고를 원천 차단.
type SlackChannel = 'biz' | 'ops';

function resolveWebhookUrl(channel: SlackChannel): string | undefined {
    const isProd = process.env.NODE_ENV === 'production';
    if (channel === 'ops') {
        return isProd ? process.env.SLACK_WEBHOOK_URL_OPS : process.env.SLACK_WEBHOOK_URL_OPS_DEV;
    }
    return isProd ? process.env.SLACK_WEBHOOK_URL : process.env.SLACK_WEBHOOK_URL_DEV;
}

// 실제 전송. 전송 실패는 호출부 동작에 영향을 주지 않도록 삼킨다.
async function postToSlack(url: string, text: string): Promise<void> {
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

// 비즈니스(biz) 채널 알림. webhook 미설정 시 no-op.
export async function notifySlack(text: string): Promise<void> {
    const url = resolveWebhookUrl('biz');
    if (!url) return;
    await postToSlack(url, text);
}

// 운영(ops) 채널 알림. 에러·동기화 실패 등 서비스 건강 신호 전용.
// biz와 분리된 webhook을 쓰며, 미설정 시 no-op.
export async function notifySlackOps(text: string): Promise<void> {
    const url = resolveWebhookUrl('ops');
    if (!url) return;
    await postToSlack(url, text);
}

// 운영 에러를 "어디서 / 어떤 에러" 형태로 ops 채널에 알린다.
// context: 발생 위치(예: 'PUT /api/customers'), err: 잡은 예외.
export async function notifySlackOpsError(context: string, err: unknown): Promise<void> {
    const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await notifySlackOps(`🛑 *운영 에러* \`${env}\`\n• 위치: ${context}\n• 내용: ${detail}`);
}

// 지정한 매장(SLACK_STORE_ID)의 알림만 biz 채널로 전송. 웹훅이 전역(단일 채널)이라
// 다른 매장 알림이 섞이지 않도록, 설정된 매장 외에는 보내지 않는다.
// SLACK_STORE_ID 미설정 시 모든 매장 전송(매장명 prefix 부착).
export async function notifySlackForStore(storeId: string, text: string): Promise<void> {
    if (!resolveWebhookUrl('biz')) return;

    const allowedStoreId = process.env.SLACK_STORE_ID;
    if (allowedStoreId && storeId !== allowedStoreId) return;

    const store = await prisma.store.findUnique({where: {id: storeId}, select: {name: true}});
    const prefix = store?.name ? `*[${store.name}]* ` : '';
    await notifySlack(prefix + text);
}
