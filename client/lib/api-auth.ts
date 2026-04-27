import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../auth';
import type {AppRole} from './authz';
import {hasRequiredRole} from './authz';

export interface ApiSession {
    userId: string;
    storeId: string;
    role: AppRole;
}

export async function getApiSession(req: NextApiRequest, res: NextApiResponse): Promise<ApiSession | null> {
    const session = await auth(req, res);

    if (!session?.user?.storeId || !session.user.role) {
        return null;
    }

    return {
        userId: session.user.id,
        storeId: session.user.storeId,
        role: session.user.role,
    };
}

export function requireRole(
    session: ApiSession | null,
    requiredRole: AppRole,
    res: NextApiResponse
): session is ApiSession {
    if (!session) {
        res.status(401).json({error: 'Unauthorized'});
        return false;
    }

    if (!hasRequiredRole(session.role, requiredRole)) {
        res.status(403).json({error: 'Forbidden'});
        return false;
    }

    return true;
}
