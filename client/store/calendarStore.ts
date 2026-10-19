import {create} from 'zustand';

import type {Reservation, ReservationMap, ReservationHistoryEntry, ReservationStatus} from '../utils/reservations';
import {toDateKey} from '../utils/reservations';
import {ViewType} from '../utils/constants';
import {hasCompletedPayment, pointRefundOnCancel} from '../utils/reservations';
import type {Customer, CustomerMap} from '../utils/customers';
import type {PointHistoryEntry} from '../utils/customers';
import {anonymizeCustomer, anonymizeCustomerReservation, appendPointHistories, syncCustomerFirstVisitDates} from '../utils/customers';
import type {ServiceItem} from '../utils/services';
import {CATEGORY_BASE_COLOR_MAP} from '../utils/services';
import type {DaySchedule, Assignee, AssigneeStatus} from '../utils/assignees';
import type {StoreSettings} from '../utils/storeSettings';
import type {SyncNotification} from '../hooks/useNaverBookingSync';
import {DEFAULT_STORE_SETTINGS} from '../utils/storeSettings';
import {
    buildAddedAssigneeState,
    buildDeletedAssigneeState,
    buildUpdatedAssigneeDayState,
    buildUpdatedAssigneeState,
} from './calendarStoreAssigneeHelpers';
import {
    syncCustomerSettings,
    persistNewCustomer,
    deleteCustomerOnServer,
    syncAssigneeSettings,
    deleteAssigneeOnServer,
    syncReservationState,
    syncServiceSettings,
    syncStoreInfo,
    syncStoreFeatures,
    syncStoreSettings,
    requestServerSync,
    jsonRequest,
} from './calendarStoreHelpers';
import {useToastStore} from './toastStore';
import {
    buildClosedReservationState,
    buildOpenedReservationState,
} from './calendarStoreOverlayHelpers';
import {
    buildAddedReservationMap,
    buildCancelledReservationState,
    buildUpdatedReservationState,
} from './calendarStoreReservationHelpers';
import {
    buildAddedServiceState,
    buildDeletedServiceState,
    buildMovedCategoryState,
    buildMovedServiceInCategoryState,
    buildRenamedCategoryState,
    buildServiceCatalogReservationUpdates,
    buildUpdatedServiceState,
} from './calendarStoreServiceHelpers';
import {
    buildAddedStoreClosedDateState,
    buildRemovedStoreClosedDateState,
    buildUpdatedStoreBusinessHoursState,
    buildUpdatedStoreClosedDatesState,
    buildUpdatedStoreClosedWeekdaysState,
    buildUpdatedStorePointSettingsState,
} from './calendarStoreStoreSettingsHelpers';
import {shouldUseLocalDb} from '../lib/local-db';

// ── Notification localStorage persistence ──

const SYNC_NOTIFICATIONS_KEY = 'sync-notifications';

function loadSyncNotifications(): SyncNotification[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(SYNC_NOTIFICATIONS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Array<SyncNotification & {timestamp: string}>;
        const seenIds = new Set<string>();
        const deduped: SyncNotification[] = [];
        for (const n of parsed) {
            if (seenIds.has(n.id)) continue;
            seenIds.add(n.id);
            deduped.push({...n, timestamp: new Date(n.timestamp)});
        }
        return deduped;
    } catch {
        return [];
    }
}

