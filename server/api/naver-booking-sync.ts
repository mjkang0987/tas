import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {getValidAccessTokenWithReason} from './gmail/token-manager';
import {listNaverBookingEmails, listNaverCancellationEmails, getEmailContent} from './gmail/gmail-client';
import {parseNaverBookingEmail, parseNaverCancellationEmail} from './gmail/naver-booking-parser';
import type {NaverBookingData} from './gmail/naver-booking-parser';
import {dbReservationToFrontend} from '../db/mappers';
import {reservationSelectWithNames} from '../db/prisma-includes';
import {calcEndTime, getLastNaverSyncTimestamp} from './gmail/helpers';
import {findByNameContains} from '../utils/string-matching';
import {notifySlackOps} from '../notify/slack';

const DEFAULT_DURATION = 30;
const ASSIGNEE_COLORS = [
    '#2D7FF9', '#E85D75', '#00A896', '#FB8C00', '#6D6F78', '#7E57C2',
];
const EMAIL_FETCH_CONCURRENCY = 10;

interface SyncedEntry {
    bookingId: string;
    customerName: string;
    assigneeName: string;
    appointmentDate: string;
    appointmentTime: string;
    reservationId: number;
}

interface CancelledEntry {
    bookingId: string;
    reservationId: number;
    appointmentDate: string;
    appointmentTime: string;
    customerName: string;
    assigneeName: string;
}

