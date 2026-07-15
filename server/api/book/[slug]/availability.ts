import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../db/prisma';
import {getAvailableSlots, isValidDateStr} from '../slots-service';

// 공개(비로그인) 예약 슬롯 조회. 고객/예약 상세는 절대 반환하지 않고 가능한 시작시각만 준다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug.toLowerCase() : '';
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    const duration = Number(req.query.duration);
    const assigneeId = typeof req.query.assigneeId === 'string' && req.query.assigneeId ? req.query.assigneeId : null;

    if (!slug) return res.status(404).json({error: 'not_found'});
    if (!isValidDateStr(date)) return res.status(400).json({error: 'invalid_date'});
    if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 60) {
        return res.status(400).json({error: 'invalid_duration'});
    }

    const store = await prisma.store.findFirst({
        where: {bookingSlug: slug, useOnlineBooking: true},
        select: {id: true},
    });
    if (!store) return res.status(404).json({error: 'not_found'});

    const {slots} = await getAvailableSlots({storeId: store.id, date, duration, assigneeId});
    return res.status(200).json({date, slots});
}
