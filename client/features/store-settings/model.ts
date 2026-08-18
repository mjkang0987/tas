export interface StoreBusinessHours {
    start: string;
    end: string;
}

export interface PointRechargeRule {
    baseAmount: number;
    bonusAmount: number;
}

export interface PointSettings {
    enableServiceRate: boolean;
    enableRecharge: boolean;
    serviceRate: number;
    rechargeRules: PointRechargeRule[];
}

export interface StoreSettings {
    businessHours: StoreBusinessHours;
    closedDates: string[];
    // 정기 휴무 요일(매주). 0=월 … 6=일 (앱 공통 dayIndex 규칙). DB는 StoreBusinessHour.enabled=false로 저장.
    closedWeekdays: number[];
    pointSettings: PointSettings;
}

// 공개(고객) 온라인 예약 규칙. 매장 설정 응답의 top-level로 별도 전달(StoreSettings와 분리).
export interface BookingSettings {
    slotIntervalMin: number;
    minLeadMinutes: number;
    maxAdvanceDays: number;
    allowAssigneeChoice: boolean;
    // 고객 문의·개인정보 열람/삭제 요구 접수용 매장 연락처(숫자만 저장). 온라인예약 사용 시 필수.
    contactTel: string | null;
    noticeText: string | null;
    // 안내문 다국어(오너 입력, {en?,ja?,zh?}). 없으면 noticeText 폴백. 공개 페이지 표시용.
    noticeI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null;
    // 예약 상태별 안내문구(#139) — 완료(신청 접수)·확정·취소. 각 텍스트 + 다국어. 비면 미표시.
    doneText?: string | null;
    doneI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null;
    confirmText?: string | null;
    confirmI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null;
    cancelText?: string | null;
    cancelI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null;
    // 공개 노출할 서비스명 화이트리스트. null 또는 []=전체 노출, 비어있지 않으면 그 서비스만 노출.
    // (이 앱은 서비스를 name으로 식별 — DB 컬럼명은 bookableServiceIdsJson) 오너 설정에만 쓰이고 고객 응답엔 미노출.
    bookableServiceNames: string[] | null;
}

// 예약 흐름 4단계 기본 안내문구. 오너가 비워둔 채 시작하지 않도록 설정 화면에 미리 채워 넣는다
// (placeholder 예시가 아니라 실제 값 — 그대로 저장하면 고객에게 그대로 나간다).
export const DEFAULT_BOOKING_TEXTS = {
    noticeText: '예약 신청 후 매장 확인을 거쳐 확정됩니다. 확정 결과는 예약 조회 페이지에서 확인하실 수 있습니다.',
    doneText: '예약 신청이 접수되었습니다. 매장 확인 후 확정되며, 결과는 예약 조회 페이지에서 확인하실 수 있습니다.',
    confirmText: '예약이 확정되었습니다. 예약 시간에 맞춰 방문해 주세요. 변경이나 취소가 필요하시면 이 페이지에서 요청해 주세요.',
    cancelText: '예약이 취소되었습니다. 다시 예약을 원하시면 예약 페이지에서 새로 신청해 주세요.',
} as const;

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
    slotIntervalMin: 30,
    minLeadMinutes: 60,
    maxAdvanceDays: 30,
    allowAssigneeChoice: true,
    contactTel: null,
    noticeText: null,
    noticeI18n: null,
    doneText: null,
    doneI18n: null,
    confirmText: null,
    confirmI18n: null,
    cancelText: null,
    cancelI18n: null,
    bookableServiceNames: null,
};

// bookableServiceIdsJson(Prisma Json) → 화이트리스트. 배열이면서 비어있지 않을 때만 유효, 그 외 null(전체 노출).
export function parseBookableServiceNames(json: unknown): string[] | null {
    if (!Array.isArray(json)) return null;
    const names = json.filter((x): x is string => typeof x === 'string');
    return names.length > 0 ? names : null;
}

// 요청 서비스가 모두 노출 허용 범위인지. 화이트리스트가 null이면 전체 허용.
export function areServicesBookable(requested: string[], whitelist: string[] | null): boolean {
    if (!whitelist) return true;
    return requested.every((name) => whitelist.includes(name));
}

// 정기 휴무 요일 정규화: 0~6 정수만·중복 제거·오름차순. 그 외 값은 버린다.
export function sanitizeClosedWeekdays(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    const set = new Set<number>();
    for (const v of value) {
        if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6) set.add(v);
    }
    return [...set].sort((a, b) => a - b);
}

// 공개 URL 슬러그: 소문자 영숫자·하이픈, 3~32자, 하이픈으로 시작/끝 불가.
export const BOOKING_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export function isValidBookingSlug(value: string): boolean {
    return BOOKING_SLUG_PATTERN.test(value);
}

// 캘린더 휴무 표시 판정. 임시 휴업일(특정 날짜)과 정기 휴무(매주 요일)는 화면 문구가 달라
// 어느 쪽인지까지 돌려준다. 둘 다 해당하면 **임시 휴업일이 이긴다** — 오너가 직접 찍은 날이라
// 정기 휴무보다 구체적인 의사표시다.
export type StoreClosedKind = 'date' | 'weekday' | null;

// 휴무 문구. 화면에는 글자를 띄우지 않고(색 띠 + 틴트로 표시) **스크린리더·툴팁에만** 쓴다 —
// 순수 시각 표시는 시각장애 사용자에게 아무것도 전달하지 못하므로 텍스트를 DOM 에 남긴다.
export const STORE_CLOSED_LABEL: Record<Exclude<StoreClosedKind, null>, string> = {
    date: '휴업일',
    weekday: '정기휴무',
};

export function getStoreClosedKind(
    settings: Pick<StoreSettings, 'closedDates' | 'closedWeekdays'>,
    dateKey: string,
): StoreClosedKind {
    if (settings.closedDates.includes(dateKey)) return 'date';

    // dayIndex 규칙은 0=월 … 6=일, JS getDay()는 0=일 … 6=토 → (getDay()+6)%7.
    // 날짜 전용 문자열은 로컬 자정으로 파싱한다(횡단 규칙 1번 — UTC 파싱은 하루 밀린다).
    const day = new Date(`${dateKey}T00:00:00`).getDay();
    if (Number.isNaN(day)) return null;

    return (settings.closedWeekdays ?? []).includes((day + 6) % 7) ? 'weekday' : null;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
    businessHours: {
        start: '10:00',
        end: '20:00',
    },
    closedDates: [],
    closedWeekdays: [],
    pointSettings: {
        enableServiceRate: false,
        enableRecharge: false,
        serviceRate: 0,
        rechargeRules: [
            {baseAmount: 0, bonusAmount: 0},
        ],
    },
};