interface SyncContext {
    storeId: string;
    existingBookingMap: Map<string, {id: string; naverBookingUrl: string | null; serviceSummary: string | null; assigneeId: string | null}>;
    assigneeMap: Map<string, {id: string; legacyId: number; color?: string | null}>;
    serviceMap: Map<string, {name: string; duration: number}>;
    nextCustomerLegacyId: number;
    nextReservationLegacyId: number;
    nextAssigneeLegacyId: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'owner', res)) return;

    const {token: accessToken, reason: tokenFailReason} = await getValidAccessTokenWithReason(session.storeId);
    if (!accessToken) {
        return res.status(200).json({
            error: tokenFailReason === 'token_expired' ? 'gmail_token_expired' : 'gmail_not_connected',
            synced: [],
            cancelled: [],
            skipped: [],
            errors: [],
        });
    }

    const afterTimestamp = await getLastNaverSyncTimestamp(session.storeId);
    const storeId = session.storeId;

    // 이메일 목록 조회 + 참조 데이터 DB 로드를 병렬 실행
    const [
        [messageIds, cancelMessageIds],
        existingBookings,
        allAssignees,
        allServices,
        maxCustomerLegacy,
        maxReservationLegacy,
        maxAssigneeLegacy,
    ] = await Promise.all([
        Promise.all([
            listNaverBookingEmails(accessToken, afterTimestamp),
            listNaverCancellationEmails(accessToken, afterTimestamp),
        ]),
        prisma.reservation.findMany({
            where: {storeId, naverBookingId: {not: null}},
            select: {naverBookingId: true, id: true, naverBookingUrl: true, serviceSummary: true, assigneeId: true},
        }),
        prisma.assignee.findMany({
            where: {storeId},
            select: {id: true, name: true, legacyId: true, color: true},
        }),
        prisma.service.findMany({
            where: {storeId},
            select: {name: true, duration: true},
        }),
        prisma.customer.findFirst({
            where: {storeId},
            orderBy: {legacyId: 'desc'},
            select: {legacyId: true},
        }),
        prisma.reservation.findFirst({
            where: {storeId},
            orderBy: {legacyId: 'desc'},
            select: {legacyId: true},
        }),
        prisma.assignee.findFirst({
            where: {storeId},
            orderBy: {legacyId: 'desc'},
            select: {legacyId: true},
        }),
    ]);

    // 취소 이메일이 예약 확정 쿼리에도 매칭되는 경우 제거
    const cancelIdSet = new Set(cancelMessageIds);
    const bookingMessageIds = messageIds.filter((id) => !cancelIdSet.has(id));

    const ctx: SyncContext = {
        storeId,
        existingBookingMap: new Map(
            existingBookings
                .filter((r) => r.naverBookingId)
                .map((r) => [r.naverBookingId!, {id: r.id, naverBookingUrl: r.naverBookingUrl, serviceSummary: r.serviceSummary, assigneeId: r.assigneeId}])
        ),
        assigneeMap: new Map(
            allAssignees.map((d) => [d.name, {id: d.id, legacyId: d.legacyId ?? 0, color: d.color}])
        ),
        serviceMap: new Map(allServices.map((s) => [s.name, s])),
        nextCustomerLegacyId: (maxCustomerLegacy?.legacyId ?? 0) + 1,
        nextReservationLegacyId: (maxReservationLegacy?.legacyId ?? 0) + 1,
        nextAssigneeLegacyId: (maxAssigneeLegacy?.legacyId ?? 0) + 1,
    };

    const synced: SyncedEntry[] = [];
    const cancelled: CancelledEntry[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    // 이메일 본문을 배치로 병렬 fetch
    const [bookingContents, cancellationContents] = await Promise.all([
        fetchEmailContentsInBatches(accessToken, bookingMessageIds),
        fetchEmailContentsInBatches(accessToken, cancelMessageIds),
    ]);

    // 예약 이메일 처리 (DB 쓰기는 순차 유지)
    for (let i = 0; i < bookingMessageIds.length; i++) {
        const html = bookingContents[i];
        if (!html) {
            errors.push(`Failed to fetch email ${bookingMessageIds[i]}`);
            continue;
        }

        const booking = parseNaverBookingEmail(html);
        if (!booking) {
            errors.push(`Failed to parse email ${bookingMessageIds[i]}`);
            continue;
        }

        try {
            const result = await createReservationFromBooking(ctx, booking);
            if (result.status === 'created') {
                synced.push({
                    bookingId: booking.bookingId,
                    customerName: booking.customerName,
                    assigneeName: booking.assigneeName,
                    appointmentDate: booking.appointmentDate,
                    appointmentTime: booking.appointmentTime,
                    reservationId: result.legacyId,
                });
            } else {
                skipped.push(booking.bookingId);
            }
        } catch (err) {
            errors.push(`Error processing email ${bookingMessageIds[i]}: ${String(err)}`);
        }
    }

    // 취소 이메일 처리
    for (let i = 0; i < cancelMessageIds.length; i++) {
        const html = cancellationContents[i];
        if (!html) {
            errors.push(`Failed to fetch cancellation email ${cancelMessageIds[i]}`);
            continue;
        }

        const cancellation = parseNaverCancellationEmail(html);
        if (!cancellation) {
            errors.push(`Failed to parse cancellation email ${cancelMessageIds[i]}`);
            continue;
        }

        try {
            const result = await cancelReservationByBookingId(storeId, cancellation.bookingId);
            if (result.status === 'cancelled') {
                cancelled.push({
                    bookingId: cancellation.bookingId,
                    reservationId: result.legacyId,
                    appointmentDate: result.appointmentDate,
                    appointmentTime: result.appointmentTime,
                    customerName: result.customerName,
                    assigneeName: result.assigneeName,
                });
            } else {
                skipped.push(cancellation.bookingId);
            }
        } catch (err) {
            errors.push(`Error processing cancellation email ${cancelMessageIds[i]}: ${String(err)}`);
        }
    }

    // 동기화 실패(파싱/생성/취소 오류)는 운영 채널로 1건 요약 전송.
    // 폴링이 반복되므로 건별이 아닌 폴링 1회당 요약으로 노이즈를 줄인다.
    if (errors.length > 0) {
        const head = errors.slice(0, 5).map((e) => `• ${e}`).join('\n');
        const more = errors.length > 5 ? `\n…외 ${errors.length - 5}건` : '';
        await notifySlackOps(`🛑 *네이버 동기화 실패* (${errors.length}건)\n${head}${more}`);
    }

    return res.status(200).json({synced, cancelled, skipped, errors});
}

