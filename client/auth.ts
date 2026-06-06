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

type AuthRequestContext = {inviteCode?: string | null};
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
        signIn: '/login'
    },
    callbacks: {
        authorized({request}) {
            const pathname = request.nextUrl.pathname;

            if (pathname === '/login' || pathname.startsWith('/api/auth')) {
                return true;
            }

            return true;
        },
        async jwt({token, account, user}) {
            if (account) {
                token.sub = account.providerAccountId;
                token.provider = account.provider;

                const inviteCode = authRequestContext.getStore()?.inviteCode ?? null;

                const syncedUser = await syncAuthUser({account, user, inviteCode});

                if (!syncedUser) {
                    token.loginError = 'no-account';
                    return token;
                }

                token.userId = syncedUser.id;
                token.name = syncedUser.nickname;
                token.email = syncedUser.email;
                token.picture = syncedUser.image;
                token.loginError = undefined;

                if (account.provider === 'google' && account.access_token) {
                    await saveGoogleTokens(syncedUser.id, {
                        accessToken: account.access_token,
                        refreshToken: account.refresh_token ?? null,
                        expiresAt: account.expires_at
                            ? new Date(account.expires_at * 1000)
                            : null,
                    });
                }
            }

            const membership = await resolveUserMembership((token.userId as string) ?? null);
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
        session({session, token}) {
            if (session.user) {
                session.user.id = (token.userId as string) ?? token.sub ?? '';
                session.user.name = token.name ?? session.user.name;
                session.user.email = token.email ?? session.user.email;
                session.user.image = (token.picture as string | null | undefined) ?? session.user.image;
                session.user.provider = (token.provider as string) ?? '';
                session.user.role = token.role as 'owner' | 'manager' | 'staff' | undefined;
                session.user.storeId = token.storeId as string | undefined;
                session.user.onboarded = token.onboarded as boolean | undefined;
                session.user.loginError = token.loginError as string | undefined;
            }
            return session;
        }
    }
});
