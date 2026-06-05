import type {Customer} from '../utils/customers';
import type {Designer} from '../utils/designers';
import type {ServiceItem} from '../utils/services';
import type {StoreSettings} from '../utils/storeSettings';
import type {ReservationHistoryEntry, ReservationMap} from '../utils/reservations';
import type {LocalDbSnapshot} from '../lib/local-db';
import {
    flattenReservationMap,
    shouldUseLocalDb,
    updateLocalDbSnapshot,
} from '../lib/local-db';

export function syncServiceSettings(services: ServiceItem[], categoryBaseColors: Record<string, string>): void {
    const normalizedServices = services.map((service) => ({
        ...service,
        name: service.name.trim(),
        category: service.category.trim(),
    }));
    const duplicateNames = normalizedServices.reduce<string[]>((acc, service, index, list) => {
        if (!service.name) {
            return acc;
        }

        const firstIndex = list.findIndex((item) => item.name === service.name);
        if (firstIndex !== index || acc.includes(service.name)) {
            return acc;
        }

        const duplicateCount = list.filter((item) => item.name === service.name).length;
        return duplicateCount > 1 ? [...acc, service.name] : acc;
    }, []);

    if (duplicateNames.length > 0) {
        console.error('[services] duplicate service names in payload:', duplicateNames);
        return;
    }

    if (normalizedServices.some((service) => !service.name || !service.category)) {
        console.error('[services] invalid service payload: empty name/category', normalizedServices);
        return;
    }

    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((current) => ({
            ...current,
            services: normalizedServices,
            categoryBaseColors,
        }));
        return;
    }

    fetch('/api/services', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({services: normalizedServices, categoryBaseColors})
    })
        .then(async (response) => {
            if (response.ok) {
                return;
            }

            let message = `${response.status} ${response.statusText}`;

            try {
                const data = await response.json();
                if (data?.error) {
                    message = data.error;
                }
            } catch {
                try {
                    const text = await response.text();
                    if (text) {
                        message = text;
                    }
                } catch {
                    // Keep fallback message.
                }
            }

            console.error('[services] sync failed:', message, normalizedServices);
        })
        .catch(() => {
        // Preserve local UX even if sync fails; server data can be retried later.
        });
}

function syncToServer(
    endpoint: string,
    payload: unknown,
    localDbUpdater: (current: LocalDbSnapshot) => LocalDbSnapshot,
): void {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot(localDbUpdater);
        return;
    }

    fetch(endpoint, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    }).catch(() => {
        // Preserve local UX even if sync fails; server data can be retried later.
    });
}

export function syncDesignerSettings(designers: Designer[]): void {
    syncToServer('/api/designers', {designers}, (c) => ({...c, designers}));
}

export function syncCustomerSettings(customers: Customer[]): void {
    syncToServer('/api/customers', {customers}, (c) => ({...c, customers}));
}

export function syncStoreSettings(storeSettings: StoreSettings): void {
    syncToServer('/api/store', storeSettings, (c) => ({...c, storeSettings}));
}

export function syncReservationState(reservationMap: ReservationMap, history: ReservationHistoryEntry[]): void {
    if (!shouldUseLocalDb()) {
        return;
    }

    updateLocalDbSnapshot((current) => ({
        ...current,
        reservations: flattenReservationMap(reservationMap),
        history,
    }));
}

export function groupCatalogByCategory(serviceCatalog: ServiceItem[]): Map<string, ServiceItem[]> {
    const grouped = new Map<string, ServiceItem[]>();

    for (const item of serviceCatalog) {
        const group = grouped.get(item.category);

        if (group) {
            group.push(item);
        } else {
            grouped.set(item.category, [item]);
        }
    }

    return grouped;
}

export function reorder<T>(list: T[], fromIndex: number, targetIndex: number): T[] {
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(insertIndex, 0, moved);
    return next;
}
