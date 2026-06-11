import {PrismaClient} from '../prisma/generated/prisma/client.js';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    const stores = await prisma.store.findMany({select: {id: true, name: true}});
    let totalFixed = 0;

    for (const store of stores) {
        const designers = await prisma.designer.findMany({
            where: {storeId: store.id},
            orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
            select: {id: true, name: true, legacyId: true},
        });

        const used = designers
            .map((d) => d.legacyId)
            .filter((v) => typeof v === 'number');
        let next = used.length > 0 ? Math.max(...used) + 1 : 1;

        const missing = designers.filter((d) => d.legacyId == null);
        if (missing.length === 0) continue;

        console.log(`\n[${store.name ?? store.id}] ${missing.length}건의 null legacyId`);

        for (const d of missing) {
            const legacyId = next++;
            console.log(`  - ${d.name} → legacyId ${legacyId}`);
            if (!DRY_RUN) {
                await prisma.designer.update({
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
