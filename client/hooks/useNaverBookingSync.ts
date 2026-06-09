import {useCallback, useEffect, useRef, useState} from 'react';

import {useSession} from 'next-auth/react';

import {useCalendarStore} from '../store/calendarStore';
import {groupByDate} from '../utils/reservations';
import {toCustomerMap} from '../utils/customers';
import type {Reservation, ReservationHistoryEntry} from '../utils/reservations';
import type {Customer} from '../utils/customers';
import type {Designer} from '../utils/designers';

export interface ConflictInfo {
    newReservation: Reservation;
    existingReservation: Reservation;
}

export interface SyncNotification {
    id: string;
    bookingId: string;
    customerName: string;
    designerName: string;
    appointmentDate: string;
    appointmentTime: string;
    reservationId: number;
    timestamp: Date;
    read: boolean;
    type?: 'sync' | 'cancel' | 'conflict';
    conflictKey?: string;
    conflictStatus?: 'pending' | 'deferred' | 'confirmed';
}

interface SyncedEntry {
    bookingId: string;
    customerName: string;
    designerName: string;
    appointmentDate: string;
    appointmentTime: string;
    reservationId: number;
}

interface CancelledEntry {
    bookingId: string;
    reservationId: number;
    appointmentDate?: string;
    appointmentTime?: string;
    customerName?: string;
    designerName?: string;
}

function conflictKey(c: ConflictInfo): string {
    return `${c.newReservation.id}-${c.existingReservation.id}`;
}

const ACTIVE_CONFLICTS_KEY = 'naver-sync-active-conflicts';

interface StoredConflictPair {
    newReservation: Reservation;
    existingReservation: Reservation;
}

