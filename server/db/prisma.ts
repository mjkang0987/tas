import {PrismaClient} from '../../client/prisma/generated/prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';

declare global {
    var __prisma__: PrismaClient | undefined;
}

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL});

export const prisma = globalThis.__prisma__ ?? new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma__ = prisma;
}
