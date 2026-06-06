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
