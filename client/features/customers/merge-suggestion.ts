import type {Reservation, ReservationMap} from '../reservations/model';
import {normalizeTel} from './model';
import type {Customer} from './model';

/** 이름에 마스킹(`*`)이 포함됐는지 */
export function isMaskedName(name: string): boolean {
    return name.includes('*');
}

/** 마스킹(`*`) 위치를 무시하고 이름 패턴이 동일한지 비교 */
export function isMaskedNameMatch(a: string, b: string): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '*' || b[i] === '*') continue;
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export interface MergeCandidateGroup {
    key: string;
    /** 합쳐져 사라질 마스킹 고객. 그룹당 정확히 1명 */
    maskedId: number;
    /** 기준이 될 수 있는 실명 고객. 1명 이상이며 이름 값이 같고, 아무도 연락처를 갖지 않는다 */
    candidateIds: number[];
}

/**
 * 그룹 식별자. 이전 구현과 같은 형식(그룹 전체 ID를 오름차순으로 이어붙임)이라
 * 구성원이 그대로인 그룹은 `customer-merge-reviewed` 기록이 계속 통한다.
 *
 * 다만 **한 그룹이 둘로 갈리는 경우는 기록이 승계되지 않는다** —
 * `김민수 + 김민* + 김*수` 는 옛 키 `1-2-3` 하나가 새 키 `1-2`/`1-3` 둘이 되므로,
 * 이미 건너뛴 제안이라도 한 번은 다시 뜬다. 규칙이 바뀌었으니 다시 판단받는 편이 맞다.
 */
export function buildMergeGroupKey(maskedId: number, candidateIds: number[]): string {
    return [maskedId, ...candidateIds].sort((a, b) => a - b).join('-');
}

/**
 * 마스킹 이름 패턴으로 병합 후보 그룹을 만든다.
 *
 * 규칙:
 * - 그룹 하나에 마스킹 고객은 **정확히 1명**. 마스킹끼리는 묶지 않는다.
 *   `김민수 + 김민* + 김*수` 는 `김민*` 그룹과 `김*수` 그룹으로 **따로** 뜬다.
 * - 실명 후보가 없으면 제외한다. 기준이 될 이름이 없으므로 병합할 수 없다.
 * - 실명 후보의 **이름 값이 2종 이상**이면 제외한다. `김민수`/`김진수` 중
 *   `김*수` 가 누구인지 판정할 수 없다. 반면 같은 이름이 여러 명인 경우
 *   (동명이인)는 1종으로 세어 허용하고, 누구인지는 사용자가 고른다.
 * - 그룹 안에 **연락처를 가진 고객이 한 명이라도 있으면** 제외하고 수동 병합에 맡긴다.
 *   번호가 있다는 것은 대조할 근거가 생겼다는 뜻인데, 그 근거로 판정할 수 있는 게
 *   실은 없다 — 같은 번호라도 가족 공유번호일 수 있고(`CustomerDetail` 이 번호 중복을
 *   차단하지 않는 이유다), 다른 번호라도 *번호를 바꾼 같은 사람* 일 수 있다.
 *   자동 제안은 **번호라는 단서가 아예 없어 이름만으로 판단할 수밖에 없는** 경우로 좁히고,
 *   번호가 하나라도 붙은 조합은 사람이 주소록에서 직접 보고 고르게 한다.
 *   (마스킹 고객은 네이버 유입이라 `tel: ''` 이므로, 실제로 걸리는 쪽은 실명 후보다.)
 *
 * 이전 구현은 마스킹 고객을 다리 삼아 실명 고객들까지 한 덩어리로 합쳤다
 * (`김민수1 ↔ 김*수 ↔ 김민수2` → 3명 한 그룹). 그러면 서로 다른 사람일 수 있는
 * 실명 고객끼리 병합돼 데이터가 섞이므로 전이 병합을 하지 않는다.
 */
