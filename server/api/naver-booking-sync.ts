import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '../../client/prisma/generated/prisma/client';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {getValidAccessTokenWithReason} from './gmail/token-manager';
import {listNaverBookingEmails, listNaverCancellationEmails, getEmailContent} from './gmail/gmail-client';
import {parseNaverBookingEmail, parseNaverCancellationEmail} from './gmail/naver-booking-parser';
import type {NaverBookingData} from './gmail/naver-booking-parser';
import {dbReservationToFrontend} from '../db/mappers';
import {reservationIncludeWithNames} from '../db/prisma-includes';
import {calcEndTime, getLastNaverSyncTimestamp} from './gmail/helpers';
import {findByNameContains} from '../utils/string-matching';

const DEFAULT_DURATION = 30;
const DESIGNER_COLORS = [
    '#2D7FF9', '#E85D75', '#00A896', '#FB8C00', '#6D6F78', '#7E57C2',
];
const EMAIL_FETCH_CONCURRENCY = 10;

interface SyncedEntry {
    bookingId: string;
    customerName: string;
    designerName: string;
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
    designerName: string;
}

interface SyncContext {
    storeId: string;
    existingBookingMap: Map<string, {id: string; naverBookingUrl: string | null; serviceSummary: string | null; designerId: string | null}>;
    designerMap: Map<string, {id: string; legacyId: number; color?: string | null}>;
    serviceMap: Map<string, {name: string; duration: number}>;
    nextCustomerLegacyId: number;
    nextReservationLegacyId: number;
    nextDesignerLegacyId: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'owner', res)) return;

    const {token: accessToken, reason: tokenFailReason} = await getValidAccessTokenWithReason(session.userId);
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
        allDesigners,
        allServices,
        maxCustomerLegacy,
        maxReservationLegacy,
        maxDesignerLegacy,
    ] = await Promise.all([
        Promise.all([
            listNaverBookingEmails(accessToken, afterTimestamp),
            listNaverCancellationEmails(accessToken, afterTimestamp),
        ]),
        prisma.reservation.findMany({
            where: {storeId, naverBookingId: {not: null}},
            select: {naverBookingId: true, id: true, naverBookingUrl: true, serviceSummary: true, designerId: true},
        }),
        prisma.designer.findMany({
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
        prisma.designer.findFirst({
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
                .map((r) => [r.naverBookingId!, {id: r.id, naverBookingUrl: r.naverBookingUrl, serviceSummary: r.serviceSummary, designerId: r.designerId}])
        ),
        designerMap: new Map(
            allDesigners.map((d) => [d.name, {id: d.id, legacyId: d.legacyId ?? 0, color: d.color}])
        ),
        serviceMap: new Map(allServices.map((s) => [s.name, s])),
        nextCustomerLegacyId: (maxCustomerLegacy?.legacyId ?? 0) + 1,
        nextReservationLegacyId: (maxReservationLegacy?.legacyId ?? 0) + 1,
        nextDesignerLegacyId: (maxDesignerLegacy?.legacyId ?? 0) + 1,
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
                    designerName: booking.designerName,
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
                    designerName: result.designerName,
                });
            } else {
                skipped.push(cancellation.bookingId);
            }
        } catch (err) {
            errors.push(`Error processing cancellation email ${cancelMessageIds[i]}: ${String(err)}`);
        }
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
    const {storeId, existingBookingMap, designerMap, serviceMap} = ctx;

    // 중복 확인 — DB 조회 없이 메모리에서 처리
    const existing = existingBookingMap.get(booking.bookingId);
    if (existing) {
        const updates: Record<string, string | null> = {};
        if (booking.bookingUrl && !existing.naverBookingUrl && booking.bookingUrl.includes('partner.booking.naver.com')) {
            updates.naverBookingUrl = booking.bookingUrl;
        }
        if ((!existing.serviceSummary || existing.serviceSummary === booking.designerName) && booking.services.length > 0) {
            const names = booking.services.map((s) => s.name);
            updates.serviceSummary = names.join('+');
        }
        // 디자이너 미매칭 상태면 이메일에서 파싱한 디자이너명으로 매칭
        if (!existing.designerId && booking.designerName) {
            const designer = findByNameContains(designerMap, booking.designerName);
            if (designer) {
                updates.designerId = designer.id;
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

    // 디자이너 매칭 — 메모리에서 처리, 없으면 생성 후 맵 업데이트
    let designer = findByNameContains(designerMap, booking.designerName);
    if (!designer && booking.designerName) {
        const legacyId = ctx.nextDesignerLegacyId++;
        const usedColors = new Set(Array.from(designerMap.values()).map((d) => d.color).filter(Boolean));
        const available = DESIGNER_COLORS.filter((c) => !usedColors.has(c));
        const color = available.length > 0
            ? available[designerMap.size % available.length]
            : DESIGNER_COLORS[designerMap.size % DESIGNER_COLORS.length];
        const created = await prisma.designer.create({
            data: {storeId, name: booking.designerName, status: 'active', color, legacyId},
            select: {id: true},
        });
        designer = {id: created.id, legacyId, color};
        designerMap.set(booking.designerName, designer);
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
    const serviceSummary = serviceNames.join('+') || booking.designerName;

    // legacyId 메모리 카운터 사용 — DB findFirst 불필요
    const customer = await prisma.customer.create({
        data: {
            storeId,
            name: booking.customerName,
            tel: '',
            legacyId: ctx.nextCustomerLegacyId++,
        },
    });

    const resLegacyId = ctx.nextReservationLegacyId++;

    try {
        const created = await prisma.reservation.create({
            data: {
                storeId,
                customerId: customer.id,
                designerId: designer?.id ?? null,
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

        // 이후 중복 체크를 위해 메모리 맵 업데이트
        existingBookingMap.set(booking.bookingId, {
            id: created.id,
            naverBookingUrl: booking.bookingUrl || null,
            serviceSummary,
            designerId: designer?.id ?? null,
        });

        return {status: 'created', legacyId: resLegacyId};
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            await prisma.customer.delete({where: {id: customer.id}}).catch(() => {});
            return {status: 'skipped'};
        }
        throw err;
    }
}

async function cancelReservationByBookingId(
    storeId: string,
    bookingId: string,
): Promise<{status: 'cancelled'; legacyId: number; appointmentDate: string; appointmentTime: string; customerName: string; designerName: string} | {status: 'skipped'}> {
    const reservation = await prisma.reservation.findFirst({
        where: {storeId, naverBookingId: bookingId},
        include: reservationIncludeWithNames,
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
        include: reservationIncludeWithNames,
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
        designerName: reservation.designer?.name || '미지정',
    };
}