async function fetchEmailContentsInBatches(
    accessToken: string,
    messageIds: string[],
): Promise<Array<string | null>> {
    const results: Array<string | null> = [];

    for (let i = 0; i < messageIds.length; i += EMAIL_FETCH_CONCURRENCY) {
        const batch = messageIds.slice(i, i + EMAIL_FETCH_CONCURRENCY);
        const batchResults = await Promise.allSettled(
            batch.map((id) => getEmailContent(accessToken, id))
        );
        for (const result of batchResults) {
            results.push(result.status === 'fulfilled' ? result.value : null);
        }
    }

    return results;
}


async function createReservationFromBooking(
    ctx: SyncContext,
    booking: NaverBookingData,
): Promise<{status: 'created'; legacyId: number} | {status: 'skipped'}> {
    const {storeId, existingBookingMap, assigneeMap, serviceMap} = ctx;

    // 중복 확인 — DB 조회 없이 메모리에서 처리
    const existing = existingBookingMap.get(booking.bookingId);
    if (existing) {
        const updates: Record<string, string | null> = {};
        if (booking.bookingUrl && !existing.naverBookingUrl && booking.bookingUrl.includes('partner.booking.naver.com')) {
            updates.naverBookingUrl = booking.bookingUrl;
        }
        if ((!existing.serviceSummary || existing.serviceSummary === booking.assigneeName) && booking.services.length > 0) {
            const names = booking.services.map((s) => s.name);
            updates.serviceSummary = names.join('+');
        }
        // 담당자 미매칭 상태면 이메일에서 파싱한 담당자명으로 매칭
        if (!existing.assigneeId && booking.assigneeName) {
            const assignee = findByNameContains(assigneeMap, booking.assigneeName);
            if (assignee) {
                updates.assigneeId = assignee.id;
            }
        }
        if (Object.keys(updates).length > 0) {
            await prisma.reservation.update({
                where: {id: existing.id},
                data: updates,
            });
        }
        return {status: 'skipped'};
    }

    // 담당자 매칭 — 메모리에서 처리, 없으면 생성 후 맵 업데이트
    let assignee = findByNameContains(assigneeMap, booking.assigneeName);
    if (!assignee && booking.assigneeName) {
        const legacyId = ctx.nextAssigneeLegacyId++;
        const usedColors = new Set(Array.from(assigneeMap.values()).map((d) => d.color).filter(Boolean));
        const available = ASSIGNEE_COLORS.filter((c) => !usedColors.has(c));
        const color = available.length > 0
            ? available[assigneeMap.size % available.length]
            : ASSIGNEE_COLORS[assigneeMap.size % ASSIGNEE_COLORS.length];
        const created = await prisma.assignee.create({
            data: {storeId, name: booking.assigneeName, status: 'active', color, legacyId},
            select: {id: true},
        });
        assignee = {id: created.id, legacyId, color};
        assigneeMap.set(booking.assigneeName, assignee);
    }

    // 서비스 매칭 — 메모리에서 처리
    let totalDuration = 0;
    const serviceNames: string[] = [];

    for (const svc of booking.services) {
        const dbService = findByNameContains(serviceMap, svc.name);
        if (dbService) {
            serviceNames.push(dbService.name);
            totalDuration += dbService.duration;
        } else {
            // 등록되지 않은 서비스 → "네이버예약" 카테고리로 자동 추가
            await prisma.service.create({
                data: {storeId, name: svc.name, duration: DEFAULT_DURATION, category: '네이버예약', price: svc.price},
            });
            serviceMap.set(svc.name, {name: svc.name, duration: DEFAULT_DURATION});
            serviceNames.push(svc.name);
            totalDuration += DEFAULT_DURATION;
        }
    }

    if (totalDuration === 0) totalDuration = DEFAULT_DURATION;

    const endTime = calcEndTime(booking.appointmentTime, totalDuration);
    const totalPrice = booking.services.reduce((sum, s) => sum + s.price, 0);
    const serviceSummary = serviceNames.join('+') || booking.assigneeName;

    // legacyId 메모리 카운터 사용 — DB findFirst 불필요
    const customerLegacyId = ctx.nextCustomerLegacyId++;
    const resLegacyId = ctx.nextReservationLegacyId++;

    try {
        // 고객+예약을 한 트랜잭션으로 묶는다. 예약 생성이 실패하면 고객 생성도 함께 롤백돼
        // '예약 없는 빈 고객'(orphan) 잔존을 원천 차단한다. (기존엔 고객을 먼저 커밋한 뒤
        // 예약 실패 시 best-effort 삭제라, P2002 외 오류에선 orphan이 남았다.)
        const created = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.create({
                data: {
                    storeId,
                    name: booking.customerName,
                    tel: '',
                    legacyId: customerLegacyId,
                },
                select: {id: true},
            });

            return tx.reservation.create({
                data: {
                    storeId,
                    customerId: customer.id,
                    assigneeId: assignee?.id ?? null,
                    legacyId: resLegacyId,
                    date: new Date(`${booking.appointmentDate}T00:00:00`),
                    startTime: booking.appointmentTime,
                    endTime,
                    serviceSummary,
                    status: 'active',
                    price: totalPrice,
                    memo: booking.memo || null,
                    paymentCompleted: false,
                    naverBookingId: booking.bookingId,
                    naverBookingUrl: booking.bookingUrl || null,
                    naverDeposit: booking.deposit || null,
                    channel: 'naver',
                },
                select: {id: true},
            });
        });

        // 이후 중복 체크를 위해 메모리 맵 업데이트
        existingBookingMap.set(booking.bookingId, {
            id: created.id,
            naverBookingUrl: booking.bookingUrl || null,
            serviceSummary,
            assigneeId: assignee?.id ?? null,
        });

        return {status: 'created', legacyId: resLegacyId};
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // 트랜잭션이 고객 생성까지 롤백하므로 수동 삭제 불필요(orphan 방지).
            return {status: 'skipped'};
        }
        throw err;
    }
}

