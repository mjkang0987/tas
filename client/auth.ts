import NextAuth from 'next-auth';
import type {Provider} from 'next-auth/providers';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';

import {syncAuthUser} from './lib/sync-auth-user';

const providers: Provider[] = [];

if (process.env.AUTH_GOOGLE_ID && !process.env.AUTH_GOOGLE_ID.startsWith('REPLACE'))
    providers.push(Google);
if (process.env.AUTH_KAKAO_ID && !process.env.AUTH_KAKAO_ID.startsWith('REPLACE'))
    providers.push(Kakao);
if (process.env.AUTH_NAVER_ID && !process.env.AUTH_NAVER_ID.startsWith('REPLACE'))
    providers.push(Naver);

export const {handlers, auth, signIn, signOut} = NextAuth({
    providers,
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: '/login'
    },
    callbacks: {
        authorized({auth, request}) {
            const pathname = request.nextUrl.pathname;

            if (pathname === '/login' || pathname.startsWith('/api/auth')) {
                return true;
            }

            return !!auth;
        },
        async jwt({token, account, user}) {
            if (account) {
                token.sub = account.providerAccountId;
                token.provider = account.provider;
                token.userId = await syncAuthUser({account, user}) ?? token.userId;
            }
            return token;
        },
        session({session, token}) {
            if (session.user) {
                session.user.id = (token.userId as string) ?? token.sub ?? '';
                session.user.provider = (token.provider as string) ?? '';
                session.user.role = token.role as 'owner' | 'manager' | 'staff' | undefined;
                session.user.storeId = token.storeId as string | undefined;
            }
            return session;
        }
    }
});