function saveSyncNotifications(notifications: SyncNotification[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(SYNC_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch {
        // Silently ignore storage errors
    }
}

export type FullType = Date | null;

export interface DateType {
    full: FullType;
    fullYear: number;
    month: number;
    date: number;
    day: number;
}

export interface AsideSlice {
    isVisible: boolean;
}

export interface ViewSlice {
    type: string;
}

export interface RouterSlice {
    arrayRouter: Array<string | number>;
    isRootPath: boolean;
    isCalendarPath: boolean;
}

export interface CreateReservationInitial {
    date: string;
    startTime: string;
}

export interface CalendarState {
    today: FullType;
    target: DateType;
    aside: AsideSlice;
    view: ViewSlice;
    router: RouterSlice;
    reservationMap: ReservationMap;
    customerMap: CustomerMap;
    selectedReservation: number | null;
    selectedReservations: number[];
    reservationHistory: ReservationHistoryEntry[];
    reservationListFilter: { type: 'month'; year: number; month: number } | { type: 'date'; dateKey: string } | null;
    createReservationInitial: CreateReservationInitial | null;
    selectedCustomerId: number | null;
    calendarAssigneeId: number | null;
    serviceCatalog: ServiceItem[];
    categoryBaseColorMap: Record<string, string>;
    assignees: Assignee[];
    storeName: string;
    storeNameI18n: {en?: string | null; ja?: string | null; zh?: string | null} | null;
    shopType: string | null;
    usePointSystem: boolean;
    useMembershipSystem: boolean;
    useCouponSystem: boolean;
    useOnlineBooking: boolean;
    // 네이버예약 연동 노출 여부. 오너가 켜는 토글이 아니라 서버가 정하는 공개 범위다(`server/naver-access.ts`).
    naverBookingEnabled: boolean;
    storeSettings: StoreSettings;
    syncNotifications: SyncNotification[];

    setToday: (v: FullType) => void;
    setTarget: (partial: Partial<DateType>) => void;
    setTargetFromDate: (value: Date | string | number) => void;
    setAside: (v: AsideSlice | ((prev: AsideSlice) => AsideSlice)) => void;
    setView: (v: ViewSlice | ((prev: ViewSlice) => ViewSlice)) => void;
    setRouterSlice: (v: RouterSlice | ((prev: RouterSlice) => RouterSlice)) => void;
    setReservationMap: (map: ReservationMap) => void;
    setCustomerMap: (map: CustomerMap) => void;
    /** 서버가 정한 고객 번호를 돌려준다(보낸 번호와 다를 수 있다). 저장 실패면 보낸 번호 그대로 */
    /** 서버가 정한 고객 번호. 저장에 실패하면 null — 화면에 넣었던 고객도 뺀다(확정 안 된 번호로 쓰면 남의 고객을 덮는다). */
    addCustomer: (customer: Customer) => Promise<number | null>;
    updateCustomer: (
        customerId: number,
        patch: Partial<Customer>,
        pointHistory?: Array<Omit<PointHistoryEntry, 'id' | 'balance' | 'createdAt'>> | Omit<PointHistoryEntry, 'id' | 'balance' | 'createdAt'>
    ) => void;
    deleteCustomer: (customerId: number) => void;
    setSelectedReservation: (v: number | null) => void;
    setSelectedReservations: (v: number[]) => void;
    openReservationDetail: (reservation: Reservation) => void;
    openReservationDetailFromCustomer: (reservation: Reservation) => void;
    closeReservationDetail: (layerIndex: number) => void;
    setReservationHistory: (history: ReservationHistoryEntry[]) => void;
    setReservationListFilter: (v: CalendarState['reservationListFilter']) => void;
    setCreateReservationInitial: (v: CreateReservationInitial | null) => void;
    setSelectedCustomerId: (v: number | null) => void;
    openCustomerDetail: (customerId: number) => void;
    setCalendarAssigneeId: (v: number | null) => void;
    setServiceCatalog: (catalog: ServiceItem[]) => void;
    setCategoryBaseColorMap: (colorMap: Record<string, string>) => void;
    setAssignees: (assignees: Assignee[]) => void;
    setStoreInfo: (name: string, type: string | null, nameI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null) => void;
    updateStoreInfo: (name: string, type: string | null, nameI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null) => void;
    setStoreFeatures: (features: {
        usePointSystem: boolean;
        useMembershipSystem: boolean;
        useCouponSystem: boolean;
        useOnlineBooking: boolean;
        naverBookingEnabled: boolean;
    }) => void;
    updateStoreFeatures: (patch: {usePointSystem?: boolean; useMembershipSystem?: boolean; useCouponSystem?: boolean; useOnlineBooking?: boolean}) => void;
    setStoreSettings: (storeSettings: StoreSettings) => void;
    updateStoreBusinessHours: (hours: Partial<StoreSettings['businessHours']>) => void;
    updateStorePointSettings: (pointSettings: Partial<StoreSettings['pointSettings']>) => void;
    updateStoreClosedDates: (dates: string[]) => void;
    updateStoreClosedWeekdays: (weekdays: number[]) => void;
    addStoreClosedDate: (date: string) => void;
    removeStoreClosedDate: (date: string) => void;
    addAssignee: (name: string, status?: AssigneeStatus, phone?: string, note?: string, color?: string) => void;
    updateAssignee: (assigneeId: number, patch: Partial<Pick<Assignee, 'name' | 'nameI18n' | 'status' | 'phone' | 'note' | 'color'>>) => void;
    updateAssigneeDay: (assigneeId: number, dayIndex: number, patch: Partial<DaySchedule>) => void;
    deleteAssignee: (assigneeId: number) => void;
    updateCategoryBaseColor: (category: string, color: string) => void;
    addService: (item: ServiceItem) => void;
    updateService: (name: string, updated: ServiceItem) => number;
    deleteService: (name: string) => void;
    renameCategory: (prevCategory: string, nextCategory: string) => void;
    moveCategory: (dragCategory: string, targetCategory: string) => void;
    moveServiceInCategory: (dragName: string, targetName: string) => void;
    addReservation: (reservation: Reservation) => void;
    updateReservation: (prev: Reservation, updated: Reservation) => void;
    cancelReservation: (reservation: Reservation, status?: ReservationStatus, reason?: string) => void;
    restoreReservation: (reservation: Reservation) => void;
    deleteReservation: (reservation: Reservation) => void;
    addSyncNotifications: (items: SyncNotification[]) => void;
    markSyncNotificationRead: (id: string) => void;
    markSyncNotificationsRead: () => void;
    updateConflictNotificationStatus: (conflictKey: string, status: 'pending' | 'deferred' | 'confirmed', resolvedBy?: 'manual' | 'auto', resolution?: {reason?: string; memo?: string}) => void;
    replaceMockConflictNotifications: (items: SyncNotification[]) => void;
    clearSyncNotifications: () => void;
    initSyncNotifications: () => void;
    patchNotificationNames: () => void;
}

type ServiceSettingsState = Pick<CalendarState, 'serviceCatalog' | 'categoryBaseColorMap'>;

function withSyncedCatalog(state: ServiceSettingsState, nextCatalog: ServiceItem[]) {
    syncServiceSettings(nextCatalog, state.categoryBaseColorMap);
    return {serviceCatalog: nextCatalog};
}

function withSyncedCategoryColors(state: ServiceSettingsState, nextCategoryBaseColorMap: Record<string, string>) {
    syncServiceSettings(state.serviceCatalog, nextCategoryBaseColorMap);
    return {categoryBaseColorMap: nextCategoryBaseColorMap};
}

function resolveLatestReservation(reservationMap: ReservationMap, reservation: Reservation): Reservation {
    const dateReservations = reservationMap[reservation.date] ?? [];
    return dateReservations.find((item) => item.id === reservation.id) ?? reservation;
}

// 예약 변경(추가·수정·취소·복원·삭제) 시 firstVisitDate가 실제로 바뀐 고객만 서버에
// 저장한다. 전체 고객 목록을 통째로 PUT하던 비효율(고객 수에 비례해 수 초, 예약 POST와
// 레이스)을 없애기 위함.
// 서버에 만드는 중이거나 번호가 바뀐 예약(화면 번호 → 서버가 정한 번호, 실패면 null).
// 만들기가 끝나기 전에, 또는 옛 번호를 들고 있는 열린 화면에서 그 번호로 수정·삭제를 보내면
// 같은 번호의 **다른 예약**을 덮어쓴다 — 서버 번호가 정해질 때까지 기다렸다가 그 번호로 보낸다.
// 예약별 서버 요청 줄(앞 요청이 끝난 뒤 다음을 보낸다) — 값은 서버 번호(만들기 실패면 null).
const reservationQueues = new Map<number, Promise<number | null>>();
const savedReservationIds = new Map<number, number>();
// 만들기에 실패한 화면 번호 — 그 번호는 서버에선 다른 예약일 수 있어 그 번호로는 보내지 않는다.
const failedReservationIds = new Set<number>();

function isListedReservationId(id: number): boolean {
    return Object.values(useCalendarStore.getState().reservationMap).some((list) => list.some((item) => item.id === id));
}

/** 모든 날짜에서 그 번호의 예약을 새 번호로(null 이면 뺀다). */
function mapReservationIds(map: ReservationMap, fromId: number, toId: number | null): ReservationMap {
    const next: ReservationMap = {};
    for (const [dateKey, list] of Object.entries(map)) {
        next[dateKey] = toId == null
            ? list.filter((item) => item.id !== fromId)
            : list.map((item) => (item.id === fromId ? {...item, id: toId} : item));
    }
    return next;
}

/**
 * 화면 번호를 이미 알려진 서버 번호로(열린 레이어가 옛 번호를 들고 있을 때).
 * 화면 목록에 그 옛 번호의 예약이 **있으면** 그건 다시 받아 온 다른 예약(네이버 동기화 등)이라 옮기지 않는다.
 */
function savedReservationIdFor(id: number): number {
    const saved = savedReservationIds.get(id);
    if (saved == null || saved === id) return id;
    return isListedReservationId(id) ? id : saved;
}

function withSavedReservationId(reservation: Reservation): Reservation {
    const id = savedReservationIdFor(reservation.id);
    return id === reservation.id ? reservation : {...reservation, id};
}

/** 서버에 보낼 이 예약의 번호 — 만드는 중이면 끝날 때까지 기다린다(실패면 null). 결제 레이어의 쿠폰·회원권 요청용. */
export function serverReservationId(id: number): Promise<number | null> {
    if (failedReservationIds.has(id) && !isListedReservationId(id)) return Promise.resolve(null);
    return reservationQueues.get(id) ?? Promise.resolve(savedReservationIdFor(id));
}

/**
 * 이 예약의 서버 번호가 정해진 뒤 보낸다. 만들기가 실패했으면 보내지 않는다(서버엔 그 예약이 없다).
 * 같은 예약의 요청은 **차례대로** 보낸다 — 한꺼번에 내보내면 '결제 저장 → 취소' 가 거꾸로 처리돼 취소가 풀리고
 * 돌려준 쿠폰·적립금과 어긋난다.
 */
function afterReservationSaved(id: number, send: (savedId: number) => Promise<unknown> | void): void {
    if (failedReservationIds.has(id) && !isListedReservationId(id)) return;
    const base = reservationQueues.get(id) ?? Promise.resolve(savedReservationIdFor(id));
    const queued = base.then(async (savedId) => {
        if (savedId != null) await Promise.resolve(send(savedId)).catch(() => {});
        return savedId;
    });
    trackSaving(id, queued);
}

// 끝나면 지운다 — 남겨 두면 나중에 같은 번호를 쓰는 다른 예약의 요청까지 붙잡는다.
function trackSaving(id: number, promise: Promise<number | null>): void {
    reservationQueues.set(id, promise);
    void promise.finally(() => {
        if (reservationQueues.get(id) === promise) reservationQueues.delete(id);
    });
}

interface ServerPointRefund {
    customerId: number;
    balance: number;
    history: PointHistoryEntry;
}

/** 서버가 취소·삭제 트랜잭션에서 돌려준 적립금을 화면에 맞춘다 — 이력은 서버 id 라 다음 저장 때 다시 만들지 않는다. */
function applyServerPointRefund(refund: ServerPointRefund | null | undefined): void {
    if (!refund) return;
    useCalendarStore.setState((state) => {
        const customer = state.customerMap[refund.customerId];
        if (!customer) return state;
        return {
            customerMap: {
                ...state.customerMap,
                [refund.customerId]: {...customer, points: refund.balance, pointHistories: [...(customer.pointHistories ?? []), refund.history]},
            },
        };
    });
}

/** 취소·삭제 요청을 보내고, 서버가 돌려준 적립금을 반영한 뒤에 바뀐 고객(첫 방문일 등)을 저장한다. */
function sendReservationRemoval(id: number, init: (savedId: number) => RequestInit, failMessage: string, prevCustomerMap: CustomerMap): void {
    afterReservationSaved(id, async (savedId) => {
        try {
            const response = await fetch('/api/reservations', init(savedId));
            if (!response.ok) throw new Error(String(response.status));
            const data = await response.json().catch(() => null) as {pointRefund?: ServerPointRefund | null} | null;
            applyServerPointRefund(data?.pointRefund);
        } catch (error) {
            console.error('[sync] 예약 취소·삭제 실패:', error);
            useToastStore.getState().show(failMessage, 'error');
        } finally {
            // 고객 저장(PUT)은 적립금을 절대값으로 쓴다 — 서버가 돌려준 뒤에 보내야 그 적립금을 덮지 않는다.
            syncChangedCustomers(prevCustomerMap, useCalendarStore.getState().customerMap);
        }
    });
}

/** 게스트 모드: 결제한 예약이 취소·삭제되면 쓴 적립금은 돌려주고 쌓인 적립금은 회수한다(로그인은 서버가 한다). */
function refundPointsOnCancel(reservation: Reservation): void {
    const delta = pointRefundOnCancel(reservation);
    if (delta === 0) return;
    const {customerMap, updateCustomer} = useCalendarStore.getState();
    const customer = customerMap[reservation.customerId];
    if (!customer || customer.deleted) return;
    updateCustomer(customer.id, {points: Math.max((customer.points ?? 0) + delta, 0)}, {
        type: 'payment_adjust',
        delta,
        description: delta > 0 ? '예약 취소 — 결제에 쓴 적립금 반환' : '예약 취소 — 결제 적립금 회수',
        relatedReservationId: reservation.id,
    });
}

function syncChangedCustomers(prev: CustomerMap, next: CustomerMap): void {
    const changed = Object.values(next).filter((c) => {
        const before = prev[c.id];
        return !before || before.firstVisitDate !== c.firstVisitDate;
    });
    if (changed.length > 0) syncCustomerSettings(changed);
}

/** 월·년 뷰에 들어갔을 때 기본으로 열어 둘 목록 — 오늘 / 이번 달. 그 밖의 뷰는 목록이 없다. */
function defaultListFilter(viewType: string | null, today: FullType): CalendarState['reservationListFilter'] {
    if (!today) return null;
    if (viewType === ViewType.Month) {
        return {type: 'date', dateKey: toDateKey(today.getFullYear(), today.getMonth(), today.getDate())};
    }
    if (viewType === ViewType.Year) {
        return {type: 'month', year: today.getFullYear(), month: today.getMonth()};
    }
    return null;
}

/** 달력을 옮기면 목록도 따라간다 — 11월 달력 옆에 10월 13일 목록이 떠 있으면 어느 칸의
 *  목록인지 짚을 수 없다. 그렇다고 **닫지는 않는다**: 목록은 월·연 뷰에서 늘 열려 있는 자리라
 *  사라지면 데스크톱 레이아웃이 기둥(row) 에서 전폭(column) 으로 튀고, 한 번 비면 돌아오지 않는다. */
function filterWithinTarget(
    filter: CalendarState['reservationListFilter'],
    target: Date,
): CalendarState['reservationListFilter'] {
    if (!filter) return null;
    // 연 뷰: 고른 달은 그대로 두고 연도만 따라간다.
    if (filter.type === 'month') return {type: 'month', year: target.getFullYear(), month: filter.month};
    const targetMonth = toDateKey(target.getFullYear(), target.getMonth(), 1).slice(0, 7);
    if (filter.dateKey.startsWith(targetMonth)) return filter;
    // 달을 벗어났으면 그 달의 1일로 — 옮긴 달의 시작이 가장 덜 놀랍다.
    return {type: 'date', dateKey: toDateKey(target.getFullYear(), target.getMonth(), 1)};
}

export const useCalendarStore = create<CalendarState>((set) => ({
    today: null,
    target: {
        full    : null,
        fullYear: 0,
        month   : 0,
        date    : 0,
        day     : 0
    },
    aside: {
        isVisible: false,
    },
    view: {
        type: 'month'
    },
    router: {
        arrayRouter   : [],
        isRootPath    : false,
        isCalendarPath: false
    },
    reservationMap: {},
    customerMap: {},
    selectedReservation: null,
    selectedReservations: [],
    reservationHistory: [],
    reservationListFilter: null,
    createReservationInitial: null,
    selectedCustomerId: null,
    calendarAssigneeId: null,
    serviceCatalog: [],
    categoryBaseColorMap: CATEGORY_BASE_COLOR_MAP,
    assignees: [],
    storeName: '',
    storeNameI18n: null,
    shopType: null,
    usePointSystem: false,
    useMembershipSystem: false,
    useCouponSystem: false,
    useOnlineBooking: false,
    naverBookingEnabled: false,
    storeSettings: DEFAULT_STORE_SETTINGS,
    syncNotifications: [],

    // 첫 진입에서만 기본 목록을 잡는다 — 그때 today 가 setView 보다 늦게 들어온다.
    // setToday 는 라우트가 바뀔 때마다 불리므로(LayoutComponent), 매번 잡으면
    // 사용자가 닫은 목록이 달을 옮길 때마다 되살아난다.
    setToday: (today) => set((state) => (
        state.today
            ? {today}
            : {today, reservationListFilter: state.reservationListFilter ?? defaultListFilter(state.view.type, today)}
    )),

    setTarget: (partial) =>
        set((state) => ({
            target: {...state.target, ...partial}
        })),

    setTargetFromDate: (value) => {
        const target = new Date(value);
        set((state) => ({
            target: {
                full    : target,
                fullYear: target.getFullYear(),
                month   : target.getMonth(),
                date    : target.getDate(),
                day     : target.getDay()
            },
            reservationListFilter: filterWithinTarget(state.reservationListFilter, target)
        }));
    },

    setAside: (v) =>
        set((state) => {
            const next = typeof v === 'function' ? v(state.aside) : v;
            if (typeof window !== 'undefined') {
                localStorage.setItem('aside-visible', String(next.isVisible));
            }
            return {aside: next};
        }),

    setView: (v) =>
        set((state) => {
            const view = typeof v === 'function' ? v(state.view) : v;
            if (view.type === state.view.type) return {view};

            // 뷰가 바뀌면 목록을 다시 잡는다. 월·년은 들어가자마자 오늘(이번 달)이 열려 있어야 하고,
            // 주·일은 목록 개념이 없다 — 그대로 두면 월에서 고른 날짜가 따라와 엉뚱한 기간이 뜬다.
            return {view, reservationListFilter: defaultListFilter(view.type, state.today)};
        }),

    setRouterSlice: (v) =>
        set((state) => ({
            router: typeof v === 'function' ? v(state.router) : v
        })),

    // 이 세터들은 서버/로컬에서 "로드한" 데이터를 스토어에 반영하는 용도다.
    // 과거엔 부작용으로 syncCustomerSettings(전체 고객 upsert PUT)를 호출했는데,
    // 이 때문에 병합으로 서버에서 삭제한 source 고객이 stale 목록 PUT으로 되살아나는
    // 버그가 있었다(예약은 옮겨지고 빈 고객만 남음). 로드 시엔 다시 PUT하지 않는다.
    // 실제 고객 변경(addReservation/addCustomer/updateCustomer 등)은 각자 직접 동기화한다.
    setReservationMap: (reservationMap) =>
        set((state) => {
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, reservationMap);
            return {reservationMap, customerMap: nextCustomerMap};
        }),

    setCustomerMap: (customerMap) =>
        set((state) => {
            const nextCustomerMap = syncCustomerFirstVisitDates(customerMap, state.reservationMap);
            return {customerMap: nextCustomerMap};
        }),

    addCustomer: (customer) => {
        let toSync: Customer[] | null = null;
        set((state) => {
            const nextCustomerMap = {
                ...state.customerMap,
                [customer.id]: customer
            };
            const normalizedCustomerMap = syncCustomerFirstVisitDates(nextCustomerMap, state.reservationMap);
            if (Object.keys(normalizedCustomerMap).length > 0) {
                toSync = Object.values(normalizedCustomerMap);
            }
            return {customerMap: normalizedCustomerMap};
        });
        // 단건 저장(빠름) + await 가능 → 신규 고객을 서버에 먼저 만든 뒤 예약 POST.
        if (!toSync) return Promise.resolve(customer.id);
        // 그 사이 목록을 다시 받아 같은 번호에 서버 고객이 들어왔으면 그건 남의 고객이다 — 건드리지 않는다.
        const isOurs = (c: Customer | undefined) => !!c && c.name === customer.name && c.tel === customer.tel;
        return persistNewCustomer(customer, toSync).then((savedId) => {
            if (savedId == null) {
                // 확정되지 않은 번호를 화면에 남기면 다음 저장(PUT)이 그 번호의 다른 고객을 덮어쓴다.
                set((state) => {
                    if (!isOurs(state.customerMap[customer.id])) return state;
                    const nextCustomerMap = {...state.customerMap};
                    delete nextCustomerMap[customer.id];
                    return {customerMap: nextCustomerMap};
                });
                return null;
            }
            // 화면이 매긴 번호가 이미 다른 고객(네이버 동기화·온라인 예약이 먼저 씀)이면 서버가 새 번호를 준다 → 옮긴다.
            if (savedId !== customer.id) {
                set((state) => {
                    const nextCustomerMap = {...state.customerMap};
                    const local = state.customerMap[customer.id];
                    if (isOurs(local)) delete nextCustomerMap[customer.id];
                    nextCustomerMap[savedId] = {...(isOurs(local) ? local : customer), id: savedId};
                    return {customerMap: nextCustomerMap};
                });
            }
            return savedId;
        });
    },

    updateCustomer: (customerId, patch, pointHistory) =>
        set((state) => {
            const currentCustomer = state.customerMap[customerId];
            if (!currentCustomer) return state;

            const pointHistories = Array.isArray(pointHistory)
                ? pointHistory
                : pointHistory
                    ? [pointHistory]
                    : [];
            const customerWithHistory = pointHistories.length > 0
                ? appendPointHistories(currentCustomer, pointHistories)
                : currentCustomer;
            const nextCustomer = {
                ...customerWithHistory,
                ...patch,
            };

            const nextCustomerMap = {
                ...state.customerMap,
                [customerId]: nextCustomer,
            };
            const normalizedCustomerMap = syncCustomerFirstVisitDates(nextCustomerMap, state.reservationMap);
            // 수정된 고객 1명만 저장 (전체 목록 PUT 대신). 단건 PUT이라 메모태그·포인트이력도 처리됨.
            const editedCustomer = normalizedCustomerMap[customerId];
            if (editedCustomer) {
                syncCustomerSettings([editedCustomer]);
            }
            return {customerMap: normalizedCustomerMap};
        }),

    deleteCustomer: (customerId) => {
        set((state) => {
            const target = state.customerMap[customerId];
            if (!target) return {};
            // 서버와 같은 익명 처리 — 고객은 "삭제된 고객"으로 남기고(맵에서 빼면 새 고객 번호가 재사용된다),
            // 예약(시술 내역·매출)은 남기되 메모·네이버 링크만 비운다.
            const nextReservationMap: ReservationMap = {};
            for (const [date, list] of Object.entries(state.reservationMap)) {
                nextReservationMap[date] = list.map((r) => (r.customerId === customerId ? anonymizeCustomerReservation(r) : r));
            }
            return {
                customerMap: {...state.customerMap, [customerId]: anonymizeCustomer(target)},
                reservationMap: nextReservationMap,
            };
        });
        deleteCustomerOnServer(customerId);
    },

    setSelectedReservation: (selectedReservation) => set({selectedReservation}),

    setSelectedReservations: (selectedReservations) => set({
        selectedReservations,
        selectedReservation: selectedReservations[selectedReservations.length - 1] ?? null,
    }),

    openReservationDetail: (selectedReservation) =>
        set((state) => buildOpenedReservationState(
            state,
            resolveLatestReservation(state.reservationMap, selectedReservation).id
        )),

    openReservationDetailFromCustomer: (selectedReservation) =>
        set((state) => buildOpenedReservationState(
            state,
            resolveLatestReservation(state.reservationMap, selectedReservation).id
        )),

    closeReservationDetail: (layerIndex) =>
        set((state) => buildClosedReservationState(state, layerIndex)),

    setReservationHistory: (reservationHistory) => set({reservationHistory}),

    setReservationListFilter: (reservationListFilter) => set({reservationListFilter}),

    setCreateReservationInitial: (createReservationInitial) => set({createReservationInitial}),

    setSelectedCustomerId: (selectedCustomerId) => set({selectedCustomerId}),

    openCustomerDetail: (selectedCustomerId) =>
        set({
            selectedCustomerId,
            createReservationInitial: null,
        }),

    setCalendarAssigneeId: (calendarAssigneeId) => set({calendarAssigneeId}),

    setServiceCatalog: (serviceCatalog) => set({serviceCatalog}),
    setCategoryBaseColorMap: (categoryBaseColorMap) => set({categoryBaseColorMap}),
    setAssignees: (assignees) => set({assignees}),
    setStoreInfo: (storeName, shopType, storeNameI18n) => set(storeNameI18n !== undefined ? {storeName, shopType, storeNameI18n} : {storeName, shopType}),
    updateStoreInfo: (storeName, shopType, storeNameI18n) => {
        set(storeNameI18n !== undefined ? {storeName, shopType, storeNameI18n} : {storeName, shopType});
        syncStoreInfo(storeName, shopType, storeNameI18n);
    },
    setStoreFeatures: (features) => set(features),
    updateStoreFeatures: (patch) => {
        set(patch);
        syncStoreFeatures(patch);
    },
    setStoreSettings: (storeSettings) => set({storeSettings}),

    updateStoreBusinessHours: (hours) =>
        set((state) => {
            const nextStoreSettings = buildUpdatedStoreBusinessHoursState(state.storeSettings, hours);
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    updateStorePointSettings: (pointSettings) =>
        set((state) => {
            const nextStoreSettings = buildUpdatedStorePointSettingsState(state.storeSettings, pointSettings);
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    updateStoreClosedDates: (dates) =>
        set((state) => {
            const nextStoreSettings = buildUpdatedStoreClosedDatesState(state.storeSettings, dates);
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    updateStoreClosedWeekdays: (weekdays) =>
        set((state) => {
            const nextStoreSettings = buildUpdatedStoreClosedWeekdaysState(state.storeSettings, weekdays);
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    addStoreClosedDate: (date) =>
        set((state) => {
            const nextStoreSettings = buildAddedStoreClosedDateState(state.storeSettings, date);
            if (!nextStoreSettings) return state;
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    removeStoreClosedDate: (date) =>
        set((state) => {
            const nextStoreSettings = buildRemovedStoreClosedDateState(state.storeSettings, date);
            if (!nextStoreSettings) return state;
            syncStoreSettings(nextStoreSettings);
            return {storeSettings: nextStoreSettings};
        }),

    addAssignee: (name, status = '재직', phone = '', note = '', color) =>
        set((state) => {
            const nextAssignees = buildAddedAssigneeState(state.assignees, name, status, phone, note, color);
            if (!nextAssignees) return state;

            syncAssigneeSettings(nextAssignees);
            return {assignees: nextAssignees};
        }),

    updateAssignee: (assigneeId, patch) =>
        set((state) => {
            const nextAssignees = buildUpdatedAssigneeState(state.assignees, assigneeId, patch);
            syncAssigneeSettings(nextAssignees);
            return {assignees: nextAssignees};
        }),

    updateAssigneeDay: (assigneeId, dayIndex, patch) =>
        set((state) => {
            const nextAssignees = buildUpdatedAssigneeDayState(state.assignees, assigneeId, dayIndex, patch);
            if (!nextAssignees) return state;
            syncAssigneeSettings(nextAssignees);
            return {assignees: nextAssignees};
        }),

    deleteAssignee: (assigneeId) => {
        set((state) => {
            const nextAssignees = buildDeletedAssigneeState(state.assignees, assigneeId);
            // 분리 삭제: 이 담당자의 예약은 보존하되 미지정(assigneeId=null)으로 전환
            const nextReservationMap: ReservationMap = {};
            for (const [date, list] of Object.entries(state.reservationMap)) {
                nextReservationMap[date] = list.map((r) =>
                    r.assigneeId === assigneeId ? {...r, assigneeId: undefined} : r
                );
            }
            return {assignees: nextAssignees, reservationMap: nextReservationMap};
        });
        deleteAssigneeOnServer(assigneeId);
    },

    updateCategoryBaseColor: (category, color) =>
        set((state) => {
            if (state.categoryBaseColorMap[category] === color) return state;

            const nextCategoryBaseColorMap = {
                ...state.categoryBaseColorMap,
                [category]: color
            };
            return withSyncedCategoryColors(state, nextCategoryBaseColorMap);
        }),

    addService: (item) =>
        set((state) => {
            const nextCatalog = buildAddedServiceState(state.serviceCatalog, item);
            return withSyncedCatalog(state, nextCatalog);
        }),

    updateService: (name, updated) => {
        const {serviceCatalog: prevCatalog, reservationMap, reservationHistory} = useCalendarStore.getState();
        const nextCatalog = buildUpdatedServiceState(prevCatalog, name, updated);
        const {nextReservationMap, updates} = buildServiceCatalogReservationUpdates(
            reservationMap, name, updated.name, prevCatalog, nextCatalog,
        );

        set((state) => {
            const synced = withSyncedCatalog(state, nextCatalog);
            return updates.length > 0
                ? {...synced, reservationMap: nextReservationMap}
                : synced;
        });

        // 변경된 예약 영속화: 로컬 모드는 스냅샷, 원격은 일괄 PUT 1회(서버가 한 트랜잭션으로 처리).
        // 과거: 변경 건마다 개별 PUT 동시 발사 + 무음 실패 → 풀 고갈·Slack 도배·부분 유실.
        if (updates.length > 0) {
            syncReservationState(nextReservationMap, reservationHistory);
            if (!shouldUseLocalDb()) {
                fetch('/api/reservations', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({updates}),
                })
                    .then((res) => {
                        if (res.ok) return;
                        console.error('[updateService] 예약 일괄 갱신 실패:', res.status);
                        useToastStore.getState().show(
                            '서비스 변경을 예약에 반영하지 못했습니다. 새로고침 후 다시 확인해 주세요.', 'error');
                    })
                    .catch((err) => {
                        console.error('[updateService] 예약 일괄 갱신 요청 실패:', err);
                        useToastStore.getState().show(
                            '서비스 변경을 예약에 반영하지 못했습니다. 새로고침 후 다시 확인해 주세요.', 'error');
                    });
            }
        }

        return updates.length;
    },

    deleteService: (name) =>
        set((state) => {
            const nextCatalog = buildDeletedServiceState(state.serviceCatalog, name);
            return withSyncedCatalog(state, nextCatalog);
        }),

    renameCategory: (prevCategory, nextCategory) =>
        set((state) => {
            const nextState = buildRenamedCategoryState(
                state.serviceCatalog,
                state.categoryBaseColorMap,
                prevCategory,
                nextCategory
            );
            if (!nextState) return state;

            syncServiceSettings(nextState.serviceCatalog, nextState.categoryBaseColorMap);
            return nextState;
        }),

    moveCategory: (dragCategory, targetCategory) =>
        set((state) => {
            const nextCatalog = buildMovedCategoryState(state.serviceCatalog, dragCategory, targetCategory);
            if (!nextCatalog) return state;
            return withSyncedCatalog(state, nextCatalog);
        }),

    moveServiceInCategory: (dragName, targetName) =>
        set((state) => {
            const nextCatalog = buildMovedServiceInCategoryState(state.serviceCatalog, dragName, targetName);
            if (!nextCatalog) return state;
            return withSyncedCatalog(state, nextCatalog);
        }),

    addReservation: (reservation) => {
        let nextReservationMap: ReservationMap | null = null;

        set((state) => {
            const nextMap = buildAddedReservationMap(state.reservationMap, reservation);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            nextReservationMap = nextMap;
            syncChangedCustomers(state.customerMap, nextCustomerMap);
            return {reservationMap: nextMap, customerMap: nextCustomerMap, createReservationInitial: null};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, useCalendarStore.getState().reservationHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        const saving = fetch('/api/reservations', jsonRequest('POST', reservation))
            .then(async (response) => {
                if (!response.ok) throw new Error(String(response.status));
                const data = await response.json().catch(() => null) as {reservation?: Reservation} | null;
                const savedId = data?.reservation?.id ?? reservation.id;
                savedReservationIds.set(reservation.id, savedId);
                // 번호가 겹쳐 서버가 새 번호로 만들었으면 화면의 예약 번호도 옮긴다(그 사이 날짜를 옮겼어도 찾는다).
                if (savedId !== reservation.id) {
                    const remap = (id: number) => (id === reservation.id ? savedId : id);
                    set((state) => ({
                        reservationMap: mapReservationIds(state.reservationMap, reservation.id, savedId),
                        // 열려 있는 상세·결제 레이어는 번호로 예약을 찾는다 — 같이 옮겨야 닫히지 않는다.
                        selectedReservation: state.selectedReservation == null ? null : remap(state.selectedReservation),
                        selectedReservations: state.selectedReservations.map(remap),
                        reservationHistory: state.reservationHistory.map((entry) => (entry.reservationId === reservation.id
                            ? {...entry, reservationId: savedId, before: {...entry.before, id: savedId}, after: {...entry.after, id: savedId}}
                            : entry)),
                    }));
                }
                return savedId;
            })
            .catch((error) => {
                console.error('[sync] POST /api/reservations 실패:', error);
                // 확정 안 된 번호를 화면에 남기면 이후 수정이 그 번호의 다른 예약을 덮는다 — 화면에서도 빼고,
                // 열려 있던 레이어도 닫고, 그 번호로는 더 보내지 않는다.
                failedReservationIds.add(reservation.id);
                set((state) => ({
                    reservationMap: mapReservationIds(state.reservationMap, reservation.id, null),
                    selectedReservation: state.selectedReservation === reservation.id ? null : state.selectedReservation,
                    selectedReservations: state.selectedReservations.filter((id) => id !== reservation.id),
                }));
                // 응답만 못 받고 서버엔 들어갔을 수 있다 — 바로 다시 등록하면 둘이 된다. 새로고침으로 확인하게 한다.
                useToastStore.getState().show('예약 저장을 확인하지 못해 화면에서 뺐습니다. 새로고침해서 있는지 먼저 확인해 주세요.', 'error');
                return null;
            });
        trackSaving(reservation.id, saving);
    },

    updateReservation: (prevInput, updatedInput) => {
        const prev = withSavedReservationId(prevInput);
        const updated = withSavedReservationId(updatedInput);
        if (updated.status === 'completed' && !hasCompletedPayment(updated)) {
            return;
        }

        let nextReservationMap: ReservationMap | null = null;
        let nextHistory: ReservationHistoryEntry[] = [];

        set((state) => {
            const nextState = buildUpdatedReservationState(state, prev, updated);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextState.reservationMap);
            nextReservationMap = nextState.reservationMap;
            nextHistory = nextState.reservationHistory;
            syncChangedCustomers(state.customerMap, nextCustomerMap);
            return {...nextState, customerMap: nextCustomerMap};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, nextHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        afterReservationSaved(prev.id, (savedId) => fetch('/api/reservations', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prev: {...prev, id: savedId}, updated: {...updated, id: savedId}}),
        })
            .then(async (response) => {
                if (!response.ok) {
                    console.error('[updateReservation] 저장 실패:', response.status, response.statusText);
                    useToastStore.getState().show(
                        '예약 수정 저장에 실패했습니다. 새로고침 후 다시 확인해 주세요.', 'error');
                    return null;
                }
                return response.json() as Promise<{reservation?: Reservation}>;
            })
            .then((data) => {
                const savedReservation = data?.reservation;
                if (!savedReservation) return;
                // 응답이 오는 사이 취소 등으로 상태가 바뀌었으면 옛 응답으로 덮지 않는다(다음 요청 응답이 맞춘다).
                const current = Object.values(useCalendarStore.getState().reservationMap).flat().find((item) => item.id === savedId);
                if (current && current.status !== updated.status) return;

                set((state) => {
                    const nextMap = {...state.reservationMap};
                    const oldKey = prev.date;
                    const newKey = savedReservation.date;

                    if (nextMap[oldKey]) {
                        nextMap[oldKey] = nextMap[oldKey].filter((reservation) => reservation.id !== savedId);
                        if (nextMap[oldKey].length === 0) delete nextMap[oldKey];
                    }

                    if (!nextMap[newKey]) nextMap[newKey] = [];
                    const existingIndex = nextMap[newKey].findIndex((reservation) => reservation.id === savedReservation.id);
                    if (existingIndex > -1) {
                        nextMap[newKey][existingIndex] = savedReservation;
                    } else {
                        nextMap[newKey].push(savedReservation);
                    }

                    return {
                        reservationMap: nextMap,
                        selectedReservation: state.selectedReservation === savedReservation.id
                            ? savedReservation.id
                            : state.selectedReservation,
                        selectedReservations: state.selectedReservations,
                    };
                });
            })
            .catch((error) => {
                // 낙관적 로컬 상태는 되돌리지 않는다. 되돌리면 방금 고친 내용이 사라진다.
                // 대신 서버에 안 들어갔다는 사실을 알린다.
                console.error('[updateReservation] 저장 요청 실패:', error);
                useToastStore.getState().show(
                    '예약 수정 저장에 실패했습니다. 새로고침 후 다시 확인해 주세요.', 'error');
            }));
    },

    cancelReservation: (reservationInput, status = 'cancelled', reason) => {
        const reservation = withSavedReservationId(reservationInput);
        // 취소면 쓴 쿠폰·회원권·적립금을 돌려주고 결제를 비운다(서버 PATCH 와 같은 결과) — 남기면 복원 뒤 다시 취소할 때 또 돌려준다.
        const updated: Reservation = status === 'cancelled' && reservation.status !== 'cancelled'
            ? {...reservation, status, paymentEntries: [], paymentCompleted: false, paymentMethod: undefined, pointEarned: 0, usedCoupon: undefined, usedMembership: undefined}
            : {...reservation, status};

        let nextReservationMap: ReservationMap | null = null;
        let nextHistory: ReservationHistoryEntry[] = [];
        let prevCustomerMap: CustomerMap = {};

        set((state) => {
            const nextState = buildCancelledReservationState(state, reservation, updated);
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextState.reservationMap);
            nextReservationMap = nextState.reservationMap;
            nextHistory = nextState.reservationHistory;
            prevCustomerMap = state.customerMap;
            return {...nextState, customerMap: nextCustomerMap};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, nextHistory);
        }

        if (shouldUseLocalDb()) {
            syncChangedCustomers(prevCustomerMap, useCalendarStore.getState().customerMap);
            if (status === 'cancelled') refundPointsOnCancel(reservation);
            return;
        }

        sendReservationRemoval(reservation.id, (savedId) => jsonRequest('PATCH', {id: savedId, status, ...(reason ? {reason} : {})}),
            '예약 상태 변경이 서버에 반영되지 않았습니다. 새로고침 후 다시 시도해 주세요.', prevCustomerMap);
    },

    restoreReservation: (reservationInput) => {
        const reservation = withSavedReservationId(reservationInput);
        const updated: Reservation = {...reservation, status: 'active'};

        let nextReservationMap: ReservationMap | null = null;
        let nextHistory: ReservationHistoryEntry[] = [];

        set((state) => {
            const reservations = state.reservationMap[reservation.date] ?? [];
            const nextDateReservations = reservations.map((r) =>
                r.id === reservation.id ? updated : r
            );
            const nextMap = {...state.reservationMap, [reservation.date]: nextDateReservations};
            const historyEntry: ReservationHistoryEntry = {
                reservationId: reservation.id,
                before: reservation,
                after: updated,
                timestamp: new Date().toISOString(),
            };
            nextHistory = [...state.reservationHistory, historyEntry];
            nextReservationMap = nextMap;
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            syncChangedCustomers(state.customerMap, nextCustomerMap);
            return {
                reservationMap: nextMap,
                reservationHistory: nextHistory,
                customerMap: nextCustomerMap,
            };
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, nextHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        afterReservationSaved(reservation.id, (savedId) => requestServerSync('/api/reservations', jsonRequest('PATCH', {id: savedId, status: 'active'}),
            '예약 복원이 서버에 반영되지 않았습니다. 새로고침 후 다시 시도해 주세요.'));
    },

    deleteReservation: (reservationInput) => {
        const reservation = withSavedReservationId(reservationInput);
        let nextReservationMap: ReservationMap | null = null;
        let prevCustomerMap: CustomerMap = {};

        set((state) => {
            const dateReservations = state.reservationMap[reservation.date] ?? [];
            const nextDateReservations = dateReservations.filter((r) => r.id !== reservation.id);
            const nextMap = {...state.reservationMap, [reservation.date]: nextDateReservations};
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            nextReservationMap = nextMap;
            prevCustomerMap = state.customerMap;
            return {reservationMap: nextMap, customerMap: nextCustomerMap};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, useCalendarStore.getState().reservationHistory);
        }

        if (shouldUseLocalDb()) {
            syncChangedCustomers(prevCustomerMap, useCalendarStore.getState().customerMap);
            refundPointsOnCancel(reservation);
            return;
        }

        sendReservationRemoval(reservation.id, (savedId) => jsonRequest('DELETE', {id: savedId}),
            '예약 삭제가 서버에 반영되지 않았습니다. 새로고침 후 다시 시도해 주세요.', prevCustomerMap);
    },

    addSyncNotifications: (items) =>
        set((state) => {
            const existingIds = new Set(state.syncNotifications.map((n) => n.id));
            const existingConflictKeys = new Set(
                state.syncNotifications.filter((n) => n.conflictKey).map((n) => n.conflictKey)
            );
            const newItems = items.filter((item) => {
                if (existingIds.has(item.id)) return false;
                if (item.conflictKey && existingConflictKeys.has(item.conflictKey)) return false;
                return true;
            });
            if (newItems.length === 0) return {};

            // 취소 알림이 추가될 때, 같은 bookingId의 기존 확정 알림을 읽음 처리
            const cancelledBookingIds = new Set(
                newItems.filter((n) => n.type === 'cancel').map((n) => n.bookingId)
            );
            const existing = cancelledBookingIds.size > 0
                ? state.syncNotifications.map((n) =>
                    !n.type && cancelledBookingIds.has(n.bookingId) ? {...n, read: true} : n
                )
                : state.syncNotifications;

            const next = [...newItems, ...existing].slice(0, 50);
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    markSyncNotificationRead: (id) =>
        set((state) => {
            const next = state.syncNotifications.map((n) => n.id === id ? {...n, read: true} : n);
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    markSyncNotificationsRead: () =>
        set((state) => {
            const next = state.syncNotifications.map((n) =>
                n.type === 'conflict' && n.conflictStatus === 'deferred' ? n : {...n, read: true}
            );
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    updateConflictNotificationStatus: (conflictKey, status, resolvedBy, resolution) =>
        set((state) => {
            const next = state.syncNotifications.map((notification) => {
                if (notification.conflictKey !== conflictKey) return notification;
                return {
                    ...notification,
                    conflictStatus: status,
                    ...(status === 'confirmed'
                        ? {
                            read: true,
                            resolvedBy: resolvedBy ?? notification.resolvedBy ?? 'manual',
                            resolvedAt: notification.resolvedAt ?? new Date().toISOString(),
                            ...(resolution?.reason ? {resolutionReason: resolution.reason} : {}),
                            ...(resolution?.memo ? {resolutionMemo: resolution.memo} : {}),
                        }
                        : {}),
                };
            });
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    replaceMockConflictNotifications: (items) =>
        set((state) => {
            const preserved = state.syncNotifications.filter((notification) => notification.type !== 'conflict');
            const next = [...items, ...preserved].slice(0, 50);
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),

    clearSyncNotifications: () => {
        saveSyncNotifications([]);
        set({syncNotifications: []});
    },

    initSyncNotifications: () => {
        set({syncNotifications: loadSyncNotifications()});
    },

    // 알림에 박제된 고객명·담당자명을 현재 데이터와 동기화한다.
    // 빈 값 보정뿐 아니라 '이름 변경'도 반영(현재 이름과 다르면 갱신).
    patchNotificationNames: () =>
        set((state) => {
            const assigneeById = new Map(state.assignees.map((d) => [d.id, d.name]));
            const allReservations = Object.values(state.reservationMap).flat();

            let changed = false;
            const next = state.syncNotifications.map((n) => {
                const reservation = allReservations.find((r) => r.id === n.reservationId);
                if (!reservation) return n;
                const customer = state.customerMap[reservation.customerId];
                const patch: Partial<typeof n> = {};
                // 고객명: 현재 고객명과 다르면 갱신(빈 값·플레이스홀더 보정 + 이름 변경 반영).
                // 고객을 못 찾으면 기존 스냅샷 유지(빈 값으로 덮지 않음).
                if (customer?.name && n.customerName !== customer.name) patch.customerName = customer.name;
                if (!n.appointmentDate && reservation.date) patch.appointmentDate = reservation.date;
                if (!n.appointmentTime && reservation.startTime) patch.appointmentTime = reservation.startTime;
                // 담당자명: 배정 담당자의 현재 이름과 다르면 갱신, 미배정이면 '미지정'.
                // 담당자 목록이 아직 안 들어왔으면(name 미해석) 기존 값 유지.
                if (reservation.assigneeId) {
                    const name = assigneeById.get(reservation.assigneeId);
                    if (name && n.assigneeName !== name) patch.assigneeName = name;
                } else if (n.assigneeName !== '미지정') {
                    patch.assigneeName = '미지정';
                }
                if (Object.keys(patch).length === 0) return n;
                changed = true;
                return {...n, ...patch};
            });
            if (!changed) return {};
            saveSyncNotifications(next);
            return {syncNotifications: next};
        }),
}));
