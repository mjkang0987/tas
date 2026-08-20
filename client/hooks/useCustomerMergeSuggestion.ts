import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {
    detectMergeGroups,
    selectMergeTarget,
    summarizeCustomerReservations,
} from '../features/customers/merge-suggestion';
import type {MergeSelection} from '../features/customers/merge-suggestion';
import {useCalendarStore} from '../store/calendarStore';
import {useToastStore} from '../store/toastStore';
import {shouldUseLocalDb} from '../lib/local-db';
import {toCustomerMap} from '../utils/customers';
import type {Customer} from '../utils/customers';
import type {Reservation} from '../utils/reservations';
import {groupByDate} from '../utils/reservations';

export type {MergeSelection} from '../features/customers/merge-suggestion';

// 건너뛰기 기록은 서버가 갖는다(`/api/customer-merge-skip`).
// localStorage 에 두면 기기·관리자마다 따로 놀고(PC 에서 건너뛴 것이 태블릿에서 또 뜬다)
// 캐시를 지우면 판단이 통째로 사라진다. 중복예약 처리 이력과 같은 이유다.
//
// 옛 localStorage 기록은 이전하지 않는다 — 아직 운영 매장이 없어 버려도 되는 값이고,
// 이전 로직을 두면 기기마다 다른 기록이 서버로 섞여 들어온다. 남아 있던 키는 지운다.
const LEGACY_REVIEWED_KEY = 'customer-merge-reviewed';

function dropLegacyReviewedKeys(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LEGACY_REVIEWED_KEY);
}

/** 건너뛴 쌍 집합. `${maskedId}-${candidateId}` 형태 */
function pairKey(selection: MergeSelection): string | null {
    const maskedId = selection.maskedSource?.id;
    const candidateId = selection.targetChoices[0]?.id;
    return maskedId === undefined || candidateId === undefined ? null : `${maskedId}-${candidateId}`;
}