export function detectMergeGroups(customers: Customer[]): MergeCandidateGroup[] {
    const groups: MergeCandidateGroup[] = [];

    for (const masked of customers) {
        if (!isMaskedName(masked.name)) continue;

        const candidates = customers.filter((c) => (
            c.id !== masked.id
            && !isMaskedName(c.name)
            && isMaskedNameMatch(masked.name, c.name)
        ));
        if (candidates.length === 0) continue;

        const distinctNames = new Set(candidates.map((c) => c.name));
        if (distinctNames.size > 1) continue;

        // 마스킹 고객까지 포함해 한 명이라도 번호가 있으면 자동 제안하지 않는다.
        // 마스킹 고객은 유입 시점엔 `tel: ''` 이지만 주소록 편집에 마스킹 이름 가드가
        // 없어 나중에 채워질 수 있으므로 함께 본다.
        //
        // `normalizeTel` 로 숫자만 남겨 판정한다. 공백·하이픈만 든 값은 번호가 아니라
        // 빈 값으로 봐야, "번호 없음"인 조합이 표기 쓰레기 때문에 제안에서 빠지지 않는다.
        const hasAnyTel = [masked, ...candidates].some((c) => !!normalizeTel(c.tel ?? ''));
        if (hasAnyTel) continue;

        const candidateIds = candidates.map((c) => c.id).sort((a, b) => a - b);
        groups.push({
            key: buildMergeGroupKey(masked.id, candidateIds),
            maskedId: masked.id,
            candidateIds,
        });
    }

    return groups;
}

export interface CustomerReservationSummary {
    count: number;
    /** 가장 최근 예약(날짜·시작시각 기준). 예약이 없으면 null */
    last: Reservation | null;
}

/** 예약이 없는 고객이 "가장 오래된 단골" 비교에서 뒤로 밀리도록 쓰는 감시값 */
const NO_RESERVATION_DATE = '9999';

/**
 * 예약 맵을 **한 번만** 훑어 고객별 예약 건수·최근 예약을 낸다.
 *
 * 고객마다 따로 훑으면 카드 하나당 전체 예약을 두 번(건수·최근 예약) 재순회하게 되고,
 * 라디오를 누를 때마다 그 비용을 다시 치른다.
 */
export function summarizeCustomerReservations(
    customerIds: number[],
    reservationMap: ReservationMap,
): Record<number, CustomerReservationSummary> {
    const summary: Record<number, CustomerReservationSummary> = {};
    for (const id of customerIds) summary[id] = {count: 0, last: null};

    for (const reservations of Object.values(reservationMap)) {
        for (const r of reservations) {
            const entry = summary[r.customerId];
            if (!entry) continue;
            entry.count++;
            const last = entry.last;
            if (!last || r.date > last.date || (r.date === last.date && r.startTime > last.startTime)) {
                entry.last = r;
            }
        }
    }

    return summary;
}

/**
 * 병합 기준 고객 자동 선정
 *
 * 남는 차이는 어느 레코드가 살아남느냐다 — 병합 시 target 의 연락처만 유지되므로
 * 연락처를 가진 쪽을, 그다음으로는 더 오래된 단골을 기본값으로 둔다.
 *
 * 자동 제안(`detectMergeGroups`)이 넘기는 그룹은 아무도 연락처가 없으므로 연락처
 * 분기는 타지 않는다. 그 분기가 실제로 쓰이는 곳은 **주소록의 수동 병합** — 번호가
 * 붙은 조합은 전부 그쪽으로 오기 때문에 여기가 그 경로의 기본값이 된다.
 *
 * 후보가 비어 있으면 호출하지 않는다(그룹 규칙상 최소 1명).
 */
export function selectMergeTarget(
    candidates: Customer[],
    summary: Record<number, CustomerReservationSummary>,
): number {
    const withTel = candidates.filter((c) => c.tel && c.tel.trim());
    if (withTel.length === 1) return withTel[0].id;

    const pool = withTel.length > 0 ? withTel : candidates;
    const lastDateOf = (id: number) => summary[id]?.last?.date ?? NO_RESERVATION_DATE;
    return pool.reduce((best, c) => lastDateOf(c.id) < lastDateOf(best.id) ? c : best).id;
}
