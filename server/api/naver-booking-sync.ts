import type {NextApiRequest, NextApiResponse} from 'next';

import {Prisma} from '@prisma/client';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {getValidAccessToken} from './gmail/token-manager';
import {listNaverBookingEmails, listNaverCancellationEmails, getEmailContent} from './gmail/gmail-client';
import {parseNaverBookingEmail, parseNaverCancellationEmail} from './gmail/naver-booking-parser';
import type {NaverBookingData} from './gmail/naver-booking-parser';
import {dbReservationToFrontend} from '../db/mappers';
import {calcEndTime, getLastNaverSyncTimestamp} from './gmail/helpers';

const DEFAULT_DURATION = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'manager', res)) return;

    const accessToken = await getValidAccessToken(session.userId);
    if (!accessToken) {
        return res.status(200).json({
            error: 'gmail_not_connected',
            synced: [],
            cancelled: [],
            skipped: [],
            errors: [],
        });
    }

    const afterTimestamp = await getLastNaverSyncTimestamp(session.storeId);
    const messageIds = await listNaverBookingEmails(accessToken, afterTimestamp);

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
    }

    const synced: SyncedEntry[] = [];
    const cancelled: CancelledEntry[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const messageId of messageIds) {
        try {
            const html = await getEmailContent(accessToken, messageId);
            if (!html) {
                errors.push(`Failed to fetch email ${messageId}`);
                continue;
            }

            const booking = parseNaverBookingEmail(html);
            if (!booking) {
                errors.push(`Failed to parse email ${messageId}`);
                continue;
            }

            const result = await createReservationFromBooking(session.storeId, booking);
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
            errors.push(`Error processing email ${messageId}: ${String(err)}`);
        }
    }

    // Process cancellation emails
    const cancelMessageIds = await listNaverCancellationEmails(accessToken, afterTimestamp);

    for (const messageId of cancelMessageIds) {
        try {
            const html = await getEmailContent(accessToken, messageId);
            if (!html) {
                errors.push(`Failed to fetch cancellation email ${messageId}`);
                continue;
            }

            const cancellation = parseNaverCancellationEmail(html);
            if (!cancellation) {
                errors.push(`Failed to parse cancellation email ${messageId}`);
                continue;
            }

            const result = await cancelReservationByBookingId(session.storeId, cancellation.bookingId);
            if (result.status === 'cancelled') {
                cancelled.push({
                    bookingId: cancellation.bookingId,
                    reservationId: result.legacyId,
                });
            } else {
                skipped.push(cancellation.bookingId);
            }
        } catch (err) {
            errors.push(`Error processing cancellation email ${messageId}: ${String(err)}`);
        }
    }

    return res.status(200).json({synced, cancelled, skipped, errors});
}

async function createReservationFromBooking(
    storeId: string,
    booking: NaverBookingData,
): Promise<{status: 'created'; legacyId: number} | {status: 'skipped'}> {
    // Check if reservation already exists before doing any work
    const existing = await prisma.reservation.findFirst({
        where: {storeId, naverBookingId: booking.bookingId},
        select: {id: true, naverBookingUrl: true},
    });
    if (existing) {
        if (booking.bookingUrl && !existing.naverBookingUrl && booking.bookingUrl.includes('partner.booking.naver.com')) {
            await prisma.reservation.update({
                where: {id: existing.id},
                data: {naverBookingUrl: booking.bookingUrl},
            });
        }
        return {status: 'skipped'};
    }

    // Match designer by name, create if not found
    let designer = await prisma.designer.findFirst({
        where: {storeId, name: {contains: booking.designerName}},
        select: {id: true},
    });

    if (!designer && booking.designerName) {
        const maxLegacy = await prisma.designer.findFirst({
            where: {storeId},
            orderBy: {legacyId: 'desc'},
            select: {legacyId: true},
        });
        designer = await prisma.designer.create({
            data: {
                storeId,
                name: booking.designerName,
                status: 'active',
                color: '#8E8E93',
                legacyId: (maxLegacy?.legacyId ?? 0) + 1,
            },
            select: {id: true},
        });
    }

    // Match services and calculate duration
    let totalDuration = 0;
    const serviceNames: string[] = [];

    for (const svc of booking.services) {
        const dbService = await prisma.service.findFirst({
            where: {storeId, name: {contains: svc.name}},
            select: {name: true, duration: true},
        });

        if (dbService) {
            serviceNames.push(dbService.name);
            totalDuration += dbService.duration;
        } else {
            serviceNames.push(svc.name);
            totalDuration += DEFAULT_DURATION;
        }
    }

    if (totalDuration === 0) {
        totalDuration = DEFAULT_DURATION;
    }

    const endTime = calcEndTime(booking.appointmentTime, totalDuration);
    const totalPrice = booking.services.reduce((sum, s) => sum + s.price, 0);
    const serviceSummary = serviceNames.join(', ') || booking.designerName;

    // Create customer with legacyId
    const maxCustomerLegacy = await prisma.customer.findFirst({
        where: {storeId},
        orderBy: {legacyId: 'desc'},
        select: {legacyId: true},
    });
    const customer = await prisma.customer.create({
        data: {
            storeId,
            name: booking.customerName,
            tel: '',
            legacyId: (maxCustomerLegacy?.legacyId ?? 0) + 1,
        },
    });

    // Create reservation with legacyId
    const maxResLegacy = await prisma.reservation.findFirst({
        where: {storeId},
        orderBy: {legacyId: 'desc'},
        select: {legacyId: true},
    });

    const resLegacyId = (maxResLegacy?.legacyId ?? 0) + 1;

    try {
        await prisma.reservation.create({
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
        });
        return {status: 'created', legacyId: resLegacyId};
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // Duplicate naverBookingId — clean up the customer we just created
            await prisma.customer.delete({where: {id: customer.id}}).catch(() => {});
            return {status: 'skipped'};
        }
        throw err;
    }
}

const reservationInclude = {
    paymentEntries: true,
    customer: {select: {legacyId: true}},
    designer: {select: {legacyId: true}},
} as const;

async function cancelReservationByBookingId(
    storeId: string,
    bookingId: string,
): Promise<{status: 'cancelled'; legacyId: number} | {status: 'skipped'}> {
    const reservation = await prisma.reservation.findFirst({
        where: {storeId, naverBookingId: bookingId},
        include: reservationInclude,
    });

    if (!reservation) return {status: 'skipped'};
    if (reservation.status === 'cancelled' || reservation.status === 'noshow') {
        return {status: 'skipped'};
    }

    const before = dbReservationToFrontend(reservation);

    const updatedReservation = await prisma.reservation.update({
        where: {id: reservation.id},
        data: {status: 'cancelled'},
        include: reservationInclude,
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

    return {status: 'cancelled', legacyId: reservation.legacyId!};
}
