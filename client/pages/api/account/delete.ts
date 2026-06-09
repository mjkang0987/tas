import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../auth';
import {prisma} from '../../../lib/prisma';

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
                await tx.store.delete({where: {id: storeId}});
            }

            await tx.user.delete({where: {id: userId}});
        });

        res.status(200).json({ok: true});
    } catch (error) {
        console.error('Account deletion failed:', error);
        res.status(500).json({error: 'Failed to delete account'});
    }
}
