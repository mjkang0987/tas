import {createRequire} from 'node:module';
import fs from 'fs/promises';
import path from 'path';

import {PrismaClient} from '../../client/prisma/generated/prisma/client.ts';

// 이 파일은 패키지 루트(client) 밖에 있어 bare import가 해석되지 않으므로
// client 패키지 컨텍스트로 의존성을 로드한다 (Prisma 7은 driver adapter 필수).
const require = createRequire(new URL('../../client/package.json', import.meta.url));
require('dotenv').config();
const {PrismaPg} = require('@prisma/adapter-pg');

const prisma = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})});
const DEFAULT_STORE_KEY = 'default-store';
const SEED_OWNER_EMAIL = process.env.SEED_OWNER_EMAIL;
const SEED_OWNER_NAME = process.env.SEED_OWNER_NAME ?? 'Owner';
const SEED_DATA_DIR = '../server/prisma/seed-data';
const MAX_INT_32 = 2147483647;

function mapAssigneeStatus(status) {
    if (status === '휴직') return 'on_leave';
    if (status === '퇴직') return 'resigned';
    return 'active';
}

function mapPointHistoryType(type) {
    if (type === 'manual_add') return 'manual_add';
    if (type === 'manual_subtract') return 'manual_subtract';
    if (type === 'recharge') return 'recharge';
    if (type === 'payment_use') return 'payment_use';
    if (type === 'payment_earn') return 'payment_earn';
    if (type === 'payment_adjust') return 'payment_adjust';
    return 'manual_add';
}

function mapReservationStatus(status) {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'noshow') return 'noshow';
    return 'active';
}

function mapPaymentMethod(method) {
    if (method === '현금') return 'cash';
    if (method === '현금+현금영수증') return 'cash_receipt';
    if (method === '현금영수증') return 'cash_receipt';
    if (method === '카드') return 'card';
    if (method === '네이버페이') return 'naver_pay';
    if (method === '지역화폐') return 'local_currency';
    if (method === '지역화폐+현금영수증') return 'local_currency_receipt';
    if (method === '지역화폐(현금영수증)') return 'local_currency_receipt';
    if (method === '이용권') return 'voucher';
    if (method === '상품권') return 'voucher';
    if (method === '적립금') return 'points';
    return 'cash';
}

function buildPaymentEntries(reservation) {
    if (Array.isArray(reservation.paymentEntries) && reservation.paymentEntries.length > 0) {
        return reservation.paymentEntries.map((entry) => ({
            method: mapPaymentMethod(entry.method),
            amount: Number(entry.amount ?? 0),
        }));
    }

    if (reservation.paymentMethod && Number(reservation.price ?? 0) > 0) {
        return [{
            method: mapPaymentMethod(reservation.paymentMethod),
            amount: Number(reservation.price ?? 0),
        }];
    }

    return [];
}

