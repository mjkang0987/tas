import {PrismaClient} from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const DEFAULT_STORE_KEY = 'default-store';

async function readJson(relativePath) {
    const absolutePath = path.join(process.cwd(), relativePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(raw);
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

async function main() {
    const [customers, designers, services, reservations] = await Promise.all([
        readJson('pages/api/customers.json'),
        readJson('pages/api/designers.json'),
        readJson('pages/api/services.json'),
        readJson('pages/api/reservations.json'),
    ]);

    const store = await prisma.store.findUnique({
        where: {id: DEFAULT_STORE_KEY},
        select: {
            _count: {
                select: {
                    customers: true,
                    designers: true,
                    services: true,
                    reservations: true,
                    reservationEvents: true,
                    memberships: true,
                    pointHistories: true,
                },
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
        createCheck('designers', store._count.designers, getSourceCount(designers, 'designers')),
        createCheck('services', store._count.services, getSourceCount(services, 'services')),
        createCheck('reservations', store._count.reservations, getSourceCount(reservations, 'reservations')),
        createCheck('reservation history', store._count.reservationEvents, getSourceCount(reservations, 'history')),
        createCheck('customer point history', store._count.pointHistories, getCustomerPointHistoryCount(customers)),
    ];

    let hasMismatch = false;

    for (const [label, actual, expected] of checks) {
        const status = actual === expected ? 'OK' : 'MISMATCH';
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