async function fetchSkippedPairs(): Promise<Set<string>> {
    const response = await fetch('/api/customer-merge-skip');
    if (!response.ok) throw new Error(`${response.status}`);
    const data = await response.json() as {skips?: {maskedId: number; candidateId: number}[]};
    return new Set((data.skips ?? []).map((s) => `${s.maskedId}-${s.candidateId}`));
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

/** 마스킹 이름 패턴으로 중복 고객 그룹 감지 (규칙은 features/customers/merge-suggestion) */
function detectDuplicates(
    customerMap: Record<number, Customer>,
    reservationMap: Record<string, Reservation[]>,
    skipped: Set<string>,
): MergeSelection[] {
    const groups = detectMergeGroups(Object.values(customerMap));
    if (groups.length === 0) return [];

    const suggestions: MergeSelection[] = [];

    for (const group of groups) {
        if (skipped.has(`${group.maskedId}-${group.candidateIds[0]}`)) continue;

        const masked = customerMap[group.maskedId];
        const candidates = group.candidateIds.map((id) => customerMap[id]).filter(Boolean);
        if (!masked || candidates.length === 0) continue;

        const summary = summarizeCustomerReservations(candidates.map((c) => c.id), reservationMap);
        suggestions.push({
            key: group.key,
            mode: 'suggestion',
            maskedSource: masked,
            targetChoices: candidates,
            targetId: selectMergeTarget(candidates, summary),
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

    const [suggestions, setSuggestions] = useState<MergeSelection[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [merging, setMerging] = useState(false);

    const prevSignatureRef = useRef<string | null>(null);
    // 서버에 저장된 '건너뛴 쌍'. 감지보다 먼저 확보돼야 이미 판단한 제안이 다시 뜨지 않는다.
    const skippedRef = useRef<Set<string> | null>(null);

    // 고객 목록의 '내용'이 바뀌면 다시 감지한다.
    //
    // 예전엔 `고객 수가 늘었을 때`만 다시 돌렸다. 그러면 마스킹 이름을 실명으로
    // 고치는 것처럼 **수가 그대로인 변경**에는 반응하지 못해, 방금 만든 병합 대상이
    // 새로고침 전까지 안 떴다.
    //
    // `customerMap` 객체 참조로 걸지 않는 이유 — 스토어가 무관한 갱신에도 새 객체를
    // 만들어서 불필요하게 돌고, 감지 결과가 렌더를 부르면 루프가 될 수 있다.
    // 판정에 실제로 쓰이는 값(id·이름·연락처)만 뽑아 비교한다.
    useEffect(() => {
        // 게스트/미인증 모드에서는 고객 병합 제안(네이버 동기화 기반 서버 기능)을 띄우지 않음
        if (shouldUseLocalDb()) {
            setSuggestions([]);
            return;
        }

        const customers = Object.values(customerMap);
        if (customers.length === 0) return;

        const signature = customers.map((c) => `${c.id}:${c.name}:${c.tel}`).join('|');
        if (signature === prevSignatureRef.current) return;

        let cancelled = false;

        // 건너뛴 쌍을 못 받으면 감지하지 않는다. 빈 집합으로 진행하면 이미 "다른 사람"
        // 이라고 판단한 제안이 전부 다시 뜬다 — 조용히 틀리느니 안 띄우는 편이 낫다.
        // (시그니처도 이때는 갱신하지 않아, 다음 변경에 다시 시도한다.)
        const run = async () => {
            const skipped = skippedRef.current ?? await fetchSkippedPairs();
            if (cancelled) return;
            skippedRef.current = skipped;
            dropLegacyReviewedKeys();

            prevSignatureRef.current = signature;
            setSuggestions(detectDuplicates(customerMap, reservationMap, skipped));
            setCurrentIndex(0);
        };

        run().catch((error) => {
            console.error('[merge-suggestion] 건너뛰기 기록 조회 실패:', error);
        });

        return () => {
            cancelled = true;
        };
    }, [customerMap, reservationMap]);

    // 큐에 담긴 제안은 감지 시점의 고객 스냅샷이다. 후보를 공유하는 제안이 연달아 뜨는 것이
    // 새 규칙에서는 정상 흐름이라(`김민수 + 김민* + 김*수` → 2건), 앞 병합으로 바뀐 적립금·
    // 첫방문이 다음 카드에 반영되지 않으면 오너가 낡은 값을 보고 기준을 고르게 된다.
    // 예약 건수는 살아있는 reservationMap 으로 계산되므로 그대로 두면 한 카드 안에서 값이 엇갈린다.
    const currentSuggestion: MergeSelection | null = useMemo(() => {
        const snapshot = suggestions[currentIndex];
        if (!snapshot) return null;

        const masked = snapshot.maskedSource ? customerMap[snapshot.maskedSource.id] : null;
        const targetChoices = snapshot.targetChoices.map((c) => customerMap[c.id]).filter(Boolean);
        // 병합·삭제로 사라졌으면 제안 자체가 무효다.
        if (!masked || targetChoices.length === 0) return null;

        const targetId = targetChoices.some((c) => c.id === snapshot.targetId)
            ? snapshot.targetId
            : targetChoices[0].id;
        return {...snapshot, maskedSource: masked, targetChoices, targetId};
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
        const sourceIds = currentSuggestion.maskedSource ? [currentSuggestion.maskedSource.id] : [];

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

            // 건너뛰기 기록은 남기지 않는다 — 병합되면 마스킹 고객 자체가 사라져
            // 같은 쌍이 다시 감지되지 않는다.

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

    // 건너뛰기 = "이 둘은 다른 사람이다". 매장의 판단이므로 서버에 남긴다.
    // 낙관적으로 먼저 큐를 넘기고, 실패하면 알린다(다음 감지 때 다시 뜬다).
    const skip = useCallback(() => {
        if (!currentSuggestion) return;

        const key = pairKey(currentSuggestion);
        const maskedId = currentSuggestion.maskedSource?.id;
        const candidateId = currentSuggestion.targetChoices[0]?.id;
        advance();

        if (key === undefined || key === null || maskedId === undefined || candidateId === undefined) return;
        skippedRef.current?.add(key);

        fetch('/api/customer-merge-skip', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({maskedId, candidateId}),
        }).then((res) => {
            if (res.ok) return;
            skippedRef.current?.delete(key);
            toast('건너뛰기가 저장되지 않았습니다. 다음에 다시 표시됩니다.', 'error');
        }).catch(() => {
            skippedRef.current?.delete(key);
            toast('건너뛰기가 저장되지 않았습니다. 다음에 다시 표시됩니다.', 'error');
        });
    }, [currentSuggestion, advance, toast]);

    const dismiss = useCallback(() => {
        setSuggestions([]);
        setCurrentIndex(0);
    }, []);

    /** 수동 재감지 (동기화 후 호출) */
    const triggerDetection = useCallback(() => {
        setSuggestions(detectDuplicates(customerMap, reservationMap, skippedRef.current ?? new Set()));
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
