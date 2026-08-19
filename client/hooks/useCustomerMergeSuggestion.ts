import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {detectMergeGroups} from '../features/customers/merge-suggestion';
import {useCalendarStore} from '../store/calendarStore';
import {useToastStore} from '../store/toastStore';
import {shouldUseLocalDb} from '../lib/local-db';
import {toCustomerMap} from '../utils/customers';
import type {Customer} from '../utils/customers';
import type {Reservation} from '../utils/reservations';
import {groupByDate} from '../utils/reservations';

export interface MergeSuggestion {
    key: string;
    /** 합쳐져 사라질 마스킹 고객. 그룹당 정확히 1명이라 source 는 선택 대상이 아니다 */
    masked: Customer;
    /** 기준이 될 수 있는 실명 후보. 1명 이상이며 이름 값은 모두 같다 */
    candidates: Customer[];
    /** 기본 선택된 기준 고객 (후보가 1명이면 그 1명) */
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
 *
 * 후보는 전부 마스킹 없는 실명이고 이름 값도 같으므로, 이름으로는 갈리지 않는다.
 * 남는 차이는 어느 레코드가 살아남느냐다 — 병합 시 target 의 연락처만 유지되므로
 * 연락처를 가진 쪽을, 그다음으로는 더 오래된 단골을 기본값으로 둔다.
 */
function selectTarget(
    candidates: Customer[],
    reservationMap: Record<string, Reservation[]>,
): number {
    // 1. 전화번호 있는 고객 필터
    const withTel = candidates.filter((c) => c.tel && c.tel.trim());
    if (withTel.length === 1) return withTel[0].id;

    // 2. 마지막 예약이 더 과거인 고객 (= 기존 단골)
    const pool = withTel.length > 0 ? withTel : candidates;
    const target = pool.reduce((best, c) => {
        const lastDate = getLastReservationDate(c.id, reservationMap);
        const bestDate = getLastReservationDate(best.id, reservationMap);
        return lastDate < bestDate ? c : best;
    });
    return target.id;
}

/** 마스킹 이름 패턴으로 중복 고객 그룹 감지 (규칙은 features/customers/merge-suggestion) */
function detectDuplicates(
    customerMap: Record<number, Customer>,
    reservationMap: Record<string, Reservation[]>,
): MergeSuggestion[] {
    const groups = detectMergeGroups(Object.values(customerMap));
    if (groups.length === 0) return [];

    const reviewed = loadReviewedKeys();
    const suggestions: MergeSuggestion[] = [];

    for (const group of groups) {
        if (reviewed.has(group.key)) continue;

        const masked = customerMap[group.maskedId];
        const candidates = group.candidateIds.map((id) => customerMap[id]).filter(Boolean);
        if (!masked || candidates.length === 0) continue;

        suggestions.push({
            key: group.key,
            masked,
            candidates,
            targetId: selectTarget(candidates, reservationMap),
        });
    }

    return suggestions;
}

export function useCustomerMergeSuggestion() {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setCustomerMap = useCalendarStore((s) => s.setCustomerMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const toast = useToastStore((s) => s.show);

    const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [merging, setMerging] = useState(false);

    const detectedRef = useRef(false);
    const prevCustomerCountRef = useRef(0);

    // customerMap 크기 증가 시 (= 동기화 후 새 고객 추가) 감지 실행
    useEffect(() => {
        // 게스트/미인증 모드에서는 고객 병합 제안(네이버 동기화 기반 서버 기능)을 띄우지 않음
        if (shouldUseLocalDb()) {
            setSuggestions([]);
            return;
        }
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

    // 큐에 담긴 제안은 감지 시점의 고객 스냅샷이다. 후보를 공유하는 제안이 연달아 뜨는 것이
    // 새 규칙에서는 정상 흐름이라(`김민수 + 김민* + 김*수` → 2건), 앞 병합으로 바뀐 적립금·
    // 첫방문이 다음 카드에 반영되지 않으면 오너가 낡은 값을 보고 기준을 고르게 된다.
    // 예약 건수는 살아있는 reservationMap 으로 계산되므로 그대로 두면 한 카드 안에서 값이 엇갈린다.
    const currentSuggestion: MergeSuggestion | null = useMemo(() => {
        const snapshot = suggestions[currentIndex];
        if (!snapshot) return null;

        const masked = customerMap[snapshot.masked.id];
        const candidates = snapshot.candidates.map((c) => customerMap[c.id]).filter(Boolean);
        // 병합·삭제로 사라졌으면 제안 자체가 무효다.
        if (!masked || candidates.length === 0) return null;

        const targetId = candidates.some((c) => c.id === snapshot.targetId)
            ? snapshot.targetId
            : candidates[0].id;
        return {...snapshot, masked, candidates, targetId};
    }, [suggestions, currentIndex, customerMap]);

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

    const merge = useCallback(async (targetId: number) => {
        if (!currentSuggestion || merging) return;
        setMerging(true);

        // 합쳐져 사라지는 쪽은 언제나 마스킹 고객 1명뿐이다. 실명 후보끼리는
        // 서로 다른 사람일 수 있으므로 어떤 경우에도 병합하지 않는다.
        const sourceIds = [currentSuggestion.masked.id];

        try {
            const res = await fetch('/api/customers/merge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sourceIds, targetId}),
            });

            if (!res.ok) {
                // 실패를 조용히 삼키면 "둘 다 그대로 남음"으로 보여 원인 파악이 안 됨 → 사유 표면화.
                const err = await res.json().catch(() => null) as {error?: string} | null;
                toast(err?.error ? `병합 실패: ${err.error}` : `병합 실패 (오류 ${res.status})`, 'error');
                return;
            }

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

            toast('병합 완료', 'success');
            // 다음 제안으로
            advance();
        } catch {
            toast('병합 중 네트워크 오류가 발생했습니다.', 'error');
        } finally {
            setMerging(false);
        }
    }, [currentSuggestion, merging, advance, setCustomerMap, setReservationMap, toast]);

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
