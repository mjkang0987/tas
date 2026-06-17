import {Prisma} from '../../client/prisma/generated/prisma/client';
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

type PendingMerge = {
    conflictUserId: string;
    provider: string;
    providerSub: string;
};

type SyncedAuthUser = {
    id: string;
    nickname: string;
    email: string | null;
    image: string | null;
    pendingMerge?: PendingMerge;
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

// 닉네임은 트랜잭션 밖(prisma)에서 미리 유니크하게 확정한다.
// 트랜잭션 내부에서 create 실패 후 재시도하면 Postgres가 트랜잭션을 abort하여
// 이후 모든 쿼리가 25P02(current transaction is aborted)로 막히기 때문.
async function resolveUniqueNickname(displayName?: string | null): Promise<string> {
    const trimmed = displayName?.trim();
    if (trimmed && trimmed.length >= 2) {
        const nickname = trimmed.slice(0, 20);
        const existing = await prisma.user.findUnique({where: {nickname}, select: {id: true}});
        if (!existing) return nickname;
    }
    try {
        return await generateUniqueNickname();
    } catch {
        return await generateFallbackUniqueNickname();
    }
}

async function createUserWithNickname(
    data: {email: string | null; image: string | null; provider: string; providerSub: string; displayName?: string | null},
    tx: Prisma.TransactionClient,
): Promise<{id: string; nickname: string; email: string | null; image: string | null}> {
    const nickname = await resolveUniqueNickname(data.displayName);
    // 단일 create — 충돌 시 throw하여 트랜잭션이 깔끔히 롤백되도록 한다(재시도하지 않음).
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
            if (conflicting.userId === linkUserId) {
                // Already linked to this user — no action needed
                return existingUser;
            }
            // Linked to a different user — return with merge info
            return {
                ...existingUser,
                pendingMerge: {conflictUserId: conflicting.userId, provider, providerSub},
            };
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

    // 1.5 Same email already registered (다른 SNS로 가입) → 새 SNS 계정을 기존 유저에 연결.
    //     (이메일 unique 충돌로 가입이 막히는 대신, 같은 사람으로 보고 로그인시킨다)
    if (email) {
        const userByEmail = await prisma.user.findUnique({
            where: {email},
            select: {id: true, nickname: true, email: true, image: true},
        });
        if (userByEmail) {
            await prisma.authAccount.create({
                data: {userId: userByEmail.id, provider, providerSub},
            });
            return userByEmail;
        }
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

    // 3. No account, no invite → create new user with new store (owner)
    const storeName = process.env.STORE_NAME || '내 매장';

    const createdUser = await prisma.$transaction(async (tx) => {
        const newUser = await createUserWithNickname({email, image, provider, providerSub, displayName}, tx);

        const store = await tx.store.create({
            data: {name: storeName, onboarded: false},
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
