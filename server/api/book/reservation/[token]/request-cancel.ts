import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../../db/prisma';
import {toDateKey} from '../../../../db/mappers';
import {notifySlackForStore} from '../../../../notify/slack';
import {findReservationByPublicToken} from '../../booking-helpers';

// 공개(비로그인) 예약 취소 "요청". 즉시 취소가 아니라 오너 승인 대기 상태로 전환한다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const reservation = await findReservationByPublicToken(token);
    if (!reservation) return res.status(404).json({error: 'not_found'});
    // 확정된(active) 예약뿐 아니라 확정 대기(requested) 예약도 취소 요청 가능(고객이 신청 철회).
    if (reservation.status !== 'active' && reservation.status !== 'requested') return res.status(409).json({error: 'not_active'});
    if (reservation.pendingAction !== 'none') return res.status(409).json({error: 'already_pending'});

    await prisma.reservation.update({
        where: {id: reservation.id},
        data: {pendingAction: 'cancel', pendingPayloadJson: undefined, pendingRequestedAt: new Date()},
    });

    // 오너 알림(커밋 후 격리 — 실패해도 요청 접수 성공에 영향 없음)
    try {
        await notifySlackForStore(reservation.storeId,
            `🔔 *예약 취소 요청*\n• 날짜: ${toDateKey(reservation.date)}`
            + `\n• 시간: ${reservation.startTime}~${reservation.endTime}`
            + `\n• 시술: ${reservation.serviceSummary}`
            + `\n• 고객: ${reservation.customer?.name ?? ''}${reservation.customer?.tel ? ` (${reservation.customer.tel})` : ''}`
            + `\n앱에서 수락/거절해 주세요.`,
        );
    } catch { /* 알림 실패는 무시 */ }

    return res.status(200).json({ok: true, pendingAction: 'cancel'});
}
