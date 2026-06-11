import {AsyncLocalStorage} from 'node:async_hooks';

import NextAuth from 'next-auth';
import type {Provider} from 'next-auth/providers';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';

import {prisma} from '../server/db/prisma';
import {resolveUserMembership} from '../server/auth/resolve-user-membership';
import {syncAuthUser} from '../server/auth/sync-auth-user';
import {saveGoogleTokens} from '../server/api/gmail/token-manager';

type AuthRequestContext = {inviteCode?: string | null; linkUserId?: string | null};
export const authRequestContext = new AsyncLocalStorage<AuthRequestContext>();

type KakaoProfile = {
    id?: string | number;
    sub?: string;
    kakao_account?: {
        email?: string;
        profile?: {
            nickname?: string;
            profile_image_url?: string;
        };
    };
    properties?: {
        nickname?: string;
        profile_image?: string;
    };
};

const providers: Provider[] = [];

if (process.env.AUTH_GOOGLE_ID && !process.env.AUTH_GOOGLE_ID.startsWith('REPLACE'))
    providers.push(Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        authorization: {
            params: {
                scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    }));
if (process.env.AUTH_KAKAO_ID && !process.env.AUTH_KAKAO_ID.startsWith('REPLACE'))
    providers.push(Kakao({
        clientId: process.env.AUTH_KAKAO_ID,
        clientSecret: process.env.AUTH_KAKAO_SECRET,
        profile(profile) {
            const kakaoProfile = profile as KakaoProfile;
            const id = kakaoProfile.id ?? kakaoProfile.sub;

            if (id === undefined || id === null) {
                const profileKeys = Object.keys(profile as Record<string, unknown>).sort().join(', ');
                throw new Error(`Kakao profile is missing id. Received keys: ${profileKeys || '(none)'}`);
            }

            return {
                id: String(id),
                name: kakaoProfile.kakao_account?.profile?.nickname ?? kakaoProfile.properties?.nickname,
                email: kakaoProfile.kakao_account?.email,
                image: kakaoProfile.kakao_account?.profile?.profile_image_url ?? kakaoProfile.properties?.profile_image,
            };
        }
    }));
if (process.env.AUTH_NAVER_ID && !process.env.AUTH_NAVER_ID.startsWith('REPLACE'))
    providers.push(Naver({
        clientId: process.env.AUTH_NAVER_ID,
        clientSecret: process.env.AUTH_NAVER_SECRET,
    }));

export const {handlers, auth, signIn, signOut} = NextAuth({
    providers,
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        authorized({auth, request}) {
            const pathname = request.nextUrl.pathname;

            if (pathname === '/login' || pathname.startsWith('/api/auth')) {
                return true;
            }

            if (auth?.user?.loginError === 'no-account') {
                return Response.redirect(new URL('/login', request.nextUrl));
            }

            return true;
        },
        async jwt({token, account, user, trigger, session}) {
            if (trigger === 'update') {
                if (session?.clearPendingMerge) {
                    token.pendingMerge = undefined;
                }
                if (session?.name) {
                    token.name = session.name;
                }
                if (session?.storeId) {
                    token.preferredStoreId = session.storeId as string;
                }
                if (session?.name && !session?.storeId && !session?.clearPendingMerge) {
                    return token;
                }
            }

            if (account) {
                token.sub = account.providerAccountId;
                token.provider = account.provider;

                const inviteCode = authRequestContext.getStore()?.inviteCode ?? null;
                const linkUserId = authRequestContext.getStore()?.linkUserId ?? null;

                try {
                    const syncedUser = await syncAuthUser({account, user, inviteCode, linkUserId, displayName: user?.name ?? null});

                    if (!syncedUser) {
                        token.loginError = 'no-account';
                        return token;
                    }

                    token.userId = syncedUser.id;
                    token.name = syncedUser.nickname;
                    token.email = syncedUser.email;
                    token.picture = syncedUser.image;
                    token.loginError = undefined;
                    token.pendingMerge = syncedUser.pendingMerge;

                    if (account.provider === 'google' && account.access_token) {
                        await saveGoogleTokens(syncedUser.id, {
                            accessToken: account.access_token,
                            refreshToken: account.refresh_token ?? null,
                            expiresAt: account.expires_at
                                ? new Date(account.expires_at * 1000)
                                : null,
                        });
                    }
                } catch (error) {
                    console.error('[auth] syncAuthUser failed:', error);
                    token.loginError = 'sync-error';
                    return token;
                }
            }

            // Backfill: 기존 JWT에 userId가 없으면 providerSub로 DB 조회해 복구
            if (!token.userId && token.sub) {
                const existing = await prisma.authAccount.findFirst({
                    where: {providerSub: token.sub},
                    select: {provider: true, user: {select: {id: true, nickname: true, email: true, image: true}}},
                });
                if (existing) {
                    token.userId = existing.user.id;
                    token.name = existing.user.nickname;
                    token.email = existing.user.email;
                    token.picture = existing.user.image;
                    if (!token.provider) token.provider = existing.provider;
                } else if (!account) {
                    // DB에서 유저를 찾을 수 없는 유령 세션 → 로그인 페이지로
                    token.loginError = 'no-account';
                    return token;
                }
            }

            const membership = await resolveUserMembership((token.userId as string) ?? null, token.preferredStoreId);
            token.role = membership?.role;
            token.storeId = membership?.storeId;

            if (membership?.storeId) {
                const store = await prisma.store.findUnique({
                    where: {id: membership.storeId},
                    select: {onboarded: true},
                });
                token.onboarded = store?.onboarded ?? false;
            } else {
                token.onboarded = false;
            }

            return token;
        },
        async session({session, token}) {
            if (session.user) {
                let userId = token.userId as string | undefined;

                // 기존 JWT에 userId 없으면 providerSub로 DB 조회
                if (!userId && token.sub) {
                    const found = await prisma.authAccount.findFirst({
                        where: {providerSub: token.sub},
                        select: {userId: true, provider: true},
                    });
                    if (found) {
                        userId = found.userId;
                        token.userId = found.userId;
                        if (!token.provider) token.provider = found.provider;
                    }
                }

                session.user.id = userId ?? token.sub ?? '';
                session.user.name = token.name ?? session.user.name;
                session.user.email = token.email ?? session.user.email;
                session.user.image = (token.picture as string | null | undefined) ?? session.user.image;
                session.user.provider = (token.provider as string) ?? '';
                session.user.role = token.role as 'owner' | 'staff' | undefined;
                session.user.storeId = token.storeId as string | undefined;
                session.user.onboarded = token.onboarded as boolean | undefined;
                session.user.loginError = token.loginError as string | undefined;
                session.user.pendingMerge = token.pendingMerge;
            }
            return session;
        }
    }
});
