import 'dotenv/config';

import {PrismaPg} from '@prisma/adapter-pg';

import {PrismaClient} from '../prisma/generated/prisma/client.ts';

const prisma = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})});

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    const stores = await prisma.store.findMany({select: {id: true, name: true}});
    let totalFixed = 0;

    for (const store of stores) {
        const assignees = await prisma.assignee.findMany({
            where: {storeId: store.id},
            orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
            select: {id: true, name: true, legacyId: true},
        });

        const used = assignees
            .map((d) => d.legacyId)
            .filter((v) => typeof v === 'number');
        let next = used.length > 0 ? Math.max(...used) + 1 : 1;

        const missing = assignees.filter((d) => d.legacyId == null);
        if (missing.length === 0) continue;

        console.log(`\n[${store.name ?? store.id}] ${missing.length}건의 null legacyId`);

        for (const d of missing) {
            const legacyId = next++;
            console.log(`  - ${d.name} → legacyId ${legacyId}`);
            if (!DRY_RUN) {
                await prisma.assignee.update({
                    where: {id: d.id},
                    data: {legacyId},
                });
            }
            totalFixed += 1;
        }
    }

    console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}총 ${totalFixed}건 ${DRY_RUN ? '처리 예정' : '처리 완료'}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
