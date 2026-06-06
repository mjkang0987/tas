import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession} from '../auth/api-session';

type ShopType = 'hair' | 'nail' | 'waxing' | 'lash' | 'skin';

const DEFAULT_SERVICES: Record<ShopType, Array<{category: string; name: string; duration: number; price: number}>> = {
    hair: [
        {category: '커트', name: '커트', duration: 30, price: 20000},
        {category: '펌', name: '일반펌', duration: 120, price: 80000},
        {category: '펌', name: '볼륨매직', duration: 120, price: 130000},
        {category: '염색', name: '전체염색', duration: 90, price: 80000},
        {category: '염색', name: '부분염색', duration: 45, price: 40000},
        {category: '클리닉', name: '두피/모발 클리닉', duration: 60, price: 80000},
    ],
    nail: [
        {category: '젤네일', name: '손 젤', duration: 60, price: 40000},
        {category: '젤네일', name: '발 젤', duration: 60, price: 50000},
        {category: '젤네일', name: '젤 제거', duration: 20, price: 13000},
        {category: '케어', name: '손 케어', duration: 30, price: 17000},
        {category: '케어', name: '발 케어', duration: 30, price: 22000},
        {category: '아트', name: '네일아트', duration: 30, price: 70000},
    ],
    waxing: [
        {category: '바디왁싱', name: '브라질리언', duration: 30, price: 50000},
        {category: '바디왁싱', name: '반다리', duration: 20, price: 30000},
        {category: '바디왁싱', name: '전체다리', duration: 40, price: 50000},
        {category: '바디왁싱', name: '겨드랑이', duration: 15, price: 25000},
        {category: '페이스왁싱', name: '눈썹', duration: 10, price: 15000},
        {category: '페이스왁싱', name: '코', duration: 10, price: 10000},
        {category: '페이스왁싱', name: '인중', duration: 10, price: 10000},
    ],
    lash: [
        {category: '속눈썹 연장', name: '클래식', duration: 90, price: 50000},
        {category: '속눈썹 연장', name: '볼륨', duration: 120, price: 90000},
        {category: '속눈썹 연장', name: '내추럴', duration: 90, price: 45000},
        {category: '속눈썹 펌', name: '속눈썹 펌', duration: 60, price: 40000},
        {category: '리무브', name: '전체 리무브', duration: 20, price: 15000},
        {category: '리무브', name: '부분 리무브', duration: 10, price: 10000},
    ],
    skin: [
        {category: '기본 관리', name: '기본 피부 관리', duration: 60, price: 70000},
        {category: '기본 관리', name: '수분 관리', duration: 60, price: 60000},
        {category: '스페셜 관리', name: '리프팅', duration: 90, price: 100000},
        {category: '스페셜 관리', name: '미백/화이트닝', duration: 90, price: 80000},
        {category: '클렌징', name: '딥 클렌징', duration: 30, price: 60000},
        {category: '패키지', name: '풀 케어 패키지', duration: 120, price: 150000},
    ],
};

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
            data: {name: shopName.trim(), onboarded: true},
        });

        await tx.service.createMany({
            data: services.map((s) => ({
                storeId,
                name: s.name,
                category: s.category,
                duration: s.duration,
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
