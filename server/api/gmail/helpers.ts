import type {PaymentMethod as DbPaymentMethod} from '../../../client/prisma/generated/prisma/client';

import {prisma} from '../../db/prisma';

const NAVER_PAYMENT_MAP: Record<string, DbPaymentMethod> = {
    '네이버페이 머니': 'naver_pay',
    '네이버페이 포인트': 'naver_pay',
    '네이버페이 카드': 'card',
    '네이버페이': 'naver_pay',
    '카드': 'card',
    '현금': 'cash',
};

export function mapNaverPaymentMethod(str: string): DbPaymentMethod {
    const normalized = str.trim();
    return NAVER_PAYMENT_MAP[normalized] ?? 'naver_pay';
}

export function calcEndTime(startTime: string, totalDurationMin: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const totalMin = h * 60 + m + totalDurationMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// Gmail 색인 지연(수신됨 ↔ 검색에 잡힘) 완충용 겹침. after: 는 Gmail '수신 시각'으로 필터하고
// 워터마크는 실행 '시작' 시각이므로, 못 본 메일의 수신 시각은 항상 워터마크보다 뒤다.
// 즉 발신 지연·SMTP 재시도는 문제가 안 되고 색인 지연만 남는다 — 보통 초~분 단위라 1일로 충분하다.
const OVERLAP_MS = 24 * 60 * 60 * 1000;

function monthStartSeconds(): number {
    const now = new Date();
    return Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
}

// 네이버 메일을 어느 시점 이후로 조회할지. 중복은 naverBookingId unique(P2002)가 흡수하므로
// 범위가 겹치는 건 안전하고, 범위가 좁아지는 것만 위험하다(유실).
export async function getLastNaverSyncTimestamp(storeId: string): Promise<number> {
    const connection = await prisma.gmailConnection.findUnique({
        where: {storeId},
        select: {lastSyncedAt: true},
    });

    // 미동기화(신규·기존 매장 전체) → 종전대로 이번 달 1일. 안전한 폴백이라 백필이 필요 없다.
    if (!connection?.lastSyncedAt) return monthStartSeconds();

    // now 로 상한 클램프: 시계 문제나 잘못된 쓰기로 lastSyncedAt 이 미래가 되면 조회 범위가
    // 비어 동기화가 영구 정지하는데, 알림도 안 떠서 아무도 모른다.
    const from = Math.min(connection.lastSyncedAt.getTime(), Date.now()) - OVERLAP_MS;
    return Math.floor(from / 1000);
}

// 동기화가 끝까지 정상 완주했을 때만 워터마크를 전진시킨다. 전진 판단은 호출부 책임이며,
// 저장하는 값은 '실행 시작' 시각이다 — 종료 시각을 쓰면 실행 중에 도착한 메일이
// (messages.list 스냅샷에 없었으므로) 다음 범위에서 빠진다.
// 쓰기 실패는 삼킨다: 못 써도 다음 실행이 더 넓게 스캔할 뿐(안전한 방향).
export async function markNaverSyncCompleted(storeId: string, runStartedAt: Date): Promise<void> {
    try {
        await prisma.gmailConnection.update({
            where: {storeId},
            data: {lastSyncedAt: runStartedAt},
        });
    } catch (err) {
        console.error('[naver-sync] 동기화 워터마크 갱신 실패', storeId, err);
    }
}
