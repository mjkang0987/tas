import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {notifySlackOpsError} from '../notify/slack';
import {EXPIRY_ALERT_DAYS, type ExpiringBenefit} from '../../client/features/notifications/expiring';

/**
 * 알림 목록 '쿠폰·회원권 만료 임박' — 7일 안에 만료되는 쿠폰·회원권(매장에서 켠 기능만, 사용 가능 상태만, 회원권은 남은 횟수 0 제외).
 * GET: 목록 + 매장 확인 여부, POST `{kind, id, checked}`: 확인/해제(매장 단위 — 누가 확인해도 모두에게 확인함).
 * 쿠폰·회원권은 로그인 매장 기능이라 직원 이상.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);
    if (!requireRole(session, 'staff', res)) return;
    const {storeId, userId} = session;

    try {
        if (req.method === 'GET') {
            const now = new Date();
            const until = new Date(now.getTime() + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000);
            const window = {gt: now, lte: until};
            const customer = {select: {legacyId: true, name: true, tel: true}};
            // 매장에서 켠 기능만 — 쿠폰·회원권을 끈 매장엔 그 알림을 내지 않는다.
            const features = await prisma.store.findUnique({
                where: {id: storeId},
                select: {useCouponSystem: true, useMembershipSystem: true},
            });
            const [coupons, memberships] = await Promise.all([
                !features?.useCouponSystem ? [] : prisma.customerCoupon.findMany({
                    where: {storeId, status: 'active', expiresAt: window, customer: {deletedAt: null}},
                    select: {id: true, name: true, expiresAt: true, customer},
                }),
                !features?.useMembershipSystem ? [] : prisma.customerMembership.findMany({
                    where: {
                        storeId, status: 'active', expiresAt: window, customer: {deletedAt: null},
                        OR: [{remainingCount: null}, {remainingCount: {gt: 0}}],
                    },
                    select: {id: true, name: true, expiresAt: true, remainingCount: true, customer},
                }),
            ]);
            const ids = [...coupons.map((c) => c.id), ...memberships.map((m) => m.id)];
            const checked = new Set(
                ids.length === 0 ? [] : (await prisma.benefitExpiryCheck.findMany({
                    where: {storeId, benefitId: {in: ids}},
                    select: {kind: true, benefitId: true},
                })).map((c) => `${c.kind}:${c.benefitId}`),
            );
            const items: ExpiringBenefit[] = [
                ...coupons.map((c) => ({kind: 'coupon' as const, id: c.id, name: c.name, expiresAt: c.expiresAt!.toISOString(), remainingCount: null, customer: c.customer})),
                ...memberships.map((m) => ({kind: 'membership' as const, id: m.id, name: m.name, expiresAt: m.expiresAt!.toISOString(), remainingCount: m.remainingCount, customer: m.customer})),
            ]
                .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
                .map(({customer: c, ...rest}) => ({
                    ...rest,
                    customerId: c.legacyId,
                    customerName: c.name,
                    customerTel: c.tel,
                    checked: checked.has(`${rest.kind}:${rest.id}`),
                }));
            return res.status(200).json({days: EXPIRY_ALERT_DAYS, items});
        }

        if (req.method === 'POST') {
            const {kind, id, checked} = (req.body ?? {}) as {kind?: unknown; id?: unknown; checked?: unknown};
            if ((kind !== 'coupon' && kind !== 'membership') || typeof id !== 'string' || typeof checked !== 'boolean') {
                return res.status(400).json({error: 'kind, id, checked required'});
            }
            // 내 매장 혜택인지 — 다른 매장 id 로 체크를 남기지 못하게
            const owned = kind === 'coupon'
                ? await prisma.customerCoupon.findFirst({where: {id, storeId}, select: {id: true}})
                : await prisma.customerMembership.findFirst({where: {id, storeId}, select: {id: true}});
            if (!owned) return res.status(404).json({error: 'not_found'});
            if (checked) {
                await prisma.benefitExpiryCheck.upsert({
                    where: {kind_benefitId: {kind, benefitId: id}},
                    create: {storeId, kind, benefitId: id, checkedBy: userId},
                    update: {checkedBy: userId, checkedAt: new Date()},
                });
            } else {
                await prisma.benefitExpiryCheck.deleteMany({where: {storeId, kind, benefitId: id}});
            }
            return res.status(200).json({ok: true});
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error('[expiring-benefits]', error);
        await notifySlackOpsError(`${req.method} /api/expiring-benefits`, error);
        return res.status(500).json({error: 'Failed to load expiring benefits'});
    }
}
