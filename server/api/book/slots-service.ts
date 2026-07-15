// 온라인 예약 슬롯 계산 서비스 — availability 조회와 reserve 재검증이 같은 로직을 쓰도록 공유.
import {prisma} from '../../db/prisma';
import {DEFAULT_BOOKING_SETTINGS, type BookingSettings} from '../../../client/features/store-settings/model';
import {computeAvailableSlots, minutesToTime, overlaps, timeToMinutes, type TimeInterval} from '../../../client/features/booking/slots';

// KST(UTC+9) 벽시계. 서버 TZ(UTC 등)에 의존하지 않도록 오프셋을 직접 더한다.
export function kstNow(): {dateStr: string; minutes: number} {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return {dateStr: kst.toISOString().slice(0, 10), minutes: kst.getUTCHours() * 60 + kst.getUTCMinutes()};
}

// YYYY-MM-DD → 담당자/영업 스케줄 인덱스(월=0 … 일=6). getUTCDay로 TZ 무관.
export function dayIndexOf(dateStr: string): number {
    return (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function isValidDateStr(v: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// 두 날짜 문자열의 일수 차이(b - a).
export function daysBetween(a: string, b: string): number {
    const ma = new Date(`${a}T00:00:00Z`).getTime();
    const mb = new Date(`${b}T00:00:00Z`).getTime();
    return Math.round((mb - ma) / (24 * 60 * 60 * 1000));
}

export interface AvailabilityInput {
    storeId: string;
    date: string;         // YYYY-MM-DD (검증된 값)
    duration: number;     // 총 소요(분, > 0)
    assigneeId: string | null;
}

export interface AvailabilityContext {
    settings: BookingSettings;
    // 요청 날짜가 예약 가능 범위(오늘~maxAdvanceDays)를 벗어나면 outOfRange=true.
    outOfRange: boolean;
}

// 예약 가능 시작시각 목록. DB(매장 규칙·영업시간·휴무·기존예약·담당자스케줄)를 읽어 계산한다.
export async function getAvailableSlots(input: AvailabilityInput): Promise<{slots: string[]; ctx: AvailabilityContext}> {
    const {storeId, date, duration, assigneeId} = input;

    const bookingSettings = await prisma.storeBookingSettings.findUnique({where: {storeId}});
    const settings: BookingSettings = bookingSettings
        ? {
            slotIntervalMin: bookingSettings.slotIntervalMin,
            minLeadMinutes: bookingSettings.minLeadMinutes,
            maxAdvanceDays: bookingSettings.maxAdvanceDays,
            allowAssigneeChoice: bookingSettings.allowAssigneeChoice,
            noticeText: bookingSettings.noticeText,
        }
        : DEFAULT_BOOKING_SETTINGS;

    const now = kstNow();
    const offset = daysBetween(now.dateStr, date);
    if (offset < 0 || offset > settings.maxAdvanceDays) {
        return {slots: [], ctx: {settings, outOfRange: true}};
    }

    const dayIndex = dayIndexOf(date);
    const [businessHour, closed, assignees, reservations] = await Promise.all([
        prisma.storeBusinessHour.findUnique({where: {storeId_dayIndex: {storeId, dayIndex}}}),
        prisma.storeClosedDate.findFirst({where: {storeId, date: new Date(`${date}T00:00:00`)}}),
        prisma.assignee.findMany({
            where: {storeId, status: 'active'},
            select: {id: true, schedules: {where: {dayIndex}, select: {enabled: true, startTime: true, endTime: true}}},
        }),
        prisma.reservation.findMany({
            where: {storeId, status: 'active', date: new Date(`${date}T00:00:00`)},
            select: {assigneeId: true, startTime: true, endTime: true},
        }),
    ]);

    const ctx: AvailabilityContext = {settings, outOfRange: false};

    if (closed || !businessHour || !businessHour.enabled) return {slots: [], ctx};

    const storeOpen = timeToMinutes(businessHour.openTime);
    const storeClose = timeToMinutes(businessHour.closeTime);
    if (!Number.isFinite(storeOpen) || !Number.isFinite(storeClose) || storeClose <= storeOpen) return {slots: [], ctx};

    const minStartMinutes = offset === 0 ? now.minutes + settings.minLeadMinutes : undefined;
    const toInterval = (r: {startTime: string; endTime: string}): TimeInterval => ({start: timeToMinutes(r.startTime), end: timeToMinutes(r.endTime)});

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

    if (assigneeId) {
        const target = assignees.find((a) => a.id === assigneeId);
        const window = target ? assigneeWindow(target) : null;
        if (!target || !window) return {slots: [], ctx};
        const occupied = reservations.filter((r) => r.assigneeId === assigneeId).map(toInterval);
        const slots = computeAvailableSlots({
            openTime: businessHour.openTime,
            closeTime: businessHour.closeTime,
            slotIntervalMin: settings.slotIntervalMin,
            serviceDurationMin: duration,
            occupied: [
                ...occupied,
                ...(window.open > storeOpen ? [{start: storeOpen, end: window.open}] : []),
                ...(window.close < storeClose ? [{start: window.close, end: storeClose}] : []),
            ],
            minStartMinutes,
        });
        return {slots, ctx};
    }

    // 담당자 무관: 슬롯별 여유 인원(근무 창이 슬롯을 덮는 담당자 수) − 겹치는 예약 수 > 0.
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
    const slots: string[] = [];
    for (let start = storeOpen; start + duration <= storeClose; start += settings.slotIntervalMin) {
        if (start < minStart) continue;
        const interval: TimeInterval = {start, end: start + duration};
        if (capacityOf(interval) - occupiedAll.filter((o) => overlaps(interval, o)).length > 0) {
            slots.push(minutesToTime(start));
        }
    }
    return {slots, ctx};
}
