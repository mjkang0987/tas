import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession} from '../auth/api-session';
import {DEFAULT_SERVICES} from '../../client/features/services/default-services';
import type {ShopType} from '../../client/features/services/default-services';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end();
    }

    const session = await getApiSession(req, res);
    if (!session?.storeId) return res.status(401).json({error: '인증 필요'});
    if (session.role !== 'owner') return res.status(403).json({error: '권한 없음'});

    const {shopName, shopType} = req.body ?? {};

    if (!shopName || typeof shopName !== 'string' || !shopName.trim()) {
        return res.status(400).json({error: '샵 이름을 입력해 주세요.'});
    }
    if (!shopType || !['hair', 'nail', 'waxing', 'lash', 'skin'].includes(shopType)) {
        return res.status(400).json({error: '업종을 선택해 주세요.'});
    }

    const storeId = session.storeId;
    const services = DEFAULT_SERVICES[shopType as ShopType];

    await prisma.$transaction(async (tx) => {
        await tx.store.update({
            where: {id: storeId},
            data: {name: shopName.trim(), shopType, onboarded: true},
        });

        await tx.service.createMany({
            data: services.map((s) => ({
                storeId,
                name: s.name,
                category: s.category,
                duration: s.durationMinutes,
                price: s.price,
            })),
            skipDuplicates: true,
        });

        await tx.designer.create({
            data: {storeId, name: '원장', status: 'active'},
        });
    });

    return res.status(200).json({ok: true});
}
