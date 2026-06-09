import type {Customer, CustomerMap} from '../customers/model';
import {toCustomerMap} from '../customers/model';
import type {Designer} from '../designers/model';
import {DEFAULT_DESIGNERS} from '../designers/model';
import type {Reservation, ReservationHistoryEntry, ReservationMap} from '../reservations/model';
import type {ServiceItem} from '../services/model';
import {CATEGORY_BASE_COLOR_MAP, SERVICE_CATALOG} from '../services/model';
import type {StoreSettings} from '../store-settings/model';
import {DEFAULT_STORE_SETTINGS} from '../store-settings/model';

const LOCAL_DB_KEY = 'takeaseat.local-db.v1';
const LOCAL_DB_EVENT = 'takeaseat-local-db-updated';

export interface LocalDbSnapshot {
    customers: Customer[];
    reservations: Reservation[];
    history: ReservationHistoryEntry[];
    services: ServiceItem[];
    categoryBaseColors: Record<string, string>;
    designers: Designer[];
    storeSettings: StoreSettings;
    onboarded?: boolean;
    storeName?: string;
    shopType?: string;
}

function cloneSnapshot(snapshot: LocalDbSnapshot): LocalDbSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as LocalDbSnapshot;
}

export function createDefaultLocalDbSnapshot(): LocalDbSnapshot {
    return cloneSnapshot({
        customers: [],
        reservations: [],
        history: [],
        services: [],
        categoryBaseColors: {},
        designers: [],
        storeSettings: DEFAULT_STORE_SETTINGS,
    });
}

const AUTH_FLAG_KEY = 'takeaseat.authenticated';

export function setAuthenticated(value: boolean): void {
    if (typeof sessionStorage === 'undefined') return;
    if (value) {
        sessionStorage.setItem(AUTH_FLAG_KEY, '1');
    } else {
        sessionStorage.removeItem(AUTH_FLAG_KEY);
    }
}

export function shouldUseLocalDb(): boolean {
    if (typeof sessionStorage === 'undefined') return true;
    return !sessionStorage.getItem(AUTH_FLAG_KEY);
}

export function loadLocalDbSnapshot(): LocalDbSnapshot {
    if (typeof window === 'undefined') {
        return createDefaultLocalDbSnapshot();
    }

    const raw = window.localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) {
        // 로컬DB가 새로 생성될 때 관련 상태도 초기화하여 알림·중복감지가 새로 동작하도록 함
        window.localStorage.removeItem('sync-notifications');
        window.localStorage.removeItem('naver-sync-deferred-conflicts');
        window.localStorage.removeItem('naver-sync-active-conflicts');
        const snapshot = createDefaultLocalDbSnapshot();
        saveLocalDbSnapshot(snapshot);
        return snapshot;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<LocalDbSnapshot>;
        // 하위호환: onboarded 필드가 없는 기존 데이터는 이미 사용 중이므로 true로 간주
        const onboarded = typeof parsed.onboarded === 'boolean'
            ? parsed.onboarded
            : true;
        return {
            ...createDefaultLocalDbSnapshot(),
            ...parsed,
            categoryBaseColors: parsed.categoryBaseColors ?? CATEGORY_BASE_COLOR_MAP,
            storeSettings: parsed.storeSettings ?? DEFAULT_STORE_SETTINGS,
            designers: Array.isArray(parsed.designers) ? parsed.designers : DEFAULT_DESIGNERS,
            services: Array.isArray(parsed.services) ? parsed.services : SERVICE_CATALOG,
            customers: Array.isArray(parsed.customers) ? parsed.customers : [],
            reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
            onboarded,
        };
    } catch {
        const snapshot = createDefaultLocalDbSnapshot();
        saveLocalDbSnapshot(snapshot);
        return snapshot;
    }
}

export function saveLocalDbSnapshot(snapshot: LocalDbSnapshot): void {
    if (typeof window === 'undefined') return;

    const normalized = cloneSnapshot(snapshot);
    window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent<LocalDbSnapshot>(LOCAL_DB_EVENT, {detail: normalized}));
}

export function updateLocalDbSnapshot(updater: (current: LocalDbSnapshot) => LocalDbSnapshot): void {
    const current = loadLocalDbSnapshot();
    saveLocalDbSnapshot(updater(current));
}

export function subscribeLocalDb(listener: (snapshot: LocalDbSnapshot) => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const handleUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<LocalDbSnapshot>;
        listener(customEvent.detail ?? loadLocalDbSnapshot());
    };

    const handleStorage = (event: StorageEvent) => {
        if (event.key === LOCAL_DB_KEY) {
            listener(loadLocalDbSnapshot());
        }
    };

    window.addEventListener(LOCAL_DB_EVENT, handleUpdate as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
        window.removeEventListener(LOCAL_DB_EVENT, handleUpdate as EventListener);
        window.removeEventListener('storage', handleStorage);
    };
}

export function flattenReservationMap(reservationMap: ReservationMap): Reservation[] {
    return Object.values(reservationMap).flat();
}

export function customerMapToList(customerMap: CustomerMap): Customer[] {
    return Object.values(customerMap);
}

export function customerListToMap(customers: Customer[]): CustomerMap {
    return toCustomerMap(customers);
}
