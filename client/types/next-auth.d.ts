import type {DefaultSession} from 'next-auth';

type PendingMergeInfo = {
    conflictUserId: string;
    provider: string;
    providerSub: string;
};

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            provider: string;
            role?: 'owner' | 'staff';
            storeId?: string;
            onboarded?: boolean;
            loginError?: string;
            pendingMerge?: PendingMergeInfo;
        } & DefaultSession['user'];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        userId?: string;
        provider?: string;
        role?: 'owner' | 'staff';
        storeId?: string;
        preferredStoreId?: string;
        onboarded?: boolean;
        loginError?: string;
        pendingMerge?: PendingMergeInfo;
    }
}
