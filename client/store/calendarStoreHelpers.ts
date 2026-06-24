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
): Promise<void> {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot(localDbUpdater);
        return Promise.resolve();
    }

    return fetch(endpoint, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    }).then(() => undefined).catch(() => {
        // Preserve local UX even if sync fails; server data can be retried later.
    });
}

export function syncDesignerSettings(designers: Designer[]): void {
    void syncToServer('/api/designers', {designers}, (c) => ({...c, designers}));
}

// 서버 저장이 끝나면 resolve. 신규 고객을 만든 직후 예약을 POST해야 하는 경우,
// 호출 측에서 await 해 고객이 서버에 먼저 존재하도록 보장한다.
export function syncCustomerSettings(customers: Customer[]): Promise<void> {
    return syncToServer('/api/customers', {customers}, (c) => ({...c, customers}));
}

// 신규 고객 1명만 빠르게 저장(서버는 단일 POST). 전체 목록 PUT(고객 수에 비례해 수 초)
// 대신 단건이라 수십 ms 안에 끝나고, await 가능해 직후 예약 POST 시 'Customer not found'를
// 막는다. 로컬 모드에선 스냅샷의 전체 고객 배열을 갱신한다.
export function persistNewCustomer(customer: Customer, allCustomers: Customer[]): Promise<void> {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((current) => ({...current, customers: allCustomers}));
        return Promise.resolve();
    }

    return fetch('/api/customers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({customer}),
    }).then(() => undefined).catch(() => {});
}

// 고객 영구 삭제. 서버에선 그 고객의 예약·적립금·메모가 cascade로 함께 삭제된다.
export function deleteCustomerOnServer(customerId: number): Promise<void> {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((current) => ({
            ...current,
            customers: current.customers.filter((c) => c.id !== customerId),
            reservations: current.reservations.filter((r) => r.customerId !== customerId),
        }));
        return Promise.resolve();
    }

    return fetch('/api/customers', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: customerId}),
    }).then(() => undefined).catch(() => {});
}

// 디자이너 영구 삭제(분리 삭제). 서버에선 스케줄이 cascade로 함께 삭제되고,
// 예약은 보존하되 designerId가 null(미지정)로 분리된다.
export function deleteDesignerOnServer(designerId: number): Promise<void> {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((current) => ({
            ...current,
            designers: current.designers.filter((d) => d.id !== designerId),
            reservations: current.reservations.map((r) =>
                r.designerId === designerId ? {...r, designerId: undefined} : r
            ),
        }));
        return Promise.resolve();
    }

    return fetch('/api/designers', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: designerId}),
    }).then(() => undefined).catch(() => {});
}

export function syncStoreSettings(storeSettings: StoreSettings): void {
    syncToServer('/api/store', storeSettings, (c) => ({...c, storeSettings}));
}

export function syncStoreInfo(storeName: string, shopType: string | null): void {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((c) => ({...c, storeName, shopType: shopType ?? undefined}));
        return;
    }

    fetch('/api/store', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({storeName, shopType}),
    }).catch(() => {});
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
