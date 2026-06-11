import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../auth';
import {prisma} from '../../lib/prisma';
import {hasRequiredRole} from '../../../server/auth/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await auth(req, res);
    if (!session?.user?.id || !session.user.storeId) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    const storeId = session.user.storeId;
    const userId = session.user.id;
    const userRole = session.user.role as 'owner' | 'manager' | 'staff' | undefined;

    if (req.method === 'GET') {
        const members = await prisma.membership.findMany({
            where: {storeId},
            orderBy: {createdAt: 'asc'},
            select: {
                id: true,
                role: true,
                user: {select: {id: true, nickname: true, email: true}},
            },
        });
        return res.status(200).json(members);
    }

    // 역할 변경: owner만 가능
    if (req.method === 'PATCH') {
        if (!hasRequiredRole(userRole, 'owner')) {
            return res.status(403).json({error: 'Forbidden'});
        }

        const {membershipId, role} = req.body ?? {};
        if (!membershipId || (role !== 'manager' && role !== 'staff')) {
            return res.status(400).json({error: '잘못된 요청입니다.'});
        }

        const membership = await prisma.membership.findUnique({where: {id: membershipId}});
        if (!membership || membership.storeId !== storeId) {
            return res.status(404).json({error: '멤버를 찾을 수 없습니다.'});
        }
        if (membership.role === 'owner') {
            return res.status(400).json({error: '오너 역할은 변경할 수 없습니다.'});
        }
        if (membership.userId === userId) {
            return res.status(400).json({error: '자신의 역할은 변경할 수 없습니다.'});
        }

        await prisma.membership.update({where: {id: membershipId}, data: {role}});
        return res.status(200).json({ok: true});
    }

    // 멤버 제거: owner만 가능
    if (req.method === 'DELETE') {
        if (!hasRequiredRole(userRole, 'owner')) {
            return res.status(403).json({error: 'Forbidden'});
        }

        const {membershipId} = req.body ?? {};
        if (!membershipId) {
            return res.status(400).json({error: '잘못된 요청입니다.'});
        }

        const membership = await prisma.membership.findUnique({where: {id: membershipId}});
        if (!membership || membership.storeId !== storeId) {
            return res.status(404).json({error: '멤버를 찾을 수 없습니다.'});
        }
        if (membership.role === 'owner') {
            return res.status(400).json({error: '오너는 제거할 수 없습니다.'});
        }
        if (membership.userId === userId) {
            return res.status(400).json({error: '자기 자신을 제거할 수 없습니다.'});
        }

        await prisma.membership.delete({where: {id: membershipId}});
        return res.status(200).json({ok: true});
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({error: 'Method Not Allowed'});
}
