export interface StoreBusinessHours {
    start: string;
    end: string;
}

export interface StoreSettings {
    businessHours: StoreBusinessHours;
    closedDates: string[];
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
    businessHours: {
        start: '10:00',
        end: '20:00',
    },
    closedDates: [],
};