async function readJson(relativePath) {
    const absolutePath = path.join(process.cwd(), relativePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(raw);
}

function seedDataPath(fileName) {
    return `${SEED_DATA_DIR}/${fileName}`;
}

function buildLegacyIdMap(items, getRawId) {
    const numericIds = items
        .map(getRawId)
        .filter((value) => Number.isInteger(value) && value > 0);

    const usedIds = new Set(numericIds.filter((value) => value <= MAX_INT_32));
    const idMap = new Map();
    let nextId = usedIds.size > 0 ? Math.max(...usedIds) + 1 : 1;

    for (const item of items) {
        const rawId = getRawId(item);
        if (!Number.isInteger(rawId) || rawId <= 0) continue;

        if (rawId <= MAX_INT_32) {
            idMap.set(rawId, rawId);
            continue;
        }

        while (usedIds.has(nextId)) {
            nextId += 1;
        }

        idMap.set(rawId, nextId);
        usedIds.add(nextId);
        nextId += 1;
    }

    return idMap;
}

function normalizeAssignees(assigneeData) {
    const assigneeIdMap = buildLegacyIdMap(assigneeData.assignees ?? [], (assignee) => assignee.id);

    return {
        assignees: (assigneeData.assignees ?? []).map((assignee) => ({
            ...assignee,
            id: assigneeIdMap.get(assignee.id) ?? assignee.id,
        })),
    };
}

function normalizeReservationPayload(reservationData) {
    const reservationIdMap = buildLegacyIdMap(reservationData.reservations ?? [], (reservation) => reservation.id);
    const assigneeIds = [
        ...(reservationData.reservations ?? []).map((reservation) => reservation.assigneeId),
        ...(reservationData.history ?? []).flatMap((history) => [
            history.reservationId,
            history.before?.assigneeId,
            history.after?.assigneeId,
        ]),
    ];
    const assigneeIdMap = buildLegacyIdMap(
        assigneeIds.map((id) => ({id})).filter((entry) => Number.isInteger(entry.id) && entry.id > 0),
        (entry) => entry.id
    );

    const normalizeAssigneeId = (assigneeId) => assigneeIdMap.get(assigneeId) ?? assigneeId;
    const normalizeReservationId = (reservationId) => reservationIdMap.get(reservationId) ?? reservationId;
    const normalizeHistorySnapshot = (snapshot) => snapshot
        ? {
            ...snapshot,
            id: normalizeReservationId(snapshot.id),
            assigneeId: normalizeAssigneeId(snapshot.assigneeId),
        }
        : snapshot;

    return {
        reservations: (reservationData.reservations ?? []).map((reservation) => ({
            ...reservation,
            id: normalizeReservationId(reservation.id),
            assigneeId: normalizeAssigneeId(reservation.assigneeId),
        })),
        history: (reservationData.history ?? []).map((history) => ({
            ...history,
            reservationId: normalizeReservationId(history.reservationId),
            before: normalizeHistorySnapshot(history.before),
            after: normalizeHistorySnapshot(history.after),
        })),
    };
}

async function getDefaultStoreIdOrThrow(message) {
    const store = await prisma.store.findUnique({
        where: {id: DEFAULT_STORE_KEY},
        select: {id: true},
    });

    if (!store) {
        throw new Error(message);
    }

    return store.id;
}

async function seedDefaultStore() {
    const storeData = await readJson(seedDataPath('store.json'));

    const store = await prisma.store.upsert({
        where: {id: DEFAULT_STORE_KEY},
        update: {name: 'Default Store'},
        create: {
            id: DEFAULT_STORE_KEY,
            name: 'Default Store',
        },
    });

    const weekdays = Array.from({length: 7}, (_, dayIndex) => dayIndex);

    await Promise.all(weekdays.map((dayIndex) => prisma.storeBusinessHour.upsert({
        where: {
            storeId_dayIndex: {
                storeId: store.id,
                dayIndex,
            },
        },
        update: {
            openTime: storeData.businessHours.start,
            closeTime: storeData.businessHours.end,
            enabled: true,
        },
        create: {
            storeId: store.id,
            dayIndex,
            openTime: storeData.businessHours.start,
            closeTime: storeData.businessHours.end,
            enabled: true,
        },
    })));

    await prisma.storeClosedDate.deleteMany({
        where: {storeId: store.id},
    });

    if (Array.isArray(storeData.closedDates) && storeData.closedDates.length > 0) {
        await prisma.storeClosedDate.createMany({
            data: storeData.closedDates.map((date) => ({
                storeId: store.id,
                date: new Date(`${date}T00:00:00`),
            })),
        });
    }

    await prisma.storePointSettings.upsert({
        where: {storeId: store.id},
        update: {
            enableServiceRate: !!storeData.pointSettings.enableServiceRate,
            enableRecharge: !!storeData.pointSettings.enableRecharge,
            serviceRate: Number(storeData.pointSettings.serviceRate ?? 0),
            rechargeRulesJson: storeData.pointSettings.rechargeRules ?? [],
        },
        create: {
            storeId: store.id,
            enableServiceRate: !!storeData.pointSettings.enableServiceRate,
            enableRecharge: !!storeData.pointSettings.enableRecharge,
            serviceRate: Number(storeData.pointSettings.serviceRate ?? 0),
            rechargeRulesJson: storeData.pointSettings.rechargeRules ?? [],
        },
    });

    console.log(`[seed] Default store seeded: ${store.id}`);
}

async function seedOwnerMembership() {
    if (!SEED_OWNER_EMAIL) {
        console.log('[seed] Skipped owner membership seed: SEED_OWNER_EMAIL is not set.');
        return;
    }

    const storeId = await getDefaultStoreIdOrThrow('Default store must exist before seeding owner membership.');

    const user = await prisma.user.upsert({
        where: {email: SEED_OWNER_EMAIL},
        update: {
            name: SEED_OWNER_NAME,
        },
        create: {
            email: SEED_OWNER_EMAIL,
            name: SEED_OWNER_NAME,
            nickname: SEED_OWNER_EMAIL.split('@')[0],
        },
    });

    await prisma.membership.upsert({
        where: {
            userId_storeId: {
                userId: user.id,
                storeId,
            },
        },
        update: {
            role: 'owner',
        },
        create: {
            userId: user.id,
            storeId,
            role: 'owner',
        },
    });

    console.log(`[seed] Owner membership seeded: ${SEED_OWNER_EMAIL}`);
}

async function seedAssignees() {
    const assigneeData = normalizeAssignees(await readJson(seedDataPath('assignees.json')));

    const storeId = await getDefaultStoreIdOrThrow('Default store must exist before seeding assignees.');

    for (const assignee of assigneeData.assignees ?? []) {
        const savedAssignee = await prisma.assignee.upsert({
            where: {
                storeId_legacyId: {
                    storeId,
                    legacyId: assignee.id,
                },
            },
            update: {
                name: assignee.name,
                status: mapAssigneeStatus(assignee.status),
                phone: assignee.phone ?? null,
                note: assignee.note ?? null,
                color: assignee.color ?? null,
            },
            create: {
                storeId,
                legacyId: assignee.id,
                name: assignee.name,
                status: mapAssigneeStatus(assignee.status),
                phone: assignee.phone ?? null,
                note: assignee.note ?? null,
                color: assignee.color ?? null,
            },
        });

        for (const [dayIndex, schedule] of (assignee.schedule ?? []).entries()) {
            await prisma.assigneeSchedule.upsert({
                where: {
                    assigneeId_dayIndex: {
                        assigneeId: savedAssignee.id,
                        dayIndex,
                    },
                },
                update: {
                    enabled: !!schedule.enabled,
                    startTime: schedule.start,
                    endTime: schedule.end,
                },
                create: {
                    assigneeId: savedAssignee.id,
                    dayIndex,
                    enabled: !!schedule.enabled,
                    startTime: schedule.start,
                    endTime: schedule.end,
                },
            });
        }
    }

    console.log(`[seed] Assignees seeded: ${(assigneeData.assignees ?? []).length}`);
}

async function seedCustomers() {
    const customerData = await readJson(seedDataPath('customers.json'));

    const storeId = await getDefaultStoreIdOrThrow('Default store must exist before seeding customers.');

    for (const customer of customerData.customers ?? []) {
        const savedCustomer = await prisma.customer.upsert({
            where: {
                storeId_legacyId: {
                    storeId,
                    legacyId: customer.id,
                },
            },
            update: {
                name: customer.name,
                tel: customer.tel,
                points: Number(customer.points ?? 0),
                firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                allergyNote: customer.allergyNote ?? null,
                claimNote: customer.claimNote ?? null,
                preferenceNote: customer.preferenceNote ?? null,
            },
            create: {
                storeId,
                legacyId: customer.id,
                name: customer.name,
                tel: customer.tel,
                points: Number(customer.points ?? 0),
                firstVisitDate: customer.firstVisitDate ? new Date(`${customer.firstVisitDate}T00:00:00`) : null,
                allergyNote: customer.allergyNote ?? null,
                claimNote: customer.claimNote ?? null,
                preferenceNote: customer.preferenceNote ?? null,
            },
        });

        await prisma.customerMemoTag.deleteMany({
            where: {customerId: savedCustomer.id},
        });

        if (Array.isArray(customer.memoTags) && customer.memoTags.length > 0) {
            await prisma.customerMemoTag.createMany({
                data: customer.memoTags.map((memoTag) => ({
                    customerId: savedCustomer.id,
                    text: memoTag.text,
                    color: memoTag.color,
                })),
            });
        }

        await prisma.customerPointHistory.deleteMany({
            where: {customerId: savedCustomer.id},
        });

        if (Array.isArray(customer.pointHistories) && customer.pointHistories.length > 0) {
            await prisma.customerPointHistory.createMany({
                data: customer.pointHistories.map((history) => ({
                    id: history.id,
                    customerId: savedCustomer.id,
                    type: mapPointHistoryType(history.type),
                    delta: Number(history.delta ?? 0),
                    balance: Number(history.balance ?? 0),
                    description: history.description ?? '',
                    createdAt: history.createdAt ? new Date(history.createdAt) : new Date(),
                })),
            });
        }
    }

    console.log(`[seed] Customers seeded: ${(customerData.customers ?? []).length}`);
}

async function seedServices() {
    const serviceData = await readJson(seedDataPath('services.json'));

    const storeId = await getDefaultStoreIdOrThrow('Default store must exist before seeding services.');

    for (const service of serviceData.services ?? []) {
        await prisma.service.upsert({
            where: {
                storeId_name: {
                    storeId,
                    name: service.name,
                },
            },
            update: {
                legacyName: service.name,
                category: service.category,
                duration: Number(service.durationMinutes ?? 0),
                price: Number(service.price ?? 0),
            },
            create: {
                storeId,
                legacyName: service.name,
                name: service.name,
                category: service.category,
                duration: Number(service.durationMinutes ?? 0),
                price: Number(service.price ?? 0),
            },
        });
    }

    console.log(`[seed] Services seeded: ${(serviceData.services ?? []).length}`);
}

async function seedReservations() {
    const reservationData = normalizeReservationPayload(await readJson(seedDataPath('reservations.json')));

    const storeId = await getDefaultStoreIdOrThrow('Default store must exist before seeding reservations.');

    for (const reservation of reservationData.reservations ?? []) {
        const customer = await prisma.customer.findUnique({
            where: {
                storeId_legacyId: {
                    storeId,
                    legacyId: reservation.customerId,
                },
            },
            select: {id: true},
        });

        if (!customer) {
            throw new Error(`Customer not found for reservation legacyId=${reservation.id}`);
        }

        const assignee = reservation.assigneeId
            ? await prisma.assignee.findUnique({
                where: {
                    storeId_legacyId: {
                        storeId,
                        legacyId: reservation.assigneeId,
                    },
                },
                select: {id: true},
            })
            : null;

        const savedReservation = await prisma.reservation.upsert({
            where: {
                storeId_legacyId: {
                    storeId,
                    legacyId: reservation.id,
                },
            },
            update: {
                customerId: customer.id,
                assigneeId: assignee?.id ?? null,
                date: new Date(`${reservation.date}T00:00:00`),
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                serviceSummary: reservation.service,
                status: mapReservationStatus(reservation.status),
                price: Number(reservation.price ?? 0),
                memo: reservation.memo ?? null,
                paymentCompleted: !!reservation.paymentCompleted,
                pointEarned: Number(reservation.pointEarned ?? 0),
                channel: reservation.naverBookingId ? 'naver' : 'phone',
            },
            create: {
                storeId,
                legacyId: reservation.id,
                customerId: customer.id,
                assigneeId: assignee?.id ?? null,
                date: new Date(`${reservation.date}T00:00:00`),
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                serviceSummary: reservation.service,
                status: mapReservationStatus(reservation.status),
                price: Number(reservation.price ?? 0),
                memo: reservation.memo ?? null,
                paymentCompleted: !!reservation.paymentCompleted,
                pointEarned: Number(reservation.pointEarned ?? 0),
                channel: reservation.naverBookingId ? 'naver' : 'phone',
            },
        });

        await prisma.reservationPaymentEntry.deleteMany({
            where: {reservationId: savedReservation.id},
        });

        const paymentEntries = buildPaymentEntries(reservation);

        if (paymentEntries.length > 0) {
            await prisma.reservationPaymentEntry.createMany({
                data: paymentEntries.map((entry) => ({
                    reservationId: savedReservation.id,
                    method: entry.method,
                    amount: entry.amount,
                })),
            });
        }
    }

    await prisma.reservationHistory.deleteMany({
        where: {storeId},
    });

    for (const history of reservationData.history ?? []) {
        const reservation = await prisma.reservation.findUnique({
            where: {
                storeId_legacyId: {
                    storeId,
                    legacyId: history.reservationId,
                },
            },
            select: {id: true},
        });

        if (!reservation) {
            continue;
        }

        await prisma.reservationHistory.create({
            data: {
                storeId,
                reservationId: reservation.id,
                beforeJson: history.before ?? {},
                afterJson: history.after ?? {},
                createdAt: history.timestamp ? new Date(history.timestamp) : new Date(),
            },
        });
    }

    console.log(`[seed] Reservations seeded: ${(reservationData.reservations ?? []).length}`);
}

function resolveTestDate(reservation) {
    if (reservation.date) return reservation.date;
    const today = new Date();
    today.setDate(today.getDate() + (reservation.dateOffset ?? 0));
    return today.toISOString().slice(0, 10);
}

async function seedTestConflicts() {
    const testData = await readJson(seedDataPath('test-conflicts.json'));
    const storeId = await getDefaultStoreIdOrThrow('Default store must exist before seeding test conflicts.');

    const assigneeIdMap = buildLegacyIdMap(
        (testData.reservations ?? []).map((r) => ({id: r.assigneeId})).filter((e) => Number.isInteger(e.id) && e.id > 0),
        (e) => e.id,
    );

    for (const reservation of testData.reservations ?? []) {
        const date = resolveTestDate(reservation);

        const customer = await prisma.customer.findUnique({
            where: {storeId_legacyId: {storeId, legacyId: reservation.customerId}},
            select: {id: true},
        });

        if (!customer) {
            throw new Error(`Customer not found for test reservation legacyId=${reservation.id}`);
        }

        const normalizedAssigneeId = assigneeIdMap.get(reservation.assigneeId) ?? reservation.assigneeId;
        const assignee = reservation.assigneeId
            ? await prisma.assignee.findUnique({
                where: {storeId_legacyId: {storeId, legacyId: normalizedAssigneeId}},
                select: {id: true},
            })
            : null;

        await prisma.reservation.upsert({
            where: {storeId_legacyId: {storeId, legacyId: reservation.id}},
            update: {
                customerId: customer.id,
                assigneeId: assignee?.id ?? null,
                date: new Date(`${date}T00:00:00`),
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                serviceSummary: reservation.service,
                status: mapReservationStatus(reservation.status),
                naverBookingId: reservation.naverBookingId ?? null,
                channel: reservation.naverBookingId ? 'naver' : 'phone',
            },
            create: {
                storeId,
                legacyId: reservation.id,
                customerId: customer.id,
                assigneeId: assignee?.id ?? null,
                date: new Date(`${date}T00:00:00`),
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                serviceSummary: reservation.service,
                status: mapReservationStatus(reservation.status),
                naverBookingId: reservation.naverBookingId ?? null,
                channel: reservation.naverBookingId ? 'naver' : 'phone',
            },
        });
    }

    console.log(`[seed] Test conflict reservations seeded: ${(testData.reservations ?? []).length}`);
}

async function main() {
    await seedDefaultStore();
    await seedOwnerMembership();
    await seedAssignees();
    await seedCustomers();
    await seedServices();
    await seedReservations();
    if (process.env.TEST_DB === '1') {
        await seedTestConflicts();
    }
}

main()
    .catch((error) => {
        console.error('[seed] Failed to run seed entry.');
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
