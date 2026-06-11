import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../auth';
import {prisma} from '../../lib/prisma';
import {hasRequiredRole} from '../../../server/auth/roles';
import {generateInviteCode, getInviteExpiresAt} from '../../../server/auth/invite';

const ALLOWED_ROLES = new Set(['owner', 'staff']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await auth(req, res);
    if (!session?.user?.id || !session.user.storeId) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    const userRole = session.user.role as 'owner' | 'staff' | undefined;

    if (!hasRequiredRole(userRole, 'owner')) {
        res.status(403).json({error: 'Forbidden'});
        return;
    }

    if (req.method === 'POST') {
        const role = typeof req.body?.role === 'string' ? req.body.role : null;
        if (!role || !ALLOWED_ROLES.has(role)) {
            res.status(400).json({error: 'Invalid role. Must be "owner" or "staff".'});
            return;
        }

        // Generate unique code with retry
        for (let attempt = 0; attempt < 10; attempt++) {
            const code = generateInviteCode();
            try {
                const invite = await prisma.invite.create({
                    data: {
                        storeId: session.user.storeId,
                        code,
                        role,
                        expiresAt: getInviteExpiresAt(),
                        createdBy: session.user.id,
                    },
                    select: {
                        id: true,
                        code: true,
                        role: true,
                        expiresAt: true,
                        createdAt: true,
                    },
                });
                res.status(201).json(invite);
                return;
            } catch (error: unknown) {
                const isPrismaUniqueError = error != null
                    && typeof error === 'object'
                    && 'code' in error
                    && (error as {code: string}).code === 'P2002';
                if (isPrismaUniqueError) {
                    continue;
                }
                throw error;
            }
        }

        res.status(500).json({error: 'Failed to generate unique invite code'});
        return;
    }

    if (req.method === 'GET') {
        const invites = await prisma.invite.findMany({
            where: {storeId: session.user.storeId},
            orderBy: {createdAt: 'desc'},
            select: {
                id: true,
                code: true,
                role: true,
                expiresAt: true,
                usedAt: true,
                createdAt: true,
                usedByUser: {select: {nickname: true}},
            },
        });

        res.status(200).json(invites);
        return;
    }

    if (req.method === 'DELETE') {
        const inviteId = typeof req.body?.id === 'string' ? req.body.id : null;
        if (!inviteId) {
            res.status(400).json({error: 'Missing invite id'});
            return;
        }

        const invite = await prisma.invite.findUnique({
            where: {id: inviteId},
            select: {storeId: true, usedAt: true},
        });

        if (!invite || invite.storeId !== session.user.storeId) {
            res.status(404).json({error: 'Invite not found'});
            return;
        }

        if (invite.usedAt) {
            res.status(400).json({error: 'Cannot delete a used invite'});
            return;
        }

        await prisma.invite.delete({where: {id: inviteId}});
        res.status(200).json({ok: true});
        return;
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    res.status(405).json({error: 'Method Not Allowed'});
}
