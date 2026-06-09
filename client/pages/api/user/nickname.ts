import type {NextApiRequest, NextApiResponse} from 'next';

import {auth} from '../../../auth';
import {prisma} from '../../../lib/prisma';

const ADJECTIVES = [
    '빠른', '조용한', '반짝이는', '든든한', '기민한', '상냥한', '산뜻한', '영리한',
    '부드러운', '선명한', '고요한', '유연한', '차분한', '활기찬', '단단한', '기쁜',
];

const NOUNS = [
    '고래', '사자', '여우', '호랑이', '돌고래', '부엉이', '토끼', '하늘', '바다', '별',
    '달', '숲', '파도', '바람', '구름', '노을',
];

function randomItem(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function generateSuggestions(base: string, count = 4): Promise<string[]> {
    const results: string[] = [];

    // Try base + random 3-digit numbers first
    for (let i = 0; i < 20 && results.length < count; i++) {
        const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const candidate = `${base}${num}`;
        const exists = await prisma.user.findUnique({where: {nickname: candidate}, select: {id: true}});
        if (!exists && !results.includes(candidate)) results.push(candidate);
    }

    // Fill remaining with random adj+noun+num pool
    for (let i = 0; i < 30 && results.length < count; i++) {
        const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const candidate = `${randomItem(ADJECTIVES)}${randomItem(NOUNS)}${num}`;
        const exists = await prisma.user.findUnique({where: {nickname: candidate}, select: {id: true}});
        if (!exists && !results.includes(candidate)) results.push(candidate);
    }

    return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
        res.setHeader('Allow', ['PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await auth(req, res);
    if (!session?.user?.id) {
        return res.status(401).json({error: '로그인이 필요합니다.'});
    }

    const userId = session.user.id;
    const {nickname} = req.body as {nickname?: unknown};

    if (typeof nickname !== 'string' || nickname.trim().length < 2 || nickname.trim().length > 20) {
        return res.status(400).json({error: '닉네임은 2~20자 이내로 입력해 주세요.'});
    }

    const trimmed = nickname.trim();

    // Same as current — no-op
    const currentUser = await prisma.user.findUnique({
        where: {id: userId},
        select: {nickname: true},
    });

    if (currentUser?.nickname === trimmed) {
        return res.status(200).json({nickname: trimmed});
    }

    // Duplicate check
    const existing = await prisma.user.findUnique({
        where: {nickname: trimmed},
        select: {id: true},
    });

    if (existing) {
        const suggestions = await generateSuggestions(trimmed);
        return res.status(409).json({error: 'duplicate', suggestions});
    }

    await prisma.user.update({
        where: {id: userId},
        data: {nickname: trimmed, name: trimmed},
    });

    return res.status(200).json({nickname: trimmed});
}
