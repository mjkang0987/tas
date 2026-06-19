// Slack Incoming Webhook 알림 전송.
// SLACK_WEBHOOK_URL 미설정 시 no-op. 전송 실패는 호출부 동작에 영향을 주지 않도록 삼킨다.
export async function notifySlack(text: string): Promise<void> {
    const url = process.env.SLACK_WEBHOOK_URL;
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
