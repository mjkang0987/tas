import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession} from '../auth/api-session';
import {frontendReservationStatusToDb, frontendPaymentMethodToDb, frontendChannelToDb} from '../db/mappers';
import type {Designer} from '../../client/features/designers/model';
import type {Customer} from '../../client/features/customers/model';
import type {Reservation} from '../../client/features/reservations/model';
import type {ServiceItem} from '../../client/features/services/model';

const VALID_SHOP_TYPES = ['hair', 'nail', 'waxing', 'lash', 'skin'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end();
    }

    const session = await getApiSession(req, res);
    if (!session?.storeId) return res.status(401).json({error: '인증 필요'});
    if (session.role !== 'owner') return res.status(403).json({error: '권한 없음'});

    const {shopName, shopType, services, designers, customers, reservations, confirm = false} = req.body ?? {};

    const storeId = session.storeId;

    const [designerCount, serviceCount] = await Promise.all([
        prisma.designer.count({where: {storeId}}),
        prisma.service.count({where: {storeId}}),
    ]);
    const hasExistingData = designerCount > 0 || serviceCount > 0;

    if (hasExistingData && !confirm) {
        const store = await prisma.store.findUnique({where: {id: storeId}, select: {name: true}});
        return res.status(409).json({
            error: '이미 설정된 매장입니다.',
            code: 'ALREADY_SETUP',
            storeName: store?.name ?? '',
        });
    }

    const name = typeof shopName === 'string' ? shopName.trim() : '';
    const type = typeof shopType === 'string' && VALID_SHOP_TYPES.includes(shopType) ? shopType : null;
    const servicesList: ServiceItem[] = Array.isArray(services) ? services : [];
    const designersList: Designer[] = Array.isArray(designers) && designers.length > 0
        ? designers
        : [{id: 1, name: '원장', color: undefined, schedule: []}];
    const customersList: Customer[] = Array.isArray(customers) ? customers : [];
    const reservationsList: Reservation[] = Array.isArray(reservations) ? reservations : [];

    const newDesignerLegacyIds: number[] = [];

    try {
        await prisma.$transaction(async (tx) => {
            if (!hasExistingData) {
                // 빈 매장: 처음부터 생성
                if (name) {
                    await tx.store.update({
                        where: {id: storeId},
                        data: {name, shopType: type, onboarded: true},
                    });
                }

                if (servicesList.length > 0) {
                    await tx.service.createMany({
                        data: servicesList.map((s) => ({
                            storeId,
                            name: String(s.name ?? '').trim(),
                            category: String(s.category ?? '').trim(),
                            duration: Number(s.durationMinutes) || 0,
                            price: Number(s.price) || 0,
                        })).filter((s) => s.name && s.category),
                        skipDuplicates: true,
                    });
                }

                // 디자이너 생성 (legacyId = 순번)
                const designerCuidMap = new Map<number, string>();
                await tx.designer.deleteMany({where: {storeId}});
                for (let i = 0; i < designersList.length; i++) {
                    const d = designersList[i];
                    const legacyId = i + 1;
                    const created = await tx.designer.create({
                        data: {
                            storeId,
                            legacyId,
                            name: String(d.name ?? '').trim() || '원장',
                            status: 'active',
                            color: d.color ?? null,
                        },
                    });
                    designerCuidMap.set(d.id, created.id);
                }

                // 고객 생성
                const customerCuidMap = new Map<number, string>();
                for (let i = 0; i < customersList.length; i++) {
                    const c = customersList[i];
                    const created = await tx.customer.create({
                        data: {
                            storeId,
                            legacyId: i + 1,
                            name: c.name,
                            tel: c.tel ?? '',
                            points: c.points ?? 0,
                            firstVisitDate: c.firstVisitDate ? new Date(`${c.firstVisitDate}T00:00:00`) : null,
                            allergyNote: c.allergyNote ?? null,
                            claimNote: c.claimNote ?? null,
                            preferenceNote: c.preferenceNote ?? null,
                        },
                    });
                    customerCuidMap.set(c.id, created.id);
                }

                // 예약 생성
                for (let i = 0; i < reservationsList.length; i++) {
                    const r = reservationsList[i];
                    const customerCuid = customerCuidMap.get(r.customerId);
                    if (!customerCuid) continue;

                    const designerCuid = r.designerId != null ? (designerCuidMap.get(r.designerId) ?? null) : null;
                    const paymentEntries = (r.paymentEntries ?? []).map((e) => ({
                        method: frontendPaymentMethodToDb(e.method),
                        amount: e.amount,
                    }));

                    await tx.reservation.create({
                        data: {
                            storeId,
                            legacyId: i + 1,
                            customerId: customerCuid,
                            designerId: designerCuid,
                            date: new Date(`${r.date}T00:00:00`),
                            startTime: r.startTime,
                            endTime: r.endTime,
                            serviceSummary: r.service,
                            status: frontendReservationStatusToDb(r.status),
                            price: r.price ?? 0,
                            memo: r.memo ?? null,
                            paymentCompleted: r.paymentCompleted ?? false,
                            pointEarned: r.pointEarned ?? 0,
                            ...(r.channel && {channel: frontendChannelToDb(r.channel)}),
                            ...(paymentEntries.length > 0 && {
                                paymentEntries: {createMany: {data: paymentEntries}},
                            }),
                        },
                    });
                }
            } else {
                // 기존 매장 (confirm=true): legacyId remap 후 append
                const [maxDesignerRow, maxCustomerRow, maxReservationRow] = await Promise.all([
                    tx.designer.findFirst({where: {storeId}, orderBy: {legacyId: 'desc'}, select: {legacyId: true}}),
                    tx.customer.findFirst({where: {storeId}, orderBy: {legacyId: 'desc'}, select: {legacyId: true}}),
                    tx.reservation.findFirst({where: {storeId}, orderBy: {legacyId: 'desc'}, select: {legacyId: true}}),
                ]);

                let nextDesignerLegacyId = (maxDesignerRow?.legacyId ?? 0) + 1;
                let nextCustomerLegacyId = (maxCustomerRow?.legacyId ?? 0) + 1;
                let nextReservationLegacyId = (maxReservationRow?.legacyId ?? 0) + 1;

                const designerCuidMap = new Map<number, string>();
                for (const d of designersList) {
                    const legacyId = nextDesignerLegacyId++;
                    const created = await tx.designer.create({
                        data: {
                            storeId,
                            legacyId,
                            name: String(d.name ?? '').trim() || '원장',
                            status: 'active',
                            color: d.color ?? null,
                        },
                    });
                    designerCuidMap.set(d.id, created.id);
                    newDesignerLegacyIds.push(legacyId);
                }

                const customerCuidMap = new Map<number, string>();
                for (const c of customersList) {
                    const created = await tx.customer.create({
                        data: {
                            storeId,
                            legacyId: nextCustomerLegacyId++,
                            name: c.name,
                            tel: c.tel ?? '',
                            points: c.points ?? 0,
                            firstVisitDate: c.firstVisitDate ? new Date(`${c.firstVisitDate}T00:00:00`) : null,
                            allergyNote: c.allergyNote ?? null,
                            claimNote: c.claimNote ?? null,
                            preferenceNote: c.preferenceNote ?? null,
                        },
                    });
                    customerCuidMap.set(c.id, created.id);
                }

                for (const r of reservationsList) {
                    const customerCuid = customerCuidMap.get(r.customerId);
                    if (!customerCuid) continue;

                    const designerCuid = r.designerId != null ? (designerCuidMap.get(r.designerId) ?? null) : null;
                    const paymentEntries = (r.paymentEntries ?? []).map((e) => ({
                        method: frontendPaymentMethodToDb(e.method),
                        amount: e.amount,
                    }));

                    await tx.reservation.create({
                        data: {
                            storeId,
                            legacyId: nextReservationLegacyId++,
                            customerId: customerCuid,
                            designerId: designerCuid,
                            date: new Date(`${r.date}T00:00:00`),
                            startTime: r.startTime,
                            endTime: r.endTime,
                            serviceSummary: r.service,
                            status: frontendReservationStatusToDb(r.status),
                            price: r.price ?? 0,
                            memo: r.memo ?? null,
                            paymentCompleted: r.paymentCompleted ?? false,
                            pointEarned: r.pointEarned ?? 0,
                            ...(r.channel && {channel: frontendChannelToDb(r.channel)}),
                            ...(paymentEntries.length > 0 && {
                                paymentEntries: {createMany: {data: paymentEntries}},
                            }),
                        },
                    });
                }
            }
        });

        return res.json({
            ok: true,
            status: hasExistingData ? 'merged' : 'created',
            newDesignerLegacyIds,
        });
    } catch (error) {
        console.error('[migrate-local] 마이그레이션 실패:', error);
        return res.status(500).json({error: '마이그레이션에 실패했습니다.'});
    }
}
