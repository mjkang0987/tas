import type {Customer, CustomerMap} from '../customers/model';
import {toCustomerMap} from '../customers/model';
import type {Assignee} from '../assignees/model';
import {DEFAULT_ASSIGNEES} from '../assignees/model';
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
    assignees: Assignee[];
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
        assignees: [],
        storeSettings: DEFAULT_STORE_SETTINGS,
        onboarded: false,
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

const GUEST_TERMS_KEY = 'takeaseat.guest-terms-version';
// 미들웨어(proxy.ts)가 SNS 연동 시 "게스트로 이미 동의함"을 판별하기 위한 쿠키.
// 이 경우 /consent 리다이렉트 대신 통과시키고, DPA 동의는 앱 위 레이어로 받는다.
const GUEST_TERMS_COOKIE = 'tas-guest-terms';

// 게스트(미로그인) 약관 동의 버전 — 로그인 계정은 DB(User.agreedTermsVersion)에 저장
export function getGuestTermsVersion(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(GUEST_TERMS_KEY);
}

export function setGuestTermsAgreed(version: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GUEST_TERMS_KEY, version);
    if (typeof document !== 'undefined') {
        document.cookie = `${GUEST_TERMS_COOKIE}=${version}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
}

export function clearGuestTermsAgreed(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(GUEST_TERMS_KEY);
    if (typeof document !== 'undefined') {
        document.cookie = `${GUEST_TERMS_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
}

// 실제 게스트 이용 데이터(온보딩 완료 또는 고객/예약/담당자/서비스)가 있는지
export function hasGuestData(): boolean {
    if (typeof window === 'undefined') return false;
    const raw = window.localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return false;
    try {
        const parsed = JSON.parse(raw) as Partial<LocalDbSnapshot>;
        return parsed.onboarded === true
            || (Array.isArray(parsed.customers) && parsed.customers.length > 0)
            || (Array.isArray(parsed.reservations) && parsed.reservations.length > 0)
            || (Array.isArray(parsed.assignees) && parsed.assignees.length > 0)
            || (Array.isArray(parsed.services) && parsed.services.length > 0);
    } catch {
        return false;
    }
}

// 게스트 진입(데이터 불러오기 여부)을 이번 세션에서 이미 결정했는지 — 중복 안내 방지
const GUEST_ENTRY_RESOLVED_KEY = 'takeaseat.guest-entry-resolved';

export function isGuestEntryResolved(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return !!sessionStorage.getItem(GUEST_ENTRY_RESOLVED_KEY);
}

export function markGuestEntryResolved(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(GUEST_ENTRY_RESOLVED_KEY, '1');
}

export function clearGuestEntryResolved(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(GUEST_ENTRY_RESOLVED_KEY);
}

// 약관 동의를 이번 세션에서 확인(ack)했는지 — 영구 기록은 온보딩 완료(서비스 개시) 시점에 함.
// consent→onboarding 사이에서만 동의를 유지하고, 온보딩 미완료 재진입 시엔 다시 동의받기 위함.
const GUEST_CONSENT_ACK_KEY = 'takeaseat.guest-consent-ack';

export function isGuestConsentAck(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return !!sessionStorage.getItem(GUEST_CONSENT_ACK_KEY);
}

export function markGuestConsentAck(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(GUEST_CONSENT_ACK_KEY, '1');
}

export function clearGuestConsentAck(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(GUEST_CONSENT_ACK_KEY);
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
            assignees: Array.isArray(parsed.assignees) ? parsed.assignees : DEFAULT_ASSIGNEES,
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
