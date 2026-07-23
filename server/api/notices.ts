import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from '../db/prisma';
import {parseI18nText} from '../db/mappers';
import {MAX_PINNED_NOTICES} from '../../client/features/notices/model';
import {getApiSession, requireRole} from '../auth/api-session';

const CATEGORIES = ['notice', 'event', 'info'] as const;

function isCategory(value: unknown): value is (typeof CATEGORIES)[number] {
    return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

// i18n 입력(JSON 컬럼)을 정규화해 Prisma 값으로. en/ja/zh 문자열만 남기고, 비면 JsonNull(한국어 폴백).
function i18nInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    const parsed = parseI18nText(value);
    return parsed ? (parsed as Prisma.InputJsonValue) : Prisma.JsonNull;
}

type NoticeRow = {
    id: string; category: string; title: string; titleI18nJson: unknown;
    body: string; bodyI18nJson: unknown; visible: boolean; pinned: boolean; createdAt: Date;
};

// 공지 1건을 프론트 응답 형태로. i18n은 parseI18nText로 정규화(비면 null).
function shapeNotice(n: NoticeRow) {
    return {
        id: n.id,
        category: n.category,
        title: n.title,
        titleI18n: parseI18nText(n.titleI18nJson),
        body: n.body,
        bodyI18n: parseI18nText(n.bodyI18nJson),
        visible: n.visible,
        pinned: n.pinned,
        createdAt: n.createdAt.toISOString(),
    };
}

// 매장 공지사항 CRUD. 조회는 staff+, 생성/수정/삭제는 owner. 전부 storeId 스코프.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiSession(req, res);

    if (req.method === 'GET') {
        if (!requireRole(session, 'staff', res)) return;

        const notices = await prisma.storeNotice.findMany({
            where: {storeId: session.storeId},
            orderBy: [{pinned: 'desc'}, {createdAt: 'desc'}],
        });
        return res.status(200).json({notices: notices.map(shapeNotice)});
    }

    if (req.method === 'POST') {
        if (!requireRole(session, 'owner', res)) return;

        const body = req.body as {
            category?: unknown; title?: unknown; titleI18n?: unknown;
            body?: unknown; bodyI18n?: unknown; visible?: unknown; pinned?: unknown;
        };

        if (typeof body.title !== 'string' || !body.title.trim()) {
            return res.status(400).json({error: 'Invalid title'});
        }
        if (typeof body.body !== 'string' || !body.body.trim()) {
            return res.status(400).json({error: 'Invalid body'});
        }
        if (body.category !== undefined && !isCategory(body.category)) {
            return res.status(400).json({error: 'Invalid category'});
        }

        const pinned = body.pinned === undefined ? false : Boolean(body.pinned);
        if (pinned && (await prisma.storeNotice.count({where: {storeId: session.storeId, pinned: true}})) >= MAX_PINNED_NOTICES) {
            return res.status(409).json({error: 'pin_limit'});
        }

        const created = await prisma.storeNotice.create({
            data: {
                storeId: session.storeId,
                category: isCategory(body.category) ? body.category : 'notice',
                title: body.title.trim(),
                titleI18nJson: i18nInput(body.titleI18n),
                body: body.body.trim(),
                bodyI18nJson: i18nInput(body.bodyI18n),
                visible: body.visible === undefined ? true : Boolean(body.visible),
                pinned,
            },
        });
        return res.status(200).json(shapeNotice(created));
    }

    if (req.method === 'PUT') {
        if (!requireRole(session, 'owner', res)) return;

        const body = req.body as {
            id?: unknown; category?: unknown; title?: unknown; titleI18n?: unknown;
            body?: unknown; bodyI18n?: unknown; visible?: unknown; pinned?: unknown;
        };

        if (typeof body.id !== 'string') return res.status(400).json({error: 'Invalid id'});
        if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
            return res.status(400).json({error: 'Invalid title'});
        }
        if (body.body !== undefined && (typeof body.body !== 'string' || !body.body.trim())) {
            return res.status(400).json({error: 'Invalid body'});
        }
        if (body.category !== undefined && !isCategory(body.category)) {
            return res.status(400).json({error: 'Invalid category'});
        }

        if (body.pinned !== undefined && Boolean(body.pinned)
            && (await prisma.storeNotice.count({where: {storeId: session.storeId, pinned: true, id: {not: body.id}}})) >= MAX_PINNED_NOTICES) {
            return res.status(409).json({error: 'pin_limit'});
        }

        const result = await prisma.storeNotice.updateMany({
            where: {id: body.id, storeId: session.storeId},
            data: {
                ...(body.category !== undefined && {category: body.category as string}),
                ...(body.title !== undefined && {title: (body.title as string).trim()}),
                ...(body.titleI18n !== undefined && {titleI18nJson: i18nInput(body.titleI18n)}),
                ...(body.body !== undefined && {body: (body.body as string).trim()}),
                ...(body.bodyI18n !== undefined && {bodyI18nJson: i18nInput(body.bodyI18n)}),
                ...(body.visible !== undefined && {visible: Boolean(body.visible)}),
                ...(body.pinned !== undefined && {pinned: Boolean(body.pinned)}),
            },
        });
        if (result.count === 0) return res.status(404).json({error: 'Not found'});
        return res.status(200).json({ok: true});
    }

    if (req.method === 'DELETE') {
        if (!requireRole(session, 'owner', res)) return;

        const {id} = req.body as {id?: unknown};
        if (typeof id !== 'string') return res.status(400).json({error: 'Invalid id'});

        // 공지엔 발급 등 자식 행이 없어 하드 삭제(스토어 스코프).
        await prisma.storeNotice.deleteMany({where: {id, storeId: session.storeId}});
        return res.status(200).json({deleted: true});
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
