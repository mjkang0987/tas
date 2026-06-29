import {create} from 'zustand';

import type {Reservation, ReservationMap, ReservationHistoryEntry, ReservationStatus} from '../utils/reservations';
import {hasCompletedPayment} from '../utils/reservations';
import type {Customer, CustomerMap} from '../utils/customers';
import type {PointHistoryEntry} from '../utils/customers';
import {appendPointHistories, syncCustomerFirstVisitDates} from '../utils/customers';
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
} from './calendarStoreHelpers';
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
    shopType: string | null;
    usePointSystem: boolean;
    useMembershipSystem: boolean;
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
    addCustomer: (customer: Customer) => Promise<void>;
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
    setStoreInfo: (name: string, type: string | null) => void;
    updateStoreInfo: (name: string, type: string | null) => void;
    setStoreFeatures: (usePointSystem: boolean, useMembershipSystem: boolean) => void;
    updateStoreFeatures: (patch: {usePointSystem?: boolean; useMembershipSystem?: boolean}) => void;
    setStoreSettings: (storeSettings: StoreSettings) => void;
    updateStoreBusinessHours: (hours: Partial<StoreSettings['businessHours']>) => void;
    updateStorePointSettings: (pointSettings: Partial<StoreSettings['pointSettings']>) => void;
    updateStoreClosedDates: (dates: string[]) => void;
    addStoreClosedDate: (date: string) => void;
    removeStoreClosedDate: (date: string) => void;
    addAssignee: (name: string, status?: AssigneeStatus, phone?: string, note?: string, color?: string) => void;
    updateAssignee: (assigneeId: number, patch: Partial<Pick<Assignee, 'name' | 'status' | 'phone' | 'note' | 'color'>>) => void;
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
    cancelReservation: (reservation: Reservation, status?: ReservationStatus) => void;
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
function syncChangedCustomers(prev: CustomerMap, next: CustomerMap): void {
    const changed = Object.values(next).filter((c) => {
        const before = prev[c.id];
        return !before || before.firstVisitDate !== c.firstVisitDate;
    });
    if (changed.length > 0) syncCustomerSettings(changed);
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
        type: 'week'
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
    shopType: null,
    usePointSystem: false,
    useMembershipSystem: false,
    storeSettings: DEFAULT_STORE_SETTINGS,
    syncNotifications: [],

    setToday: (today) => set({today}),

    setTarget: (partial) =>
        set((state) => ({
            target: {...state.target, ...partial}
        })),

    setTargetFromDate: (value) => {
        const target = new Date(value);
        set({
            target: {
                full    : target,
                fullYear: target.getFullYear(),
                month   : target.getMonth(),
                date    : target.getDate(),
                day     : target.getDay()
            }
        });
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
        set((state) => ({
            view: typeof v === 'function' ? v(state.view) : v
        })),

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
        return toSync ? persistNewCustomer(customer, toSync) : Promise.resolve();
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
            const nextCustomerMap = {...state.customerMap};
            delete nextCustomerMap[customerId];
            // 서버 cascade와 일치하도록 그 고객의 예약도 로컬에서 제거
            const nextReservationMap: ReservationMap = {};
            for (const [date, list] of Object.entries(state.reservationMap)) {
                nextReservationMap[date] = list.filter((r) => r.customerId !== customerId);
            }
            return {customerMap: nextCustomerMap, reservationMap: nextReservationMap};
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
    setStoreInfo: (storeName, shopType) => set({storeName, shopType}),
    updateStoreInfo: (storeName, shopType) => {
        set({storeName, shopType});
        syncStoreInfo(storeName, shopType);
    },
    setStoreFeatures: (usePointSystem, useMembershipSystem) => set({usePointSystem, useMembershipSystem}),
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
                        if (!res.ok) console.error('[updateService] 예약 일괄 갱신 실패:', res.status);
                    })
                    .catch((err) => console.error('[updateService] 예약 일괄 갱신 요청 실패:', err));
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

        fetch('/api/reservations', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(reservation)
        });
    },

    updateReservation: (prev, updated) => {
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

        fetch('/api/reservations', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prev, updated})
        })
            .then(async (response) => {
                if (!response.ok) return null;
                return response.json() as Promise<{reservation?: Reservation}>;
            })
            .then((data) => {
                const savedReservation = data?.reservation;
                if (!savedReservation) return;

                set((state) => {
                    const nextMap = {...state.reservationMap};
                    const oldKey = prev.date;
                    const newKey = savedReservation.date;

                    if (nextMap[oldKey]) {
                        nextMap[oldKey] = nextMap[oldKey].filter((reservation) => reservation.id !== prev.id);
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
            .catch(() => {
                // Preserve optimistic local UX if the sync request fails.
            });
    },

    cancelReservation: (reservation, status = 'cancelled') => {
        const updated: Reservation = {...reservation, status};

        let nextReservationMap: ReservationMap | null = null;
        let nextHistory: ReservationHistoryEntry[] = [];

        set((state) => {
            const nextState = buildCancelledReservationState(state, reservation, updated);
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

        fetch('/api/reservations', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id, status})
        });
    },

    restoreReservation: (reservation) => {
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

        fetch('/api/reservations', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id, status: 'active'})
        });
    },

    deleteReservation: (reservation) => {
        let nextReservationMap: ReservationMap | null = null;

        set((state) => {
            const dateReservations = state.reservationMap[reservation.date] ?? [];
            const nextDateReservations = dateReservations.filter((r) => r.id !== reservation.id);
            const nextMap = {...state.reservationMap, [reservation.date]: nextDateReservations};
            const nextCustomerMap = syncCustomerFirstVisitDates(state.customerMap, nextMap);
            nextReservationMap = nextMap;
            syncChangedCustomers(state.customerMap, nextCustomerMap);
            return {reservationMap: nextMap, customerMap: nextCustomerMap};
        });

        if (nextReservationMap) {
            syncReservationState(nextReservationMap, useCalendarStore.getState().reservationHistory);
        }

        if (shouldUseLocalDb()) {
            return;
        }

        fetch('/api/reservations', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: reservation.id})
        });
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
