import type {StoreSettings} from '../utils/storeSettings';

export function buildUpdatedStoreBusinessHoursState(
    storeSettings: StoreSettings,
    hours: Partial<StoreSettings['businessHours']>
) {
    return {
        ...storeSettings,
        businessHours: {
            ...storeSettings.businessHours,
            ...hours,
        }
    };
}

export function buildUpdatedStorePointSettingsState(
    storeSettings: StoreSettings,
    pointSettings: Partial<StoreSettings['pointSettings']>
) {
    return {
        ...storeSettings,
        pointSettings: {
            ...storeSettings.pointSettings,
            ...pointSettings,
        },
    };
}

export function buildUpdatedStoreClosedDatesState(storeSettings: StoreSettings, dates: string[]) {
    return {
        ...storeSettings,
        closedDates: [...dates].sort()
    };
}

export function buildAddedStoreClosedDateState(storeSettings: StoreSettings, date: string) {
    if (!date || storeSettings.closedDates.includes(date)) {
        return null;
    }

    return {
        ...storeSettings,
        closedDates: [...storeSettings.closedDates, date].sort()
    };
}

export function buildRemovedStoreClosedDateState(storeSettings: StoreSettings, date: string) {
    const nextClosedDates = storeSettings.closedDates.filter((item) => item !== date);
    if (nextClosedDates.length === storeSettings.closedDates.length) {
        return null;
    }

    return {
        ...storeSettings,
        closedDates: nextClosedDates
    };
}
