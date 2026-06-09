import type {NextApiRequest, NextApiResponse} from 'next';
import {prisma} from '../db/prisma';
import {getApiSession} from '../auth/api-session';

const VALID_SHOP_TYPES = ['hair', 'nail', 'waxing', 'lash', 'skin'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end();
    }

    const session = await getApiSession(req, res);
    if (!session?.storeId) return res.status(401).json({error: '인증 필요'});
    if (session.role !== 'owner') return res.status(403).json({error: '권한 없음'});

    const {shopName, shopType, services, designers} = req.body ?? {};

    const name = typeof shopName === 'string' ? shopName.trim() : '';
    const type = typeof shopType === 'string' && VALID_SHOP_TYPES.includes(shopType) ? shopType : null;
    const servicesList = Array.isArray(services) ? services : [];
    const designersList = Array.isArray(designers) && designers.length > 0
        ? designers
        : [{name: '원장', color: null}];

    const storeId = session.storeId;

    await prisma.$transaction(async (tx) => {
        await tx.store.update({
            where: {id: storeId},
            data: {
                ...(name ? {name} : {}),
                shopType: type,
                onboarded: true,
            },
        });

        if (servicesList.length > 0) {
            await tx.service.deleteMany({where: {storeId}});
            await tx.service.createMany({
                data: servicesList.map((s: {name: string; category: string; durationMinutes: number; price: number}) => ({
                    storeId,
                    name: String(s.name ?? '').trim(),
                    category: String(s.category ?? '').trim(),
                    duration: Number(s.durationMinutes) || 0,
                    price: Number(s.price) || 0,
                })).filter((s: {name: string; category: string}) => s.name && s.category),
                skipDuplicates: true,
            });
        }

        await tx.designer.deleteMany({where: {storeId}});
        await tx.designer.createMany({
            data: designersList.map((d: {name: string; color?: string | null}) => ({
                storeId,
                name: String(d.name ?? '').trim() || '원장',
                status: 'active',
                color: d.color ?? null,
            })),
            skipDuplicates: false,
        });
    });

    return res.status(200).json({ok: true});
}
