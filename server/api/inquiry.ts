import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession} from '../auth/api-session';
import {sendInquiryEmail} from './mail/send-inquiry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);
    const storeId = session?.storeId ?? null;

    if (req.method === 'GET') {
        if (!storeId) {
            return res.status(200).json({inquiries: []});
        }

        const inquiries = await prisma.inquiry.findMany({
            where: {storeId},
            orderBy: {createdAt: 'desc'},
        });

        return res.status(200).json({
            inquiries: inquiries.map((i) => ({
                id: i.id,
                name: i.name,
                email: i.email,
                content: i.content,
                createdAt: i.createdAt.toISOString(),
            })),
        });
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const {name, email, content} = req.body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({error: '이름을 입력해 주세요.'});
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({error: '문의 내용을 입력해 주세요.'});
    }

    const trimmedName = name.trim();
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedContent = content.trim();

    await prisma.inquiry.create({
        data: {
            storeId,
            name: trimmedName,
            email: trimmedEmail,
            content: trimmedContent,
        },
    });

    // 메일 발송 (실패해도 DB 저장은 완료되었으므로 200 응답)
    try {
        await sendInquiryEmail({name: trimmedName, email: trimmedEmail, content: trimmedContent});
    } catch (err) {
        console.error('[inquiry] 메일 발송 실패:', err);
    }

    return res.status(200).json({ok: true});
}
