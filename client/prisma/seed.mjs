import {PrismaClient} from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const DEFAULT_STORE_KEY = 'default-store';

function mapDesignerStatus(status) {
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

async function readJson(relativePath) {
    const absolutePath = path.join(process.cwd(), relativePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(raw);
}

async function seedDefaultStore() {
    const storeData = await readJson('pages/api/store.json');

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

async function seedDesigners() {
    const designerData = await readJson('pages/api/designers.json');

    const store = await prisma.store.findUnique({
        where: {id: DEFAULT_STORE_KEY},
        select: {id: true},
    });

    if (!store) {
        throw new Error('Default store must exist before seeding designers.');
    }

    for (const designer of designerData.designers ?? []) {
        const savedDesigner = await prisma.designer.upsert({
            where: {
                storeId_legacyId: {
                    storeId: store.id,
                    legacyId: designer.id,
                },
            },
            update: {
                name: designer.name,
                status: mapDesignerStatus(designer.status),
                phone: designer.phone ?? null,
                note: designer.note ?? null,
                color: designer.color ?? null,
            },
            create: {
                storeId: store.id,
                legacyId: designer.id,
                name: designer.name,
                status: mapDesignerStatus(designer.status),
                phone: designer.phone ?? null,
                note: designer.note ?? null,
                color: designer.color ?? null,
            },
        });

        for (const [dayIndex, schedule] of (designer.schedule ?? []).entries()) {
            await prisma.designerSchedule.upsert({
                where: {
                    designerId_dayIndex: {
                        designerId: savedDesigner.id,
                        dayIndex,
                    },
                },
                update: {
                    enabled: !!schedule.enabled,
                    startTime: schedule.start,
                    endTime: schedule.end,
                },
                create: {
                    designerId: savedDesigner.id,
                    dayIndex,
                    enabled: !!schedule.enabled,
                    startTime: schedule.start,
                    endTime: schedule.end,
                },
            });
        }
    }

    console.log(`[seed] Designers seeded: ${(designerData.designers ?? []).length}`);
}

async function seedCustomers() {
    const customerData = await readJson('pages/api/customers.json');

    const store = await prisma.store.findUnique({
        where: {id: DEFAULT_STORE_KEY},
        select: {id: true},
    });

    if (!store) {
        throw new Error('Default store must exist before seeding customers.');
    }

    for (const customer of customerData.customers ?? []) {
        const savedCustomer = await prisma.customer.upsert({
            where: {
                storeId_legacyId: {
                    storeId: store.id,
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
                storeId: store.id,
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

async function main() {
    await seedDefaultStore();
    await seedDesigners();
    await seedCustomers();
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
