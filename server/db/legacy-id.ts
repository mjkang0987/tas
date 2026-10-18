import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from './prisma';

// 고객·예약 번호(legacyId)는 화면·네이버 동기화·온라인 예약이 각자 "최대+1"로 매겨 겹칠 수 있다.
// 저장하는 그 요청 안에서 서버가 최종 번호를 정한다 — 원하는 번호가 비어 있으면 그대로, 아니면 DB 최대+1.
// 동시에 같은 번호를 잡으면 unique(P2002)로 실패하므로 몇 번 다시 시도한다.
const MAX_ATTEMPTS = 4;

export async function nextCustomerLegacyId(storeId: string): Promise<number> {
    // nulls last — DESC 는 NULL 을 맨 앞에 둬서, 번호 없는 행이 하나라도 있으면 늘 1 을 골라 계속 겹쳤다.
    const row = await prisma.customer.findFirst({where: {storeId}, orderBy: {legacyId: {sort: 'desc', nulls: 'last'}}, select: {legacyId: true}});
    return (row?.legacyId ?? 0) + 1;
}

export async function nextReservationLegacyId(storeId: string): Promise<number> {
    const row = await prisma.reservation.findFirst({where: {storeId}, orderBy: {legacyId: {sort: 'desc', nulls: 'last'}}, select: {legacyId: true}});
    return (row?.legacyId ?? 0) + 1;
}

export function isUniqueConflict(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * create(legacyId)를 원하는 번호로 먼저 시도하고, 번호가 겹치면 next() 로 받은 번호로 다시 시도한다.
 * preferredFree=false 면 첫 시도부터 next() 를 쓴다(원하는 번호가 이미 다른 행이라는 걸 아는 경우).
 */
export async function createWithFreeLegacyId<T>(
    preferred: number,
    preferredFree: boolean,
    next: () => Promise<number>,
    create: (legacyId: number) => Promise<T>,
): Promise<T> {
    let legacyId = preferredFree ? preferred : await next();
    for (let attempt = 1; ; attempt++) {
        try {
            return await create(legacyId);
        } catch (err) {
            if (!isUniqueConflict(err) || attempt >= MAX_ATTEMPTS) throw err;
            legacyId = await next();
        }
    }
}
