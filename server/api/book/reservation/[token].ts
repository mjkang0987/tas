import type {NextApiRequest, NextApiResponse} from 'next';

import {
    findDeletedBookingByPublicToken,
    findReservationByPublicToken,
    loadBookingSettings,
} from '../booking-helpers';
import {prisma} from '../../../db/prisma';
import {toDateKey} from '../../../db/mappers';

// 공개(비로그인) 예약 조회. 관리 링크 토큰으로만 접근하며, 고객 본인 예약의 최소 정보만 반환한다.
// 다른 고객·매장 데이터는 절대 노출하지 않는다(토큰이 곧 접근 권한).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const reservation = await findReservationByPublicToken(token);
    // 예약이 없으면 오너가 영구 삭제한 건일 수 있다. 흔적이 남아 있으면 취소된 것으로 보여 준다
    // (링크를 받은 고객에게 "찾을 수 없음"만 띄우면 취소인지 잘못된 링크인지 알 수 없다).
    if (!reservation) return respondDeleted(token, res);

    const pendingChange = reservation.pendingAction === 'change' ? reservation.pendingPayloadJson : null;

    // 상태별 오너 안내문구(#139): 확정(active)·취소(cancelled)일 때만 매장 설정에서 조회.
    // 알림 발송이 아니라, 고객이 이 조회 페이지를 열 때 상태에 맞춰 표시된다.
    let statusMessage: {text: string | null; i18n: unknown} | null = null;
    if (reservation.status === 'active' || reservation.status === 'cancelled') {
        const settings = await loadBookingSettings(reservation.storeId);
        statusMessage = reservation.status === 'active'
            ? {text: settings.confirmText ?? null, i18n: settings.confirmI18n ?? null}
            : {text: settings.cancelText ?? null, i18n: settings.cancelI18n ?? null};
    }

    return res.status(200).json({
        status: reservation.status,
        date: toDateKey(reservation.date),
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        serviceSummary: reservation.serviceSummary,
        assigneeName: reservation.assignee?.name ?? null,
        customerName: reservation.customer?.name ?? null,
        storeName: reservation.store.name,
        shopType: reservation.store.shopType,
        slug: reservation.store.bookingSlug,
        pendingAction: reservation.pendingAction,
        pendingChange,
        pendingRequestedAt: reservation.pendingRequestedAt?.toISOString() ?? null,
        // 오너가 남긴 승인/거절/취소 사유(선택). 없으면 null → 고객 페이지가 상태별 기본문구로 대체.
        decisionReason: reservation.decisionReason ?? null,
        // 변경 요청은 active 예약만. 취소 요청은 확정 대기(requested)도 가능(신청 철회).
        canRequest: reservation.status === 'active',
        canCancel: reservation.status === 'active' || reservation.status === 'requested',
        statusMessage,
    });
}

// 삭제된 예약의 흔적(DeletedBooking)으로 응답. 고객 입장에서 삭제와 취소는 결과가 같으므로
// 'cancelled'로 내려 기존 취소 화면(배지·안내문구)을 그대로 태운다. 담당자·고객 이름은 흔적에
// 남기지 않으므로 null이고, 변경·취소 요청은 대상이 없어 둘 다 막는다.
async function respondDeleted(token: string, res: NextApiResponse) {
    const deleted = await findDeletedBookingByPublicToken(token);
    if (!deleted) return res.status(404).json({error: 'not_found'});

    const store = await prisma.store.findUnique({
        where: {id: deleted.storeId},
        select: {name: true, shopType: true, bookingSlug: true},
    });
    if (!store) return res.status(404).json({error: 'not_found'});

    const settings = await loadBookingSettings(deleted.storeId);

    return res.status(200).json({
        status: 'cancelled',
        date: toDateKey(deleted.date),
        startTime: deleted.startTime,
        endTime: deleted.endTime,
        serviceSummary: deleted.serviceSummary,
        assigneeName: null,
        customerName: null,
        storeName: store.name,
        shopType: store.shopType,
        slug: store.bookingSlug,
        pendingAction: 'none',
        pendingChange: null,
        pendingRequestedAt: null,
        decisionReason: deleted.reason ?? null,
        canRequest: false,
        canCancel: false,
        statusMessage: {text: settings.cancelText ?? null, i18n: settings.cancelI18n ?? null},
    });
}
