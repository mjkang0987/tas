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
    /** 기준이 될 수 있는 실명 고객. 1명 이상이며 이름 값은 모두 같다 */
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

        const candidateIds = candidates.map((c) => c.id).sort((a, b) => a - b);
        groups.push({
            key: buildMergeGroupKey(masked.id, candidateIds),
            maskedId: masked.id,
            candidateIds,
        });
    }

    return groups;
}
