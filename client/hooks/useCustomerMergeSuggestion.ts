import {useCallback, useEffect, useRef, useState} from 'react';

import {useCalendarStore} from '../store/calendarStore';
import {toCustomerMap} from '../utils/customers';
import type {Customer} from '../utils/customers';
import type {Reservation} from '../utils/reservations';
import {groupByDate} from '../utils/reservations';

export interface MergeSuggestion {
    key: string;
    customers: Customer[];
    targetId: number;
}

const REVIEWED_KEY = 'customer-merge-reviewed';

function loadReviewedKeys(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(REVIEWED_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function saveReviewedKey(key: string): void {
    if (typeof window === 'undefined') return;
    const keys = loadReviewedKeys();
    keys.add(key);
    localStorage.setItem(REVIEWED_KEY, JSON.stringify([...keys]));
}

/** 마스킹(`*`) 위치를 무시하고 이름 패턴이 동일한지 비교 */
function isMaskedNameMatch(a: string, b: string): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '*' || b[i] === '*') continue;
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/** 고객의 마지막 예약 날짜 조회 (없으면 '9999') */
function getLastReservationDate(customerId: number, reservationMap: Record<string, Reservation[]>): string {
    let last = '';
    for (const reservations of Object.values(reservationMap)) {
        for (const r of reservations) {
            if (r.customerId === customerId && r.date > last) {
                last = r.date;
            }
        }
    }
    return last || '9999';
}

/** 고객의 예약 건수 */
function countReservations(customerId: number, reservationMap: Record<string, Reservation[]>): number {
    let count = 0;
    for (const reservations of Object.values(reservationMap)) {
        for (const r of reservations) {
            if (r.customerId === customerId) count++;
        }
    }
    return count;
}

/**
 * 병합 기준 고객 자동 선정
 * 우선순위: 1) 마스킹 없는 고객  2) 전화번호 있는 고객  3) 마지막 예약이 더 과거인 고객
 */
function selectTarget(
    customers: Customer[],
    reservationMap: Record<string, Reservation[]>,
): number {
    // 1. 마스킹 없는 고객 필터
    const unmasked = customers.filter((c) => !c.name.includes('*'));
    if (unmasked.length === 1) return unmasked[0].id;

    // 2. 전화번호 있는 고객 필터
    const pool = unmasked.length > 0 ? unmasked : customers;
    const withTel = pool.filter((c) => c.tel && c.tel.trim());
    if (withTel.length === 1) return withTel[0].id;

    // 3. 마지막 예약이 더 과거인 고객 (= 기존 단골)
    const candidates = withTel.length > 0 ? withTel : pool;
    const target = candidates.reduce((best, c) => {
        const lastDate = getLastReservationDate(c.id, reservationMap);
        const bestDate = getLastReservationDate(best.id, reservationMap);
        return lastDate < bestDate ? c : best;
    });
    return target.id;
}

/** 마스킹 이름 패턴으로 중복 고객 그룹 감지 */
function detectDuplicates(
    customerMap: Record<number, Customer>,
    reservationMap: Record<string, Reservation[]>,
): MergeSuggestion[] {
    const customers = Object.values(customerMap);
    const maskedCustomers = customers.filter((c) => c.name.includes('*'));
    if (maskedCustomers.length === 0) return [];

    const reviewed = loadReviewedKeys();
    const groupMap = new Map<string, Set<number>>();

    for (const masked of maskedCustomers) {
        for (const other of customers) {
            if (other.id === masked.id) continue;
            if (!isMaskedNameMatch(masked.name, other.name)) continue;

            // 두 ID를 정렬해서 pair key 생성
            const pairKey = [masked.id, other.id].sort((a, b) => a - b).join('-');
            const existing = groupMap.get(pairKey);
            if (existing) {
                existing.add(masked.id);
                existing.add(other.id);
            } else {
                groupMap.set(pairKey, new Set([masked.id, other.id]));
            }
        }
    }

    // pair들을 연결된 그룹으로 합침 (union-find 대신 간단 병합)
    const mergedGroups: Set<number>[] = [];
    for (const ids of groupMap.values()) {
        let merged = false;
        for (const group of mergedGroups) {
            if ([...ids].some((id) => group.has(id))) {
                for (const id of ids) group.add(id);
                merged = true;
                break;
            }
        }
        if (!merged) {
            mergedGroups.push(new Set(ids));
        }
    }

    const suggestions: MergeSuggestion[] = [];
    for (const group of mergedGroups) {
        const key = [...group].sort((a, b) => a - b).join('-');
        if (reviewed.has(key)) continue;

        const groupCustomers = [...group]
            .map((id) => customerMap[id])
            .filter(Boolean);
        if (groupCustomers.length < 2) continue;

        const targetId = selectTarget(groupCustomers, reservationMap);
        suggestions.push({key, customers: groupCustomers, targetId});
    }

    return suggestions;
}

export function useCustomerMergeSuggestion() {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);

    const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [merging, setMerging] = useState(false);

    const detectedRef = useRef(false);
    const prevCustomerCountRef = useRef(0);

    // customerMap 크기 증가 시 (= 동기화 후 새 고객 추가) 감지 실행
    useEffect(() => {
        const customerCount = Object.keys(customerMap).length;
        if (customerCount === 0) return;

        // 최초 로드 시에도 한 번 실행
        if (!detectedRef.current || customerCount > prevCustomerCountRef.current) {
            detectedRef.current = true;
            prevCustomerCountRef.current = customerCount;

            const detected = detectDuplicates(customerMap, reservationMap);
            setSuggestions(detected);
            setCurrentIndex(0);
        }
    }, [customerMap, reservationMap]);

    const currentSuggestion: MergeSuggestion | null = suggestions[currentIndex] ?? null;

    const advance = useCallback(() => {
        setCurrentIndex((prev) => {
            const next = prev + 1;
            if (next >= suggestions.length) {
                setSuggestions([]);
                return 0;
            }
            return next;
        });
    }, [suggestions.length]);

    const merge = useCallback(async (targetId: number, explicitSourceIds?: number[]) => {
        if (!currentSuggestion || merging) return;
        setMerging(true);

        const sourceIds = explicitSourceIds ?? currentSuggestion.customers
            .filter((c) => c.id !== targetId)
            .map((c) => c.id);

        try {
            const res = await fetch('/api/customers/merge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sourceIds, targetId}),
            });

            if (res.ok) {
                // 리뷰 완료 기록
                saveReviewedKey(currentSuggestion.key);

                // 고객 + 예약 데이터 리로드
                const [custRes, resRes] = await Promise.all([
                    fetch('/api/customers'),
                    fetch('/api/reservations'),
                ]);
                if (custRes.ok) {
                    const custData = await custRes.json() as {customers: Customer[]};
                    setCustomerMap(toCustomerMap(custData.customers));
                }
                if (resRes.ok) {
                    const resData = await resRes.json() as {reservations: Reservation[]};
                    setReservationMap(groupByDate(resData.reservations));
                }

                // 다음 제안으로
                advance();
            }
        } catch {
            // 네트워크 오류 무시
        } finally {
            setMerging(false);
        }
    }, [currentSuggestion, merging, advance, setCustomerMap, setReservationMap]);

    const skip = useCallback(() => {
        if (!currentSuggestion) return;
        saveReviewedKey(currentSuggestion.key);
        advance();
    }, [currentSuggestion, advance]);

    const dismiss = useCallback(() => {
        setSuggestions([]);
        setCurrentIndex(0);
    }, []);

    /** 수동 재감지 (동기화 후 호출) */
    const triggerDetection = useCallback(() => {
        const detected = detectDuplicates(customerMap, reservationMap);
        setSuggestions(detected);
        setCurrentIndex(0);
    }, [customerMap, reservationMap]);

    return {
        currentSuggestion,
        merging,
        merge,
        skip,
        dismiss,
        triggerDetection,
        reservationMap,
        customerMap,
    };
}

export {countReservations};
