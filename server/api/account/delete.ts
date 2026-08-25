import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../client/auth';
import {prisma} from '../../db/prisma';
import {notifySlackOpsError} from '../../notify/slack';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', 'DELETE');
        res.status(405).json({error: 'Method Not Allowed'});
        return;
    }

    const session = await auth(req, res);
    if (!session?.user?.id) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    const userId = session.user.id;
    const storeId = session.user.storeId;
    const role = session.user.role;

    try {
        await prisma.$transaction(async (tx) => {
            if (role === 'owner' && storeId) {
                // 삭제된 온라인 예약의 흔적은 FK 가 없어 store cascade 로 지워지지 않는다.
                // 탈퇴하면 매장이 통째로 사라지므로 흔적도 남길 이유가 없다(안 지우면 영구 고아).
                await tx.deletedBooking.deleteMany({where: {storeId}});
                await tx.store.delete({where: {id: storeId}});
            }

            await tx.user.delete({where: {id: userId}});
        });

        res.status(200).json({ok: true});
    } catch (error) {
        console.error('Account deletion failed:', error);
        await notifySlackOpsError('DELETE /api/account/delete', error);
        res.status(500).json({error: 'Failed to delete account'});
    }
}
