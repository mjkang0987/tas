import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../db/prisma';
import {getApiSession, requireRole} from '../auth/api-session';
import {getValidAccessTokenWithReason} from './gmail/token-manager';
import {getEmailContent, GMAIL_API} from './gmail/gmail-client';
import {parseNaverBookingEmail} from './gmail/naver-booking-parser';
import {findByNameContains} from '../utils/string-matching';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getApiSession(req, res);
    if (!requireRole(session, 'manager', res)) return;

    const {reservationIds} = req.body as {reservationIds: Array<number | string>};
    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
        return res.status(400).json({error: 'reservationIds 배열이 필요합니다'});
    }

    const {token: accessToken, reason: tokenFailReason} = await getValidAccessTokenWithReason(session.userId);
    if (!accessToken) {
        return res.status(200).json({
            error: tokenFailReason === 'token_expired' ? 'gmail_token_expired' : 'gmail_not_connected',
            fixed: [],
            errors: [],
        });
    }

    const storeId = session.storeId;

    const allDesigners = await prisma.designer.findMany({
        where: {storeId},
        select: {id: true, name: true, legacyId: true},
    });
    const designerMap = new Map(allDesigners.map((d) => [d.name, d]));

    const fixed: Array<{reservationId: number | string; naverBookingId: string; designerName: string}> = [];
    const errors: Array<{reservationId: number | string; error: string}> = [];

    for (const reservationId of reservationIds) {
        const idStr = String(reservationId);
        try {
            // legacyId 또는 naverBookingId로 검색
            const reservation = typeof reservationId === 'number'
                ? await prisma.reservation.findUnique({
                    where: {storeId_legacyId: {storeId, legacyId: reservationId}},
                    select: {id: true, naverBookingId: true, designerId: true},
                })
                : null;

            const found = reservation ?? await prisma.reservation.findFirst({
                where: {storeId, naverBookingId: idStr},
                select: {id: true, naverBookingId: true, designerId: true},
            });

            if (!found) {
                errors.push({reservationId, error: '예약을 찾을 수 없습니다'});
                continue;
            }

            const naverBookingId = found.naverBookingId ?? idStr;

            if (found.designerId) {
                errors.push({reservationId, error: '이미 디자이너가 매칭되어 있습니다'});
                continue;
            }

            // 예약번호로 Gmail 검색 (시간 제한 없음)
            const query = `from:naverbooking_noreply@navercorp.com ${naverBookingId}`;
            const url = new URL(`${GMAIL_API}/messages`);
            url.searchParams.set('q', query);
            url.searchParams.set('maxResults', '5');

            const listRes = await fetch(url.toString(), {
                headers: {Authorization: `Bearer ${accessToken}`},
            });

            if (!listRes.ok) {
                errors.push({reservationId, error: `Gmail 검색 실패: ${listRes.status}`});
                continue;
            }

            const listJson = await listRes.json() as {messages?: Array<{id: string}>};
            if (!listJson.messages?.length) {
                errors.push({reservationId, error: `예약번호 ${naverBookingId}에 해당하는 메일을 찾을 수 없습니다`});
                continue;
            }

            let designerName: string | null = null;
            for (const msg of listJson.messages) {
                const html = await getEmailContent(accessToken, msg.id);
                if (!html) continue;

                const booking = parseNaverBookingEmail(html);
                if (booking && booking.bookingId === naverBookingId) {
                    designerName = booking.designerName;
                    break;
                }
            }

            if (!designerName) {
                errors.push({reservationId, error: '메일에서 디자이너명을 추출할 수 없습니다'});
                continue;
            }

            const designer = findByNameContains(designerMap, designerName);
            if (!designer) {
                errors.push({reservationId, error: `디자이너 "${designerName}"을 DB에서 찾을 수 없습니다`});
                continue;
            }

            await prisma.reservation.update({
                where: {id: found.id},
                data: {designerId: designer.id},
            });

            fixed.push({
                reservationId,
                naverBookingId,
                designerName: designer.name,
            });
        } catch (err) {
            errors.push({reservationId, error: String(err)});
        }
    }

    return res.status(200).json({fixed, errors});
}