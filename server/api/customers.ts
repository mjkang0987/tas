import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {dbCustomerToFrontend} from '../db/mappers';
import type {Customer, PointHistoryType} from '../../client/features/customers/model';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const dbCustomers = await prisma.customer.findMany({
            where: {storeId: session.storeId},
            include: {
                memoTags: true,
                pointHistories: {
                    orderBy: {createdAt: 'asc'},
                    include: {relatedReservation: {select: {legacyId: true}}},
                },
            },
            orderBy: {legacyId: 'asc'},
        });

        const customers = dbCustomers.map(dbCustomerToFrontend);
        return res.status(200).json({customers});
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'staff', res)) return;

        const {customers} = req.body as { customers: Customer[] };

        if (!Array.isArray(customers)) {
            return res.status(400).json({error: 'Invalid customers payload'});
        }

        await prisma.$transaction(async (tx) => {
            for (const customer of customers) {
                const savedCustomer = await tx.customer.upsert({
                    where: {storeId_legacyId: {storeId: session.storeId, legacyId: customer.id}},
                    update: {
                        name: customer.name,
                        tel: customer.tel,
                        points: customer.points ?? 0,
                        firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                        allergyNote: customer.allergyNote ?? null,
                        claimNote: customer.claimNote ?? null,
                        preferenceNote: customer.preferenceNote ?? null,
                    },
                    create: {
                        storeId: session.storeId,
                        legacyId: customer.id,
                        name: customer.name,
                        tel: customer.tel,
                        points: customer.points ?? 0,
                        firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                        allergyNote: customer.allergyNote ?? null,
                        claimNote: customer.claimNote ?? null,
                        preferenceNote: customer.preferenceNote ?? null,
                    },
                });

                await tx.customerMemoTag.deleteMany({where: {customerId: savedCustomer.id}});

                if (Array.isArray(customer.memoTags) && customer.memoTags.length > 0) {
                    await tx.customerMemoTag.createMany({
                        data: customer.memoTags.map((tag) => ({
                            customerId: savedCustomer.id,
                            text: tag.text,
                            color: tag.color,
                        })),
                    });
                }

                const existingHistoryIds = new Set(
                    (await tx.customerPointHistory.findMany({
                        where: {customerId: savedCustomer.id},
                        select: {id: true},
                    })).map((h) => h.id)
                );

                const newHistories = (customer.pointHistories ?? []).filter((h) => !existingHistoryIds.has(h.id));

                if (newHistories.length > 0) {
                    const relatedLegacyIds = newHistories
                        .filter((h) => h.relatedReservationId)
                        .map((h) => h.relatedReservationId!);

                    const legacyToCuidMap = new Map<number, string>();
                    if (relatedLegacyIds.length > 0) {
                        const relatedReservations = await tx.reservation.findMany({
                            where: {storeId: session.storeId, legacyId: {in: relatedLegacyIds}},
                            select: {id: true, legacyId: true},
                        });
                        for (const r of relatedReservations) {
                            if (r.legacyId != null) legacyToCuidMap.set(r.legacyId, r.id);
                        }
                    }

                    await tx.customerPointHistory.createMany({
                        data: newHistories.map((h) => ({
                            id: h.id,
                            customerId: savedCustomer.id,
                            type: h.type as PointHistoryType,
                            delta: h.delta,
                            balance: h.balance,
                            description: h.description,
                            createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
                            relatedReservationId: h.relatedReservationId
                                ? legacyToCuidMap.get(h.relatedReservationId) ?? null
                                : null,
                        })),
                    });
                }
            }
        });

        return res.status(200).json({customers});
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
