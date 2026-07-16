import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../db/prisma';
import {normalizeTel} from '../../../../client/features/customers/model';
import {findBookableStore, nowKst} from '../booking-helpers';

interface LookupBody {
    name?: unknown;
    tel?: unknown;
}

// 공개(비로그인) 예약 조회. 이름 + 전화번호로 본인 예약을 찾아 관리 토큰을 돌려준다.
// 전화번호 단독 조회는 열람 위험(번호만 알면 남의 예약 노출)이 있어 이름까지 일치해야 한다.
// 매칭 실패/미존재는 구분 없이 빈 목록으로 응답(번호 존재 여부도 노출하지 않는다).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    const body = (req.body ?? {}) as LookupBody;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const tel = normalizeTel(typeof body.tel === 'string' ? body.tel : '');

    if (!name) return res.status(400).json({error: 'invalid_name'});
    if (tel.length < 10 || tel.length > 11) return res.status(400).json({error: 'invalid_tel'});

    const store = await findBookableStore(slug);
    if (!store) return res.status(404).json({error: 'not_found'});

    // 같은 번호를 쓰는 고객이 여럿일 수 있어(가족 공유번호 등) 이름까지 맞는 고객만 모은다.
    const customers = await prisma.customer.findMany({
        where: {storeId: store.id, tel, name},
        select: {id: true},
    });
    if (customers.length === 0) return res.status(200).json({reservations: []});

    // 오늘(KST) 이후의 조회/변경/취소 대상 예약만 노출.
    const {todayStr} = nowKst();
    const today = new Date(`${todayStr}T00:00:00`);

    const rows = await prisma.reservation.findMany({
        where: {
            storeId: store.id,
            customerId: {in: customers.map((c) => c.id)},
            status: {in: ['requested', 'active']},
            date: {gte: today},
        },
        orderBy: [{date: 'asc'}, {startTime: 'asc'}],
        select: {
            publicToken: true,
            status: true,
            date: true,
            startTime: true,
            endTime: true,
            serviceSummary: true,
        },
    });

    return res.status(200).json({
        reservations: rows.map((r) => ({
            token: r.publicToken,
            status: r.status,
            date: r.date.toISOString().slice(0, 10),
            startTime: r.startTime,
            endTime: r.endTime,
            serviceSummary: r.serviceSummary,
        })),
    });
}
