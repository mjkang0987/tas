import {Prisma} from '@prisma/client';
import type {Account, User} from 'next-auth';

import {prisma} from '../db/prisma';
import {validateInviteCode} from './invite';

type SyncAuthUserParams = {
    account: Account;
    user?: User;
    inviteCode?: string | null;
    linkUserId?: string | null;
    displayName?: string | null;
};

type SyncedAuthUser = {
    id: string;
    nickname: string;
    email: string | null;
    image: string | null;
};

const ADJECTIVES = [
    '빠른', '조용한', '반짝이는', '든든한', '기민한', '상냥한', '산뜻한', '영리한',
    '부드러운', '선명한', '고요한', '유연한', '차분한', '활기찬', '단단한', '기쁜',
];

const NOUNS = [
    '고래', '사자', '여우', '호랑이', '돌고래', '부엉이', '토끼', '하늘', '바다', '별',
    '달', '숲', '파도', '바람', '구름', '노을',
];

function randomItem(values: string[]): string {
    return values[Math.floor(Math.random() * values.length)];
}

function buildNicknameCandidate(): string {
    const number = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `${randomItem(ADJECTIVES)}${randomItem(NOUNS)}${number}`;
}

function buildFallbackNicknameCandidate(): string {
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${buildNicknameCandidate()}_${suffix}`;
}

async function generateUniqueNickname(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = buildNicknameCandidate();
        const existing = await prisma.user.findUnique({
            where: {nickname: candidate},
            select: {id: true},
        });

        if (!existing)
            return candidate;
    }

    throw new Error('Failed to generate a unique nickname after multiple attempts.');
}

async function generateFallbackUniqueNickname(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = buildFallbackNicknameCandidate();
        const existing = await prisma.user.findUnique({
            where: {nickname: candidate},
            select: {id: true},
        });

        if (!existing)
            return candidate;
    }

    throw new Error('Failed to generate a fallback unique nickname after multiple attempts.');
}

async function createUserWithNickname(
    data: {email: string | null; image: string | null; provider: string; providerSub: string; displayName?: string | null},
    tx: Prisma.TransactionClient,
): Promise<{id: string; nickname: string; email: string | null; image: string | null}> {
    const trimmedDisplayName = data.displayName?.trim();
    if (trimmedDisplayName && trimmedDisplayName.length >= 2) {
        const nickname = trimmedDisplayName.slice(0, 20);
        const existing = await tx.user.findUnique({where: {nickname}, select: {id: true}});
        if (!existing) {
            try {
                return await tx.user.create({
                    data: {
                        email: data.email,
                        nickname,
                        name: nickname,
                        image: data.image,
                        accounts: {create: {provider: data.provider, providerSub: data.providerSub}},
                    },
                    select: {id: true, nickname: true, email: true, image: true},
                });
            } catch (error) {
                if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
                    throw error;
                }
            }
        }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
        const nickname = await generateUniqueNickname();
        try {
            return await tx.user.create({
                data: {
                    email: data.email,
                    nickname,
                    name: nickname,
                    image: data.image,
                    accounts: {
                        create: {provider: data.provider, providerSub: data.providerSub},
                    },
                },
                select: {id: true, nickname: true, email: true, image: true},
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                continue;
            }
            throw error;
        }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
        const nickname = await generateFallbackUniqueNickname();
        try {
            return await tx.user.create({
                data: {
                    email: data.email,
                    nickname,
                    name: nickname,
                    image: data.image,
                    accounts: {
                        create: {provider: data.provider, providerSub: data.providerSub},
                    },
                },
                select: {id: true, nickname: true, email: true, image: true},
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                continue;
            }
            throw error;
        }
    }

    throw new Error('Failed to create a user with a unique nickname.');
}

export async function syncAuthUser({account, user, inviteCode, linkUserId, displayName}: SyncAuthUserParams): Promise<SyncedAuthUser | null> {
    if (!process.env.DATABASE_URL) {
        return null;
    }

    const email = user?.email ?? null;
    const image = user?.image ?? null;
    const provider = account.provider;
    const providerSub = account.providerAccountId;

    // 0. Account linking: attach new provider to existing user
    if (linkUserId) {
        const existingUser = await prisma.user.findUnique({
            where: {id: linkUserId},
            select: {id: true, nickname: true, email: true, image: true},
        });

        if (!existingUser) return null;

        // Check if this provider account is already linked to another user
        const conflicting = await prisma.authAccount.findUnique({
            where: {provider_providerSub: {provider, providerSub}},
            select: {userId: true},
        });

        if (conflicting) {
            // Already linked (to this or another user) — just return existing user
            return existingUser;
        }

        await prisma.authAccount.create({
            data: {userId: linkUserId, provider, providerSub},
        });

        return existingUser;
    }

    // 1. Existing AuthAccount → normal login
    const existingAccount = await prisma.authAccount.findUnique({
        where: {
            provider_providerSub: {provider, providerSub},
        },
        select: {
            user: {select: {id: true, nickname: true, image: true}},
        },
    });

    if (existingAccount) {
        const savedUser = await prisma.user.update({
            where: {id: existingAccount.user.id},
            data: {image},
            select: {id: true, nickname: true, email: true, image: true},
        });
        return savedUser;
    }

    // 2. No existing account — check invite code
    if (inviteCode) {
        const validation = await validateInviteCode(inviteCode);

        if (!validation.valid) {
            console.error('[auth][invite] invalid invite code', {
                code: inviteCode,
                reason: validation.reason,
                provider,
            });
            return null;
        }

        const {invite} = validation;

        const createdUser = await prisma.$transaction(async (tx) => {
            const newUser = await createUserWithNickname({email, image, provider, providerSub, displayName}, tx);

            await tx.membership.create({
                data: {
                    userId: newUser.id,
                    storeId: invite.storeId,
                    role: invite.role,
                },
            });

            await tx.invite.update({
                where: {id: invite.id},
                data: {usedAt: new Date(), usedById: newUser.id},
            });

            return newUser;
        });

        return createdUser;
    }

    // 3. Bootstrap: if no memberships exist at all, first user becomes owner
    const membershipCount = await prisma.membership.count();

    if (membershipCount === 0) {
        const storeName = process.env.STORE_NAME || '내 매장';

        const createdUser = await prisma.$transaction(async (tx) => {
            const newUser = await createUserWithNickname({email, image, provider, providerSub, displayName}, tx);

            const store = await tx.store.create({
                data: {name: storeName},
            });

            await tx.membership.create({
                data: {
                    userId: newUser.id,
                    storeId: store.id,
                    role: 'owner',
                },
            });

            return newUser;
        });

        return createdUser;
    }

    // 4. No account, no invite, not bootstrap → block
    return null;
}
