import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.reservation.updateMany({
        where: {naverBookingId: {not: null}},
        data: {channel: 'naver'},
    });

    console.log(`[migrate-channel] Updated ${result.count} naver reservations to channel='naver'`);
}

main()
    .catch((error) => {
        console.error('[migrate-channel] Failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
