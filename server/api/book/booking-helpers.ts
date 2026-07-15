// 공개 온라인 예약 API 공용 헬퍼(availability·reserve 공유).
import {prisma} from '../../db/prisma';
import {DEFAULT_BOOKING_SETTINGS} from '../../../client/features/store-settings/model';
import type {BookingSettings} from '../../../client/features/store-settings/model';

const KST_OFFSET_MIN = 9 * 60; // Asia/Seoul (UTC+9), 이 앱은 한국 전용
const MINUTES_PER_DAY = 24 * 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isValidDateStr(v: unknown): v is string {
    return typeof v === 'string' && DATE_RE.test(v);
}

export function isValidTimeStr(v: unknown): v is string {
    return typeof v === 'string' && TIME_RE.test(v);
}

// 자정 UTC 기준 일련번호(달력일 비교용). dayIndex 산출·날짜 범위 비교에 쓴다.
function dayNumber(dateStr: string): number {
    return Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / (MINUTES_PER_DAY * 60000));
}

// 해당 달력일의 요일(0=일 … 6=토). 시간대 영향 없이 UTC 정오로 계산.
export function dayIndexOf(dateStr: string): number {
    return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

// KST 기준 "오늘"(YYYY-MM-DD)과 자정 이후 경과 분.
export function nowKst(): {todayStr: string; minutesOfDay: number} {
    const shifted = new Date(Date.now() + KST_OFFSET_MIN * 60000);
    return {
        todayStr: shifted.toISOString().slice(0, 10),
        minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    };
}

export interface DateWindow {
    ok: boolean;
    reason?: 'past' | 'too_far' | 'closed';
    minStartMinute: number; // 슬롯 계산에 넘길 최소 시작 분(자정 기준)
}

// 예약 날짜가 [오늘 … 오늘+maxAdvanceDays] 범위·비휴무인지 판정하고,
// 최소 사전시간(now+minLead)을 반영한 minStartMinute를 돌려준다.
export function evaluateDateWindow(
    dateStr: string,
    settings: Pick<BookingSettings, 'minLeadMinutes' | 'maxAdvanceDays'>,
    closedDates: string[],
): DateWindow {
    const {todayStr, minutesOfDay} = nowKst();
    const todayNum = dayNumber(todayStr);
    const targetNum = dayNumber(dateStr);

    if (targetNum < todayNum) return {ok: false, reason: 'past', minStartMinute: 0};
    if (targetNum > todayNum + settings.maxAdvanceDays) return {ok: false, reason: 'too_far', minStartMinute: 0};
    if (closedDates.includes(dateStr)) return {ok: false, reason: 'closed', minStartMinute: 0};

    const nowAbsolute = todayNum * MINUTES_PER_DAY + minutesOfDay;
    const earliestAbsolute = nowAbsolute + settings.minLeadMinutes;
    const targetStartAbsolute = targetNum * MINUTES_PER_DAY;
    const minStartMinute = Math.max(0, earliestAbsolute - targetStartAbsolute);

    return {ok: true, minStartMinute};
}

export interface PublicStore {
    id: string;
    name: string;
    shopType: string | null;
}

// 온라인 예약이 켜진 매장만 조회. 없으면 null.
export async function findBookableStore(slug: string): Promise<PublicStore | null> {
    if (!slug) return null;
    return prisma.store.findFirst({
        where: {bookingSlug: slug.toLowerCase(), useOnlineBooking: true},
        select: {id: true, name: true, shopType: true},
    });
}

// 매장 예약 규칙(없으면 기본값).
export async function loadBookingSettings(storeId: string): Promise<BookingSettings> {
    const row = await prisma.storeBookingSettings.findUnique({where: {storeId}});
    if (!row) return DEFAULT_BOOKING_SETTINGS;
    return {
        slotIntervalMin: row.slotIntervalMin,
        minLeadMinutes: row.minLeadMinutes,
        maxAdvanceDays: row.maxAdvanceDays,
        allowAssigneeChoice: row.allowAssigneeChoice,
        noticeText: row.noticeText,
    };
}
