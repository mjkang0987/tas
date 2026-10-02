import {matchesChosung} from './chosung';
import {normalizeTel} from './model';
import type {Customer} from './model';

/**
 * 번호 매칭에 필요한 최소 자릿수. 3자리면 `010` 으로 거의 모든 고객이 걸려
 * 추천이 아니라 잡음이 된다. 국내 번호에서 앞 3자리 뒤 첫 묶음이 시작되는 지점이다.
 */
const MIN_TEL_DIGITS = 4;

/** 이름 매칭 최소 글자수. 한 글자면 성씨만으로 무더기가 걸린다. */
const MIN_NAME_CHARS = 2;

export interface SimilarCustomer {
    customer: Customer;
    /** 무엇이 걸렸는지 — 화면이 이유를 보여줄 수 있게 남긴다. */
    matchedBy: {tel: boolean; name: boolean};
}

export interface FindSimilarCustomersInput {
    customers: Customer[];
    /** 편집 중인 고객. 자기 자신은 후보에서 뺀다. */
    excludeId?: number;
    name: string;
    tel: string;
    limit?: number;
}

/**
 * 편집 중인 이름·번호로 비슷한 고객을 찾는다.
 *
 * 저장 시점의 중복 경고(`CustomerDetail`)는 번호 **완전 일치**만 본다. 이건 입력 도중에
 * 쓰는 것이라 부분 일치를 허용하고, 이름 쪽 신호도 함께 본다 — 네이버예약 유입으로
 * `김*수` 같은 마스킹 고객이 섞여 있어 번호만으로는 같은 사람을 놓친다.
 *
 * 이름 규칙은 `pages/address.tsx` 의 검색과 같다(부분 일치 + 초성).
 */
export function findSimilarCustomers({
    customers,
    excludeId,
    name,
    tel,
    limit = 5,
}: FindSimilarCustomersInput): SimilarCustomer[] {
    const nameTerm = name.trim().toLowerCase();
    const telTerm = normalizeTel(tel);

    const useName = nameTerm.length >= MIN_NAME_CHARS;
    const useTel = telTerm.length >= MIN_TEL_DIGITS;
    if (!useName && !useTel) return [];

    const matches: SimilarCustomer[] = [];

    for (const customer of customers) {
        if (customer.id === excludeId) continue;

        // 입력이 아직 짧을 수 있으니 양방향으로 본다 — 저장된 번호가 더 길 수도,
        // 입력이 더 길 수도 있다(하이픈 유무로 길이가 갈리는 기존 데이터가 있다).
        const candidateTel = normalizeTel(customer.tel ?? '');
        const tel_ = useTel && candidateTel.length > 0
            && (candidateTel.includes(telTerm) || telTerm.includes(candidateTel));

        const candidateName = (customer.name ?? '').toLowerCase();
        const name_ = useName
            && (candidateName.includes(nameTerm) || matchesChosung(customer.name ?? '', nameTerm));

        if (tel_ || name_) matches.push({customer, matchedBy: {tel: tel_, name: name_}});
    }

    // 번호가 이름보다 강한 신호다 — 동명이인은 흔하지만 같은 번호는 대개 같은 사람이다.
    // 둘 다 걸린 것을 맨 위로, 그다음 번호, 그다음 이름.
    const rank = (m: SimilarCustomer) => (m.matchedBy.tel ? 2 : 0) + (m.matchedBy.name ? 1 : 0);
    return matches
        .sort((a, b) => rank(b) - rank(a) || a.customer.id - b.customer.id)
        .slice(0, limit);
}
