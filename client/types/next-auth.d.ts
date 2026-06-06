import type {DefaultSession} from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            provider: string;
            role?: 'owner' | 'manager' | 'staff';
            storeId?: string;
            onboarded?: boolean;
            loginError?: string;
        } & DefaultSession['user'];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        userId?: string;
        provider?: string;
        role?: 'owner' | 'manager' | 'staff';
        storeId?: string;
        onboarded?: boolean;
        loginError?: string;
    }
}
