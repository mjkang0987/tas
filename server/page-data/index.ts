import type {GetServerSidePropsContext} from 'next';
import {decode} from 'next-auth/jwt';

import {prisma} from '../db/prisma';
import {dbCustomerToFrontend, dbReservationToFrontend, dbHistoryToFrontend} from '../db/mappers';

export async function getPageSession(ctx: GetServerSidePropsContext) {
    const secureName = '__Secure-authjs.session-token';
    const plainName = 'authjs.session-token';
    const token = ctx.req.cookies[secureName] ?? ctx.req.cookies[plainName];
    if (!token) return null;

    const cookieName = ctx.req.cookies[secureName] ? secureName : plainName;

    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const decoded = await decode({token, salt: cookieName, secret});
    if (!decoded?.storeId || !decoded?.role) return null;

    return {
        userId: (decoded.userId as string) ?? '',
        storeId: decoded.storeId as string,
        role: decoded.role as string,
        onboarded: (decoded.onboarded as boolean) ?? false,
    };
}

export async function loadPageData(storeId: string) {
    const [dbReservations, dbCustomers, dbHistories] = await Promise.all([
        prisma.reservation.findMany({
            where: {storeId},
            include: {
                paymentEntries: true,
                customer: {select: {legacyId: true}},
                designer: {select: {legacyId: true}},
            },
        }),
        prisma.customer.findMany({
            where: {storeId},
            include: {
                memoTags: true,
                pointHistories: {
                    orderBy: {createdAt: 'asc'},
                    include: {relatedReservation: {select: {legacyId: true}}},
                },
            },
        }),
        prisma.reservationHistory.findMany({
            where: {storeId},
            include: {
                reservation: {select: {legacyId: true}},
            },
            orderBy: {createdAt: 'asc'},
        }),
    ]);

    const reservations = dbReservations.map(dbReservationToFrontend);
    const customers = dbCustomers.map(dbCustomerToFrontend);
    const history = dbHistories.map(dbHistoryToFrontend);

    return {reservations, customers, history};
}
