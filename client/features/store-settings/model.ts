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
    pointSettings: PointSettings;
}

// 공개(고객) 온라인 예약 규칙. 매장 설정 응답의 top-level로 별도 전달(StoreSettings와 분리).
export interface BookingSettings {
    slotIntervalMin: number;
    minLeadMinutes: number;
    maxAdvanceDays: number;
    allowAssigneeChoice: boolean;
    noticeText: string | null;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
    slotIntervalMin: 30,
    minLeadMinutes: 60,
    maxAdvanceDays: 30,
    allowAssigneeChoice: true,
    noticeText: null,
};

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
    pointSettings: {
        enableServiceRate: false,
        enableRecharge: false,
        serviceRate: 0,
        rechargeRules: [
            {baseAmount: 0, bonusAmount: 0},
        ],
    },
};
