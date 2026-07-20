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
    noticeText: string | null;
    // 공개 노출할 서비스명 화이트리스트. null 또는 []=전체 노출, 비어있지 않으면 그 서비스만 노출.
    // (이 앱은 서비스를 name으로 식별 — DB 컬럼명은 bookableServiceIdsJson) 오너 설정에만 쓰이고 고객 응답엔 미노출.
    bookableServiceNames: string[] | null;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
    slotIntervalMin: 30,
    minLeadMinutes: 60,
    maxAdvanceDays: 30,
    allowAssigneeChoice: true,
    noticeText: null,
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
