import type {Account, User} from 'next-auth';

import {prisma} from './prisma';

type SyncAuthUserParams = {
    account: Account;
    user?: User;
};

export async function syncAuthUser({account, user}: SyncAuthUserParams): Promise<string | null> {
    if (!process.env.DATABASE_URL) {
        return null;
    }

    const email = user?.email ?? null;
    const name = user?.name ?? null;
    const image = user?.image ?? null;

    if (email) {
        const savedUser = await prisma.user.upsert({
            where: {email},
            update: {
                name,
                image,
                provider: account.provider,
                providerSub: account.providerAccountId,
            },
            create: {
                email,
                name,
                image,
                provider: account.provider,
                providerSub: account.providerAccountId,
            },
            select: {id: true},
        });

        return savedUser.id;
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            provider: account.provider,
            providerSub: account.providerAccountId,
        },
        select: {id: true},
    });

    if (existingUser) {
        await prisma.user.update({
            where: {id: existingUser.id},
            data: {
                name,
                image,
            },
        });

        return existingUser.id;
    }

    const createdUser = await prisma.user.create({
        data: {
            name,
            image,
            provider: account.provider,
            providerSub: account.providerAccountId,
        },
        select: {id: true},
    });

    return createdUser.id;
}
