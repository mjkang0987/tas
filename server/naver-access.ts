import {prisma} from './db/prisma';
import {isNaverBookingAllowedSlug} from '../client/features/store-settings/naver-access';

// 이 매장에 네이버예약 연동을 노출할지의 최종 판정(서버 단일 소스).
//
// 허용 슬러그 외에 **이미 Gmail 연동을 붙여 쓰는 매장**도 통과시킨다.
// 이 게이트의 최악 회귀는 "쓰던 매장이 연동을 잃는 것"인데, 슬러그는 오너가 언제든 바꾸거나
// 비워둘 수 있어 그것만 믿으면 실제 사용 중인 매장을 끊을 수 있다.
// 새 연동 시작(`/api/gmail/connect`)은 이 판정으로 막으므로, 이 예외가 우회로가 되지는 않는다
// — 허용되지 않은 매장은 애초에 GmailConnection 을 만들 수 없다.
export async function isNaverBookingEnabledStore(storeId: string | null | undefined): Promise<boolean> {
    if (!storeId) return false;

    try {
        const store = await prisma.store.findUnique({
            where: {id: storeId},
            select: {bookingSlug: true, gmailConnection: {select: {id: true}}},
        });
        if (!store) return false;

        return isNaverBookingAllowedSlug(store.bookingSlug) || store.gmailConnection !== null;
    } catch {
        // 마이그레이션 미적용 등으로 조회가 실패하면 노출하지 않는 쪽으로 (앱 부팅은 유지)
        return false;
    }
}