async function cancelReservationByBookingId(
    storeId: string,
    bookingId: string,
): Promise<{status: 'cancelled'; legacyId: number; appointmentDate: string; appointmentTime: string; customerName: string; assigneeName: string} | {status: 'skipped'}> {
    const reservation = await prisma.reservation.findFirst({
        where: {storeId, naverBookingId: bookingId},
        select: reservationSelectWithNames,
    });

    if (!reservation) return {status: 'skipped'};
    if (reservation.status === 'cancelled' || reservation.status === 'noshow') {
        return {status: 'skipped'};
    }

    // 이미 한 번 취소 처리된 후 수동 복귀된 예약은 재취소하지 않음
    const cancelHistory = await prisma.reservationHistory.findFirst({
        where: {
            reservationId: reservation.id,
            afterJson: {path: ['status'], equals: 'cancelled'},
        },
    });
    if (cancelHistory) return {status: 'skipped'};

    const before = dbReservationToFrontend(reservation);

    const updatedReservation = await prisma.reservation.update({
        where: {id: reservation.id},
        data: {status: 'cancelled'},
        select: reservationSelectWithNames,
    });

    const after = dbReservationToFrontend(updatedReservation);

    await prisma.reservationHistory.create({
        data: {
            storeId,
            reservationId: reservation.id,
            beforeJson: before as object,
            afterJson: after as object,
        },
    });

    return {
        status: 'cancelled',
        legacyId: reservation.legacyId!,
        appointmentDate: before.date,
        appointmentTime: before.startTime,
        customerName: reservation.customer?.name || '고객',
        assigneeName: reservation.assignee?.name || '미지정',
    };
}
