import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../lib/prisma';
import {getApiSession, requireRole} from '../../lib/api-auth';
import {dbServiceToFrontend} from '../../lib/db-to-frontend';
import type {ServiceItem} from '../../utils/services';

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
        if (!requireRole(session, 'manager', res)) return;

        const {services, categoryBaseColors} = req.body as ServiceData;

        if (!Array.isArray(services)) {
            return res.status(400).json({error: 'Invalid services payload'});
        }

        if (typeof categoryBaseColors !== 'object' || categoryBaseColors === null || Array.isArray(categoryBaseColors)) {
            return res.status(400).json({error: 'Invalid categoryBaseColors payload'});
        }

        await prisma.$transaction([
            prisma.service.deleteMany({where: {storeId: session.storeId}}),
            prisma.service.createMany({
                data: services.map((s) => ({
                    storeId: session.storeId,
                    name: s.name,
                    category: s.category,
                    duration: s.durationMinutes,
                    price: s.price,
                })),
            }),
            prisma.store.update({
                where: {id: session.storeId},
                data: {categoryBaseColorsJson: categoryBaseColors},
            }),
        ]);

        return res.status(200).json({services, categoryBaseColors});
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
