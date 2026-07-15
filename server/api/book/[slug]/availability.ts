import type {NextApiRequest, NextApiResponse} from 'next';

import {prisma} from '../../../db/prisma';
import {DEFAULT_BOOKING_SETTINGS} from '../../../../client/features/store-settings/model';
import {computeAvailableSlots, minutesToTime, overlaps, timeToMinutes, type TimeInterval} from '../../../../client/features/booking/slots';

// KST(UTC+9) 벽시계. 서버 TZ(UTC 등)에 의존하지 않도록 오프셋을 직접 더한다.
function kstNow(): {dateStr: string; minutes: number} {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = kst.toISOString().slice(0, 10);
    const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
    return {dateStr, minutes};
}

// YYYY-MM-DD → 담당자/영업 스케줄 인덱스(월=0 … 일=6). getUTCDay로 TZ 무관.
function dayIndexOf(dateStr: string): number {
    const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    return (day + 6) % 7;
}

function isValidDateStr(v: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// 두 날짜 문자열의 일수 차이(b - a).
function daysBetween(a: string, b: string): number {
    const ma = new Date(`${a}T00:00:00Z`).getTime();
    const mb = new Date(`${b}T00:00:00Z`).getTime();
    return Math.round((mb - ma) / (24 * 60 * 60 * 1000));
}

// 공개(비로그인) 예약 슬롯 조회. 고객/예약 상세는 절대 반환하지 않고 가능한 시작시각만 준다.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug.toLowerCase() : '';
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    const duration = Number(req.query.duration);
    const assigneeId = typeof req.query.assigneeId === 'string' && req.query.assigneeId ? req.query.assigneeId : null;

    if (!slug) return res.status(404).json({error: 'not_found'});
    if (!isValidDateStr(date)) return res.status(400).json({error: 'invalid_date'});
    if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 60) {
        return res.status(400).json({error: 'invalid_duration'});
    }

    const store = await prisma.store.findFirst({
        where: {bookingSlug: slug, useOnlineBooking: true},
        select: {id: true},
    });
    if (!store) return res.status(404).json({error: 'not_found'});

    const bookingSettings = await prisma.storeBookingSettings.findUnique({where: {storeId: store.id}});
    const settings = bookingSettings ?? DEFAULT_BOOKING_SETTINGS;

    // 예약 가능 범위: 오늘 ~ 오늘+maxAdvanceDays. 벗어나면 빈 슬롯.
    const now = kstNow();
    const offset = daysBetween(now.dateStr, date);
    if (offset < 0 || offset > settings.maxAdvanceDays) {
        return res.status(200).json({date, slots: []});
    }

    const dayIndex = dayIndexOf(date);

    const [businessHour, closed, assignees, reservations] = await Promise.all([
        prisma.storeBusinessHour.findUnique({where: {storeId_dayIndex: {storeId: store.id, dayIndex}}}),
        prisma.storeClosedDate.findFirst({where: {storeId: store.id, date: new Date(`${date}T00:00:00`)}}),
        prisma.assignee.findMany({
            where: {storeId: store.id, status: 'active'},
            select: {id: true, schedules: {where: {dayIndex}, select: {enabled: true, startTime: true, endTime: true}}},
        }),
        prisma.reservation.findMany({
            where: {storeId: store.id, status: 'active', date: new Date(`${date}T00:00:00`)},
            select: {assigneeId: true, startTime: true, endTime: true},
        }),
    ]);

    // 휴무일이거나 영업 안 하는 요일이면 슬롯 없음.
    if (closed || !businessHour || !businessHour.enabled) {
        return res.status(200).json({date, slots: []});
    }

    const storeOpen = timeToMinutes(businessHour.openTime);
    const storeClose = timeToMinutes(businessHour.closeTime);
    if (!Number.isFinite(storeOpen) || !Number.isFinite(storeClose) || storeClose <= storeOpen) {
        return res.status(200).json({date, slots: []});
    }

    // 오늘이면 (지금 + 최소 사전시간) 이후만.
    const minStartMinutes = offset === 0 ? now.minutes + settings.minLeadMinutes : undefined;

    const toInterval = (r: {startTime: string; endTime: string}): TimeInterval => ({
        start: timeToMinutes(r.startTime),
        end: timeToMinutes(r.endTime),
    });

    // 담당자의 해당 요일 근무 창(매장 영업시간과 교집합). 스케줄 없으면 매장 영업시간 전체.
    const assigneeWindow = (a: {schedules: {enabled: boolean; startTime: string; endTime: string}[]}): {open: number; close: number} | null => {
        const sch = a.schedules[0];
        if (!sch) return {open: storeOpen, close: storeClose};
        if (!sch.enabled) return null;
        const open = Math.max(storeOpen, timeToMinutes(sch.startTime));
        const close = Math.min(storeClose, timeToMinutes(sch.endTime));
        if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) return null;
        return {open, close};
    };

    let slots: string[];

    if (assigneeId) {
        // 특정 담당자 지정: 그 담당자의 근무 창 안 + 그 담당자의 기존 예약만 점유.
        const target = assignees.find((a) => a.id === assigneeId);
        const window = target ? assigneeWindow(target) : null;
        if (!target || !window) {
            slots = [];
        } else {
            const occupied = reservations
                .filter((r) => r.assigneeId === assigneeId)
                .map(toInterval);
            slots = computeAvailableSlots({
                openTime: businessHour.openTime,
                closeTime: businessHour.closeTime,
                slotIntervalMin: settings.slotIntervalMin,
                serviceDurationMin: duration,
                occupied: [
                    ...occupied,
                    // 근무 창 밖(매장 영업시간과의 차이)을 점유로 막는다.
                    ...(window.open > storeOpen ? [{start: storeOpen, end: window.open}] : []),
                    ...(window.close < storeClose ? [{start: window.close, end: storeClose}] : []),
                ],
                minStartMinutes,
            });
        }
    } else {
        // 담당자 무관: 슬롯별 여유 인원(근무 창이 슬롯을 덮는 담당자 수) − 겹치는 예약 수 > 0 이면 가능.
        // 담당자가 아예 없으면 매장 자체를 1인 용량으로 본다.
        const capacityOf = (interval: TimeInterval): number => {
            if (assignees.length === 0) return 1;
            return assignees.reduce((n, a) => {
                const w = assigneeWindow(a);
                if (!w) return n;
                return interval.start >= w.open && interval.end <= w.close ? n + 1 : n;
            }, 0);
        };
        const occupiedAll = reservations.map(toInterval);
        const minStart = minStartMinutes ?? -Infinity;
        const acc: string[] = [];
        for (let start = storeOpen; start + duration <= storeClose; start += settings.slotIntervalMin) {
            if (start < minStart) continue;
            const interval: TimeInterval = {start, end: start + duration};
            const cap = capacityOf(interval);
            if (cap <= 0) continue;
            const used = occupiedAll.filter((o) => overlaps(interval, o)).length;
            if (cap - used > 0) acc.push(minutesToTime(start));
        }
        slots = acc;
    }

    return res.status(200).json({date, slots});
}
