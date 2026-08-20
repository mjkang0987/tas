import type {Customer} from '../utils/customers';
import type {Assignee} from '../utils/assignees';
import type {ServiceItem} from '../utils/services';
import type {StoreSettings} from '../utils/storeSettings';
import type {ReservationHistoryEntry, ReservationMap} from '../utils/reservations';
import type {LocalDbSnapshot} from '../lib/local-db';
import {
    flattenReservationMap,
    shouldUseLocalDb,
    updateLocalDbSnapshot,
} from '../lib/local-db';
import {useToastStore} from './toastStore';

/** 응답 본문에서 서버가 준 사유를 뽑는다. 없으면 상태줄로 대신한다. */
async function readErrorMessage(response: Response): Promise<string> {
    const fallback = `${response.status} ${response.statusText}`;
    try {
        const data = await response.clone().json();
        if (data?.error) return String(data.error);
    } catch {
        // JSON 이 아니면 본문을 그대로 본다.
    }
    try {
        const text = await response.text();
        if (text) return text;
    } catch {
        // 본문을 못 읽으면 상태줄로 충분하다.
    }
    return fallback;
}

/**
 * 서버 반영 요청. **실패를 삼키지 않는다.**
 *
 * `fetch` 는 500·403·401 에도 정상 resolve 한다. 그래서 `res.ok` 를 보지 않으면
 * 실패가 `.catch` 에 걸리지 않고 성공으로 흘러간다. 예전 구현이 정확히 그랬고,
 * "로컬은 저장됐는데 서버는 모르는" 상태가 조용히 만들어졌다 — 사용자는 새로고침
 * 하고 나서야 사라진 것을 알았다.
 *
 * 낙관적 로컬 상태는 되돌리지 않는다. 되돌리면 방금 입력한 내용이 눈앞에서
 * 사라지고, 일시적 네트워크 오류에도 작업을 잃는다. 대신 실패를 토스트로 알려
 * 사용자가 새로고침해 실제 상태를 확인하게 한다.
 */
export async function requestServerSync(
    endpoint: string,
    init: RequestInit,
    failMessage: string,
): Promise<boolean> {
    const method = init.method ?? 'GET';
    try {
        const response = await fetch(endpoint, init);
        if (response.ok) return true;
        console.error(`[sync] ${method} ${endpoint} 실패:`, await readErrorMessage(response));
    } catch (error) {
        console.error(`[sync] ${method} ${endpoint} 요청 실패:`, error);
    }

    useToastStore.getState().show(failMessage, 'error');
    return false;
}

/** JSON 본문 요청의 공통 init */
export function jsonRequest(method: string, payload: unknown): RequestInit {
    return {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    };
}

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

    void requestServerSync(
        '/api/services',
        jsonRequest('PUT', {services: normalizedServices, categoryBaseColors}),
        '서비스 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.',
    );
}

function syncToServer(
    endpoint: string,
    payload: unknown,
    localDbUpdater: (current: LocalDbSnapshot) => LocalDbSnapshot,
    failMessage: string,
): Promise<void> {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot(localDbUpdater);
        return Promise.resolve();
    }

    return requestServerSync(endpoint, jsonRequest('PUT', payload), failMessage).then(() => undefined);
}

export function syncAssigneeSettings(assignees: Assignee[]): void {
    void syncToServer('/api/assignees', {assignees}, (c) => ({...c, assignees}),
        '담당자 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
}

// 서버 저장이 끝나면 resolve. 신규 고객을 만든 직후 예약을 POST해야 하는 경우,
// 호출 측에서 await 해 고객이 서버에 먼저 존재하도록 보장한다.
export function syncCustomerSettings(customers: Customer[]): Promise<void> {
    return syncToServer('/api/customers', {customers}, (c) => ({...c, customers}),
        '고객 정보 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
}

// 신규 고객 1명만 빠르게 저장(서버는 단일 POST). 전체 목록 PUT(고객 수에 비례해 수 초)
// 대신 단건이라 수십 ms 안에 끝나고, await 가능해 직후 예약 POST 시 'Customer not found'를
// 막는다. 로컬 모드에선 스냅샷의 전체 고객 배열을 갱신한다.
export function persistNewCustomer(customer: Customer, allCustomers: Customer[]): Promise<void> {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((current) => ({...current, customers: allCustomers}));
        return Promise.resolve();
    }

    return requestServerSync('/api/customers', jsonRequest('POST', {customer}),
        '고객 등록에 실패했습니다. 새로고침 후 다시 시도해 주세요.').then(() => undefined);
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

    return requestServerSync('/api/customers', jsonRequest('DELETE', {id: customerId}),
        '고객 삭제가 서버에 반영되지 않았습니다. 새로고침 후 다시 시도해 주세요.').then(() => undefined);
}

// 담당자 영구 삭제(분리 삭제). 서버에선 스케줄이 cascade로 함께 삭제되고,
// 예약은 보존하되 assigneeId가 null(미지정)로 분리된다.
export function deleteAssigneeOnServer(assigneeId: number): Promise<void> {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((current) => ({
            ...current,
            assignees: current.assignees.filter((d) => d.id !== assigneeId),
            reservations: current.reservations.map((r) =>
                r.assigneeId === assigneeId ? {...r, assigneeId: undefined} : r
            ),
        }));
        return Promise.resolve();
    }

    return requestServerSync('/api/assignees', jsonRequest('DELETE', {id: assigneeId}),
        '담당자 삭제가 서버에 반영되지 않았습니다. 새로고침 후 다시 시도해 주세요.').then(() => undefined);
}

export function syncStoreSettings(storeSettings: StoreSettings): void {
    void syncToServer('/api/store', storeSettings, (c) => ({...c, storeSettings}),
        '매장 설정 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
}

export function syncStoreInfo(
    storeName: string,
    shopType: string | null,
    storeNameI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null,
): void {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((c) => ({...c, storeName, shopType: shopType ?? undefined}));
        return;
    }

    void requestServerSync(
        '/api/store',
        jsonRequest('PATCH', storeNameI18n !== undefined ? {storeName, shopType, storeNameI18n} : {storeName, shopType}),
        '매장 정보 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.',
    );
}

export function syncStoreFeatures(patch: {usePointSystem?: boolean; useMembershipSystem?: boolean; useCouponSystem?: boolean; useOnlineBooking?: boolean}): void {
    if (shouldUseLocalDb()) {
        updateLocalDbSnapshot((c) => ({...c, ...patch}));
        return;
    }

    void requestServerSync('/api/store', jsonRequest('PATCH', patch),
        '매장 설정 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
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
