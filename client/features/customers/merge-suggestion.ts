import type {Reservation, ReservationMap} from '../reservations/model';
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
    /** 합쳐져 사라질 마스킹 고객 */
    maskedId: number;
    /** 기준이 될 실명 고객. **항상 1명** — 제안은 언제나 1:1 이다 */
    candidateIds: [number];
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
 * 마스킹 이름 패턴으로 병합 제안을 만든다. **한 건은 언제나 마스킹 1명 : 실명 1명.**
 *
 * 규칙:
 * - 마스킹끼리는 묶지 않는다. 기준이 될 실명이 없으면 병합할 수 없다.
 * - 마스킹 하나에 실명 후보가 여럿이면 **후보 수만큼 별건으로 낸다.**
 *   `이*민` + `이상민`/`이승민`/`이유민` → 3건. 큐가 순차로 하나씩 띄우고,
 *   각 건은 "이 사람이 맞나요?" 라는 독립된 예/아니오다.
 * - 후보 이름이 같든(동명이인) 다르든 구분하지 않는다. 둘 다 1:1 이다.
 *
 * **왜 묶지 않는가** — 예전엔 후보를 한 카드에 모아 라디오로 고르게 했고, 이름이
 * 2종 이상이면 "누구인지 판정 불가"로 아예 접었다. 그런데 고객이 수백 명이면
 * `이*민` 은 `이O민` 전부와 매칭되므로 **거의 항상 2종 이상이 되어 제안이 사라진다**
 * (운영 264명에서 실제로 그랬다). 판정은 어차피 사람이 하는 것이라, 묶어서 접는
 * 대신 하나씩 물어본다.
 *
 * 이전 구현은 마스킹 고객을 다리 삼아 실명 고객들까지 한 덩어리로 합쳤다
 * (`김민수1 ↔ 김*수 ↔ 김민수2` → 3명 한 그룹). 그러면 서로 다른 사람일 수 있는
 * 실명 고객끼리 병합돼 데이터가 섞이므로 전이 병합을 하지 않는다.
 */
export function detectMergeGroups(customers: Customer[]): MergeCandidateGroup[] {
    const groups: MergeCandidateGroup[] = [];

    for (const masked of customers) {
        if (!isMaskedName(masked.name)) continue;

        const candidates = customers
            .filter((c) => (
                c.id !== masked.id
                && !isMaskedName(c.name)
                && isMaskedNameMatch(masked.name, c.name)
            ))
            .sort((a, b) => a.id - b.id);

        for (const candidate of candidates) {
            groups.push({
                key: buildMergeGroupKey(masked.id, [candidate.id]),
                maskedId: masked.id,
                candidateIds: [candidate.id],
            });
        }
    }

    return groups;
}

/**
 * 이 제안을 이미 건너뛴 적이 있는가.
 *
 * 예전엔 후보 여럿을 한 건으로 묶어 키가 `'204-329-388-389'` 처럼 길었다. 1:1 로
 * 쪼개면 키가 `'204-389'` 가 되어 옛 기록과 문자열이 안 맞고, **건너뛴 제안이
 * 전부 되살아난다**(운영에 126건이 쌓여 있었다).
 *
 * 그래서 문자열 일치가 아니라 **id 포함 관계**로 본다 — 옛 키가 이 쌍의 두 id를
 * 모두 담고 있으면 그때 같이 보여준 조합이므로 이미 판단한 것으로 친다.
 */
export function isReviewedPair(key: string, reviewedKeys: Iterable<string>): boolean {
    const ids = key.split('-');

    for (const reviewed of reviewedKeys) {
        if (reviewed === key) return true;
        const reviewedIds = new Set(reviewed.split('-'));
        if (ids.every((id) => reviewedIds.has(id))) return true;
    }

    return false;
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
 * 후보는 전부 마스킹 없는 실명이고 이름 값도 같으므로 이름으로는 갈리지 않는다.
 * 남는 차이는 어느 레코드가 살아남느냐다 — 병합 시 target 의 연락처만 유지되므로
 * 연락처를 가진 쪽을, 그다음으로는 더 오래된 단골을 기본값으로 둔다.
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
