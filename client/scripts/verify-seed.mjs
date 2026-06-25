import 'dotenv/config';

import {PrismaPg} from '@prisma/adapter-pg';

import {PrismaClient} from '../prisma/generated/prisma/client.ts';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})});
const DEFAULT_STORE_KEY = 'default-store';
const SEED_DATA_DIR = '../server/prisma/seed-data';

async function readJson(relativePath) {
    const absolutePath = path.join(process.cwd(), relativePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(raw);
}

function seedDataPath(fileName) {
    return `${SEED_DATA_DIR}/${fileName}`;
}

function getCustomerPointHistoryCount(customers) {
    return (customers.customers ?? []).flatMap((customer) => customer.pointHistories ?? []).length;
}

function getSourceCount(source, key) {
    return Array.isArray(source[key]) ? source[key].length : 0;
}

function createCheck(label, actual, expected) {
    return [label, actual, expected];
}

function getCheckStatus(actual, expected) {
    return actual === expected ? 'OK' : 'MISMATCH';
}

async function main() {
    const [customers, assignees, services, reservations] = await Promise.all([
        readJson(seedDataPath('customers.json')),
        readJson(seedDataPath('assignees.json')),
        readJson(seedDataPath('services.json')),
        readJson(seedDataPath('reservations.json')),
    ]);

    const store = await prisma.store.findUnique({
        where: {id: DEFAULT_STORE_KEY},
        select: {
            _count: {
                select: {
                    customers: true,
                    assignees: true,
                    services: true,
                    reservations: true,
                    reservationEvents: true,
                    memberships: true,
                },
            },
        },
    });

    const pointHistoryCount = await prisma.customerPointHistory.count({
        where: {
            customer: {
                storeId: DEFAULT_STORE_KEY,
            },
        },
    });

    const ownerMembershipCount = await prisma.membership.count({
        where: {
            storeId: DEFAULT_STORE_KEY,
            role: 'owner',
        },
    });

    const paidReservationWithEntries = await prisma.reservation.findFirst({
        where: {
            storeId: DEFAULT_STORE_KEY,
            paymentCompleted: true,
            paymentEntries: {
                some: {},
            },
        },
        select: {id: true},
    });

    if (!store) {
        throw new Error('Default store not found. Run the seed first.');
    }

    const checks = [
        createCheck('customers', store._count.customers, getSourceCount(customers, 'customers')),
        createCheck('assignees', store._count.assignees, getSourceCount(assignees, 'assignees')),
        createCheck('services', store._count.services, getSourceCount(services, 'services')),
        createCheck('reservations', store._count.reservations, getSourceCount(reservations, 'reservations')),
        createCheck('reservation history', store._count.reservationEvents, getSourceCount(reservations, 'history')),
        createCheck('customer point history', pointHistoryCount, getCustomerPointHistoryCount(customers)),
    ];

    let hasMismatch = false;

    for (const [label, actual, expected] of checks) {
        const status = getCheckStatus(actual, expected);
        if (status !== 'OK') hasMismatch = true;
        console.log(`[verify-seed] ${label}: ${actual}/${expected} ${status}`);
    }

    console.log(`[verify-seed] memberships: ${store._count.memberships}`);
    console.log(`[verify-seed] owner memberships: ${ownerMembershipCount}`);

    if (ownerMembershipCount < 1) {
        hasMismatch = true;
        console.log('[verify-seed] owner membership check failed');
    }

    if (!paidReservationWithEntries) {
        hasMismatch = true;
        console.log('[verify-seed] paid reservation payment entry check failed');
    } else {
        console.log(`[verify-seed] paid reservation with entries: ${paidReservationWithEntries.id}`);
    }

    if (hasMismatch) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error('[verify-seed] Failed to verify imported data.');
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
