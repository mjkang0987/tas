import type {NextApiRequest, NextApiResponse} from 'next';
import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbServiceToFrontend, parseI18nText} from '../db/mappers';
import {notifySlackOpsError} from '../notify/slack';
import type {ServiceItem} from '../../client/features/services/model';

interface ServiceData {
    services: ServiceItem[];
    categoryBaseColors: Record<string, string>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const [dbServices, store] = await Promise.all([
            prisma.service.findMany({where: {storeId: session.storeId}}),
            prisma.store.findUnique({where: {id: session.storeId}, select: {categoryBaseColorsJson: true}}),
        ]);

        const services = dbServices.map(dbServiceToFrontend);
        const categoryBaseColors = (store?.categoryBaseColorsJson ?? {}) as Record<string, string>;

        return res.status(200).json({services, categoryBaseColors});
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'owner', res)) return;

        const {services, categoryBaseColors} = req.body as ServiceData;

        if (!Array.isArray(services)) {
            return res.status(400).json({error: 'Invalid services payload'});
        }

        if (typeof categoryBaseColors !== 'object' || categoryBaseColors === null || Array.isArray(categoryBaseColors)) {
            return res.status(400).json({error: 'Invalid categoryBaseColors payload'});
        }

        const normalizedServices = services.map((service) => ({
            ...service,
            name: service.name.normalize('NFC').trim(),
            category: service.category.normalize('NFC').trim(),
        }));
        const nameCounts = new Map<string, number>();

        normalizedServices.forEach((service) => {
            if (!service.name) {
                return;
            }

            nameCounts.set(service.name, (nameCounts.get(service.name) ?? 0) + 1);
        });

        const duplicateNames = Array.from(nameCounts.entries())
            .filter(([, count]) => count > 1)
            .map(([name]) => name);

        if (duplicateNames.length > 0) {
            return res.status(400).json({error: `Duplicate service names: ${duplicateNames.join(', ')}`});
        }

        if (normalizedServices.some((service) => !service.name || !service.category)) {
            return res.status(400).json({error: 'Service name and category are required'});
        }

        try {
            // 전체 삭제 후 재생성을 한 트랜잭션으로 묶어 원자화(중간 실패 시 서비스 유실 방지)하고,
            // N개 개별 create를 createMany 단일 호출로 교체해 N+1 왕복을 제거한다.
            // 예약은 서비스명을 문자열로 저장(Service FK 없음)하므로 row id가 매번 바뀌어도 무방.
            await prisma.$transaction(async (tx) => {
                await tx.service.deleteMany({where: {storeId: session.storeId}});

                if (normalizedServices.length > 0) {
                    await tx.service.createMany({
                        data: normalizedServices.map((service) => ({
                            storeId: session.storeId,
                            name: service.name,
                            category: service.category,
                            duration: service.durationMinutes,
                            price: service.price,
                            // 번역만 부가 저장(식별은 name). 서버에서 문자열 en/ja/zh만 정규화.
                            nameI18nJson: parseI18nText(service.nameI18n) ?? Prisma.JsonNull,
                        })),
                    });
                }

                await tx.store.update({
                    where: {id: session.storeId},
                    data: {categoryBaseColorsJson: categoryBaseColors},
                });
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                return res.status(400).json({error: error.message});
            }

            await notifySlackOpsError('PUT /api/services (저장)', error);
            throw error;
        }

        return res.status(200).json({services: normalizedServices, categoryBaseColors});
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
