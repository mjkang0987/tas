import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../client/auth';
import type {AppRole} from './roles';
import {hasRequiredRole} from './roles';
import {verifyMobileAccess} from './mobile-token';

export interface ApiSession {
    userId: string;
    storeId: string;
    role: AppRole;
}

function bearerToken(req: NextApiRequest): string | null {
    const header = req.headers.authorization;
    if (!header) {
        return null;
    }
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
}

export async function getApiSession(req: NextApiRequest, res: NextApiResponse): Promise<ApiSession | null> {
    // 1) 모바일 Bearer 토큰(앱) — 유효하면 세션으로 사용. 없거나 무효면 쿠키 경로로 폴백(웹 무회귀).
    const token = bearerToken(req);
    if (token) {
        const claims = verifyMobileAccess(token);
        if (claims) {
            return {userId: claims.userId, storeId: claims.storeId, role: claims.role};
        }
    }

    // 2) 웹 NextAuth 쿠키 세션 (기존 동작 그대로)
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
