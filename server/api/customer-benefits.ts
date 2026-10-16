import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {loadCustomerBenefits} from '../db/customer-benefits';

// 고객 한 명이 지금 쓸 수 있는 회원권·쿠폰. 예약 상세·고객정보 레이어 표시용.
// (매장 전체 목록 GET /api/memberships·/api/coupons 를 받아 거르면 열 때마다 매장 전체를 내려받는다)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'staff', res)) return;

    const customerId = Number(req.query.customerId);
    if (!Number.isInteger(customerId)) return res.status(400).json({error: 'Invalid customerId'});

    const [store, customer] = await Promise.all([
        prisma.store.findUnique({
            where: {id: session.storeId},
            select: {id: true, useMembershipSystem: true, useCouponSystem: true},
        }),
        prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId: session.storeId, legacyId: customerId}},
            select: {id: true},
        }),
    ]);
    if (!store || !customer) return res.status(404).json({error: 'Customer not found'});

    // all=1: 매장 기능 토글과 무관하게 전부(고객 삭제 창 — 삭제하면 토글과 상관없이 취소된다).
    const all = req.query.all === '1';
    const scope = all ? {...store, useMembershipSystem: true, useCouponSystem: true} : store;
    return res.status(200).json(await loadCustomerBenefits(scope, customer.id, new Date()));
}
