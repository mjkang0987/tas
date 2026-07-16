import type {NextApiRequest, NextApiResponse} from 'next';

import {findReservationByPublicToken} from '../booking-helpers';

// 공개(비로그인) 예약 조회. 관리 링크 토큰으로만 접근하며, 고객 본인 예약의 최소 정보만 반환한다.
// 다른 고객·매장 데이터는 절대 노출하지 않는다(토큰이 곧 접근 권한).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const reservation = await findReservationByPublicToken(token);
    if (!reservation) return res.status(404).json({error: 'not_found'});

    const pendingChange = reservation.pendingAction === 'change' ? reservation.pendingPayloadJson : null;

    return res.status(200).json({
        status: reservation.status,
        date: reservation.date.toISOString().slice(0, 10),
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
        // active 예약만 변경/취소 요청 가능
        canRequest: reservation.status === 'active',
    });
}
