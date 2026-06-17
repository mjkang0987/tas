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

    // 이미 디자이너/서비스가 등록된 매장이면 데이터는 보존하고 onboarded만 보장한다.
    // (재온보딩으로 기존 데이터를 덮어쓰지 않으면서, onboarded=false로 남아 무한 리다이렉트되는 것 방지)
    const [designerCount, serviceCount] = await Promise.all([
        prisma.designer.count({where: {storeId}}),
        prisma.service.count({where: {storeId}}),
    ]);
    if (designerCount > 0 || serviceCount > 0) {
        await prisma.store.update({where: {id: storeId}, data: {onboarded: true}});
        return res.status(200).json({ok: true, alreadySetup: true});
    }

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
            data: designersList.map((d: {name: string; color?: string | null}, index: number) => ({
                storeId,
                legacyId: index + 1,
                name: String(d.name ?? '').trim() || '원장',
                status: 'active',
                color: d.color ?? null,
            })),
            skipDuplicates: false,
        });
    });

    return res.status(200).json({ok: true});
}