function loadActiveConflictPairs(): StoredConflictPair[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(ACTIVE_CONFLICTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveActiveConflictPairs(conflicts: ConflictInfo[]): void {
    if (typeof window === 'undefined') return;
    const pairs: StoredConflictPair[] = conflicts.map((c) => ({
        newReservation: c.newReservation,
        existingReservation: c.existingReservation,
    }));
    localStorage.setItem(ACTIVE_CONFLICTS_KEY, JSON.stringify(pairs));
}

function removeActiveConflictPair(key: string): void {
    if (typeof window === 'undefined') return;
    const pairs = loadActiveConflictPairs();
    const [newId, existingId] = key.split('-').map(Number);
    const next = pairs.filter((p) => !(p.newReservation.id === newId && p.existingReservation.id === existingId));
    localStorage.setItem(ACTIVE_CONFLICTS_KEY, JSON.stringify(next));
}

function restoreConflictsFromPairs(): ConflictInfo[] {
    const pairs = loadActiveConflictPairs();
    if (pairs.length === 0) return [];

    const reservationMap = useCalendarStore.getState().reservationMap;
    const activeReservations = Object.values(reservationMap).flat()
        .filter((r) => r.status !== 'cancelled' && r.status !== 'noshow');
    const conflicts: ConflictInfo[] = [];

    for (const stored of pairs) {
        // 취소·노쇼가 아닌 예약이 여전히 존재하는지 확인
        const newExists = activeReservations.some((r) => r.id === stored.newReservation.id);
        const existingExists = activeReservations.some((r) => r.id === stored.existingReservation.id);
        if (newExists && existingExists) {
            // 원본 스냅샷을 유지 (변경 비교용)
            conflicts.push({
                newReservation: stored.newReservation,
                existingReservation: stored.existingReservation,
            });
        }
    }

    return conflicts;
}

export function useNaverBookingSync() {
    const {data: session} = useSession();
    const isSyncingRef = useRef(false);
    const [syncing, setSyncing] = useState(false);
    const [gmailTokenExpired, setGmailTokenExpired] = useState(false);
    const [conflictQueue, setConflictQueue] = useState<ConflictInfo[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [deferredIds, setDeferredIds] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        const stored = localStorage.getItem('naver-sync-deferred-conflicts');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    const notifications = useCalendarStore((s) => s.syncNotifications);
    const addSyncNotifications = useCalendarStore((s) => s.addSyncNotifications);
    const markSyncNotificationRead = useCalendarStore((s) => s.markSyncNotificationRead);
    const markSyncNotificationsRead = useCalendarStore((s) => s.markSyncNotificationsRead);
    const updateConflictNotificationStatus = useCalendarStore((s) => s.updateConflictNotificationStatus);
    const replaceMockConflictNotifications = useCalendarStore((s) => s.replaceMockConflictNotifications);
    const clearSyncNotifications = useCalendarStore((s) => s.clearSyncNotifications);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const patchNotificationNames = useCalendarStore((s) => s.patchNotificationNames);
    const conflictDetectedRef = useRef(false);

    // 빈 고객명·디자이너명 알림 보정 (데이터 로드 후)
    useEffect(() => {
        if (Object.keys(customerMap).length === 0) return;
        patchNotificationNames();
    }, [customerMap, reservationMap, patchNotificationNames]);

    // 자동 중복 감지 (예약 데이터 로드 시) — 인증된 세션에서만 실행
    useEffect(() => {
        if (!session) return;
        if (conflictDetectedRef.current) return;

        const reservationDates = Object.keys(reservationMap);
        if (reservationDates.length === 0) return;

        conflictDetectedRef.current = true;

        // 새 conflict 감지 + 이전에 저장된 미해결 conflict 복원
        const detected = detectConflictsFromStore();
        const detectedKeys = new Set(detected.map(conflictKey));

        // 실제로 더 이상 겹치지 않는 pending/deferred conflict 알림을 자동 confirmed 처리
        const {syncNotifications: currentNotifications, updateConflictNotificationStatus: autoConfirm} = useCalendarStore.getState();
        for (const n of currentNotifications) {
            if (n.type === 'conflict' && n.conflictStatus !== 'confirmed' && n.conflictKey && !detectedKeys.has(n.conflictKey)) {
                autoConfirm(n.conflictKey, 'confirmed');
            }
        }

        const restored = restoreConflictsFromPairs();

        // 합치기 (중복 제거)
        const allKeys = new Set(detected.map(conflictKey));
        const merged = [...detected];
        for (const r of restored) {
            const key = conflictKey(r);
            if (!allKeys.has(key)) {
                allKeys.add(key);
                merged.push(r);
            }
        }

        if (merged.length === 0) return;

        // 활성 conflict 저장
        saveActiveConflictPairs(merged);

        const customerMap = useCalendarStore.getState().customerMap;
        const designers = useCalendarStore.getState().designers;

        const existingKeys = new Set(
            useCalendarStore.getState().syncNotifications
                .filter((n) => n.type === 'conflict')
                .map((n) => n.conflictKey)
        );

        const conflictNotifications: SyncNotification[] = merged
            .filter((conflict) => !existingKeys.has(conflictKey(conflict)))
            .map((conflict, index) => ({
                id: `conflict-${conflict.newReservation.id}-${index}`,
                bookingId: String(conflict.newReservation.naverBookingId ?? conflict.newReservation.id),
                customerName: customerMap[conflict.newReservation.customerId]?.name ?? `고객 ${conflict.newReservation.customerId}`,
                designerName: designers.find((designer) => designer.id === conflict.newReservation.designerId)?.name ?? '미지정',
                appointmentDate: conflict.newReservation.date,
                appointmentTime: conflict.newReservation.startTime,
                reservationId: conflict.newReservation.id,
                timestamp: new Date(),
                read: false,
                type: 'conflict' as const,
                conflictKey: conflictKey(conflict),
                conflictStatus: 'pending' as const,
            }));

        if (conflictNotifications.length > 0) {
            addSyncNotifications(conflictNotifications);
        }

        setConflictQueue(merged);
        setCurrentIndex(0);
    }, [session, reservationMap, addSyncNotifications]);

    const isActive =
        session?.user?.provider === 'google'
        && (session.user.role === 'manager' || session.user.role === 'owner')
        && !!session.user.storeId;

    const sync = useCallback(async () => {
        if (!isActive) return;
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        setSyncing(true);

        try {
            const res = await fetch('/api/naver-booking-sync', {method: 'POST'});
            if (!res.ok) return;

            const data = await res.json() as {
                synced: SyncedEntry[];
                cancelled: CancelledEntry[];
                skipped: string[];
                errors: string[];
                error?: string;
            };

            if (data.error) {
                console.log('[naver-sync] API error:', data.error);
                if (data.error === 'gmail_token_expired') {
                    setGmailTokenExpired(true);
                }
                return;
            }

            localStorage.setItem('naver-sync-last', String(Date.now()));
            console.log('[naver-sync]', {synced: data.synced.length, cancelled: data.cancelled.length, skipped: data.skipped.length, errors: data.errors.length});

            if (data.synced.length === 0 && data.cancelled.length === 0 && data.errors.length === 0) return;

            const now = new Date();
            const newNotifications: SyncNotification[] = data.synced.map((entry, i) => ({
                id: `${Date.now()}-sync-${i}`,
                bookingId: entry.bookingId,
                customerName: entry.customerName,
                designerName: entry.designerName,
                appointmentDate: entry.appointmentDate,
                appointmentTime: entry.appointmentTime,
                reservationId: entry.reservationId,
                timestamp: now,
                read: false,
            }));

            const cancelNotifications: SyncNotification[] = data.cancelled.map((entry, i) => ({
                id: `${Date.now()}-cancel-${i}`,
                bookingId: entry.bookingId,
                customerName: entry.customerName || '고객',
                designerName: entry.designerName || '미지정',
                appointmentDate: entry.appointmentDate || '',
                appointmentTime: entry.appointmentTime || '',
                reservationId: entry.reservationId,
                timestamp: now,
                read: false,
                type: 'cancel' as const,
            }));

            const allNotifications = [...newNotifications, ...cancelNotifications];
            if (allNotifications.length > 0) {
                console.log('[naver-sync] adding notifications:', allNotifications.length);
                addSyncNotifications(allNotifications);
            }

            if (data.synced.length > 0 || data.cancelled.length > 0) {
                await reloadStoreData();
                if (data.synced.length > 0) {
                    const detected = detectConflicts(data.synced);
                    if (detected.length > 0) {
                        const customerMap = useCalendarStore.getState().customerMap;
                        const designers = useCalendarStore.getState().designers;
                        const existingKeys = new Set(
                            useCalendarStore.getState().syncNotifications
                                .filter((notification) => notification.type === 'conflict')
                                .map((notification) => notification.conflictKey)
                        );
                        const conflictNotifications = detected
                            .filter((conflict) => !existingKeys.has(conflictKey(conflict)))
                            .map((conflict, index) => ({
                            id: `${Date.now()}-conflict-${index}`,
                            bookingId: String(conflict.newReservation.naverBookingId ?? conflict.newReservation.id),
                            customerName: customerMap[conflict.newReservation.customerId]?.name ?? '',
                            designerName: designers.find((designer) => designer.id === conflict.newReservation.designerId)?.name ?? '미지정',
                            appointmentDate: conflict.newReservation.date,
                            appointmentTime: conflict.newReservation.startTime,
                            reservationId: conflict.newReservation.id,
                            timestamp: now,
                            read: false,
                            type: 'conflict' as const,
                            conflictKey: conflictKey(conflict),
                            conflictStatus: 'pending' as const,
                        }));
                        if (conflictNotifications.length > 0) {
                            addSyncNotifications(conflictNotifications);
                        }
                        setConflictQueue(detected);
                        setCurrentIndex(0);
                    }
                }
            }
        } catch {
            // Silently ignore network errors
        } finally {
            isSyncingRef.current = false;
            setSyncing(false);
        }
    }, [isActive]);

    // 자동 동기화: 로그인 시 + 매 정시 (마지막 동기화 후 30분 이내면 건너뜀)
    useEffect(() => {
        if (!isActive) return;

        const shouldSync = () => {
            const last = Number(localStorage.getItem('naver-sync-last') || '0');
            return Date.now() - last >= 30 * 60 * 1000;
        };

        const autoSync = () => {
            if (shouldSync()) sync();
        };

        // 로그인 시
        autoSync();

        // 매 정시
        const msUntilNextHour = () => {
            const now = new Date();
            const next = new Date(now);
            next.setHours(next.getHours() + 1, 0, 0, 0);
            return next.getTime() - now.getTime();
        };

        let intervalId: ReturnType<typeof setInterval> | null = null;

        const timerId = setTimeout(() => {
            autoSync();
            intervalId = setInterval(autoSync, 60 * 60 * 1000);
        }, msUntilNextHour());

        return () => {
            clearTimeout(timerId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [isActive, sync]);


    const visibleNotifications = notifications;
    const unreadCount = visibleNotifications.filter((n) => {
        if (n.type === 'conflict') return n.conflictStatus !== 'confirmed';
        return !n.read && Date.now() - n.timestamp.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).length;

    const activeQueue = conflictQueue.filter((c) => !deferredIds.has(conflictKey(c)));
    const currentConflict: ConflictInfo | null = activeQueue[currentIndex] ?? null;
    const currentConflictStatus: 'pending' | 'deferred' | 'confirmed' | null = currentConflict
        ? (notifications.find((n) => n.type === 'conflict' && n.conflictKey === conflictKey(currentConflict))?.conflictStatus ?? 'pending')
        : null;

    const advanceConflict = useCallback(() => {
        if (currentConflict) {
            const key = conflictKey(currentConflict);
            updateConflictNotificationStatus(key, 'confirmed');
            removeActiveConflictPair(key);
            // 확인 시 해당 알림 읽음 처리
            const notification = notifications.find((n) => n.type === 'conflict' && n.conflictKey === key);
            if (notification) markSyncNotificationRead(notification.id);
            setDeferredIds((prev) => {
                const next = new Set(prev);
                next.add(key);
                localStorage.setItem('naver-sync-deferred-conflicts', JSON.stringify([...next]));
                return next;
            });
        }
        setCurrentIndex((prev) => {
            const nextIndex = prev + 1;
            if (nextIndex >= activeQueue.length) {
                setConflictQueue([]);
                return 0;
            }
            return nextIndex;
        });
    }, [activeQueue.length, currentConflict, updateConflictNotificationStatus]);

    const deferConflict = useCallback(() => {
        if (!currentConflict) return;
        const key = conflictKey(currentConflict);
        updateConflictNotificationStatus(key, 'deferred');
        setDeferredIds((prev) => {
            const next = new Set(prev);
            next.add(key);
            localStorage.setItem('naver-sync-deferred-conflicts', JSON.stringify([...next]));
            return next;
        });
        // After deferring, the activeQueue shrinks so currentIndex now points to the next item.
        // If currentIndex is now at or past the end of the (now-shorter) queue, reset.
        setCurrentIndex((prev) => {
            const newActiveLength = activeQueue.length - 1;
            if (newActiveLength <= 0) {
                setConflictQueue([]);
                return 0;
            }
            return prev >= newActiveLength ? 0 : prev;
        });
    }, [currentConflict, activeQueue.length, updateConflictNotificationStatus]);

    const dismissConflicts = useCallback(() => {
        setConflictQueue([]);
        setCurrentIndex(0);
    }, []);

    const openConflictByKey = useCallback((key: string) => {
        let queue = conflictQueue;

        // conflictQueue가 비어있으면 store에서 재감지 + 저장된 conflict 복원
        if (queue.length === 0) {
            const detected = detectConflictsFromStore();
            const restored = restoreConflictsFromPairs();
            const allKeys = new Set(detected.map(conflictKey));
            queue = [...detected];
            for (const r of restored) {
                const k = conflictKey(r);
                if (!allKeys.has(k)) {
                    allKeys.add(k);
                    queue.push(r);
                }
            }
            if (queue.length > 0) {
                setConflictQueue(queue);
            }
        }

        let existing = queue.find((conflict) => conflictKey(conflict) === key);

        // queue에도 없으면 notification + reservationMap에서 직접 복원
        if (!existing) {
            const [newIdStr, existingIdStr] = key.split('-');
            const newId = Number(newIdStr);
            const existingId = Number(existingIdStr);
            const allReservations = Object.values(reservationMap).flat();
            const newRes = allReservations.find((r) => r.id === newId);
            const existingRes = allReservations.find((r) => r.id === existingId);
            if (!newRes || !existingRes) return;
            existing = {newReservation: newRes, existingReservation: existingRes};
            queue = [...queue, existing];
            setConflictQueue(queue);
            saveActiveConflictPairs(queue);
        }

        // deferredIds에서 메모리에서만 임시 제거 (localStorage는 유지)
        setDeferredIds((prev) => {
            if (!prev.has(key)) return prev;
            const next = new Set(prev);
            next.delete(key);
            return next;
        });

        const nextActiveQueue = queue.filter((conflict) => {
            const itemKey = conflictKey(conflict);
            return itemKey === key || !deferredIds.has(itemKey);
        });
        const nextIndex = nextActiveQueue.findIndex((conflict) => conflictKey(conflict) === key);
        setCurrentIndex(nextIndex >= 0 ? nextIndex : 0);
    }, [conflictQueue, deferredIds]);

    return {
        notifications,
        visibleNotifications,
        unreadCount,
        markRead: markSyncNotificationRead,
        markAllRead: markSyncNotificationsRead,
        clearAll: clearSyncNotifications,
        currentConflict,
        currentConflictStatus,
        advanceConflict,
        deferConflict,
        dismissConflicts,
        openConflictByKey,
        sync,
        syncing,
        isActive,
        gmailTokenExpired,
        dismissGmailTokenExpired: useCallback(() => setGmailTokenExpired(false), []),
    };
}

function detectConflictsFromStore(): ConflictInfo[] {
    const reservationMap = useCalendarStore.getState().reservationMap;
    const conflicts: ConflictInfo[] = [];
    const seen = new Set<string>();

    for (const dateReservations of Object.values(reservationMap)) {
        const active = dateReservations.filter((r) => r.status !== 'cancelled' && r.status !== 'noshow');
        for (const a of active) {
            for (const b of active) {
                if (a.id >= b.id) continue;
                if (a.designerId == null || a.designerId !== b.designerId) continue;
                if (a.startTime >= b.endTime || a.endTime <= b.startTime) continue;

                const pairKey = `${a.id}-${b.id}`;
                if (seen.has(pairKey)) continue;
                seen.add(pairKey);

                const aIsNaver = !!a.naverBookingId;
                const bIsNaver = !!b.naverBookingId;
                const newRes = aIsNaver ? a : bIsNaver ? b : a;
                const existingRes = newRes === a ? b : a;

                conflicts.push({newReservation: newRes, existingReservation: existingRes});
            }
        }
    }

    return conflicts;
}

function detectConflicts(syncedEntries: SyncedEntry[]): ConflictInfo[] {
    const reservationMap = useCalendarStore.getState().reservationMap;
    const conflicts: ConflictInfo[] = [];

    for (const entry of syncedEntries) {
        const dateReservations = reservationMap[entry.appointmentDate] ?? [];
        const newRes = dateReservations.find((r) => r.id === entry.reservationId);
        if (!newRes) continue;

        const overlapping = dateReservations.find((r) =>
            r.id !== newRes.id
            && r.status !== 'cancelled'
            && r.status !== 'noshow'
            && (newRes.designerId == null || r.designerId === newRes.designerId)
            && newRes.startTime < r.endTime
            && newRes.endTime > r.startTime
        );

        if (overlapping) {
            conflicts.push({newReservation: newRes, existingReservation: overlapping});
        }
    }

    return conflicts;
}

async function reloadStoreData() {
    const setReservationMap = useCalendarStore.getState().setReservationMap;
    const setCustomerMap = useCalendarStore.getState().setCustomerMap;
    const setReservationHistory = useCalendarStore.getState().setReservationHistory;
    const setDesigners = useCalendarStore.getState().setDesigners;

    try {
        const [resRes, custRes, desRes] = await Promise.all([
            fetch('/api/reservations'),
            fetch('/api/customers'),
            fetch('/api/designers'),
        ]);

        if (resRes.ok) {
            const resData = await resRes.json() as {
                reservations: Reservation[];
                history: ReservationHistoryEntry[];
            };
            setReservationMap(groupByDate(resData.reservations));
            setReservationHistory(resData.history);
        }

        if (custRes.ok) {
            const custData = await custRes.json() as {customers: Customer[]};
            setCustomerMap(toCustomerMap(custData.customers));
        }

        if (desRes.ok) {
            const desData = await desRes.json() as {designers: Designer[]};
            setDesigners(desData.designers);
        }
    } catch {
        // Silently ignore reload errors
    }
}
