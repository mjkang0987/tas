// 마스킹 이름 병합 제안의 그룹 규칙.
//
// 이전 구현은 마스킹 고객을 다리 삼아 실명 고객까지 한 덩어리로 합쳤다. 그 결과
// 전화번호가 다른(= 서로 다른 사람일 수 있는) 실명 고객끼리 병합돼 예약·적립금이
// 섞였고, 이름이 아예 다른 `김민수`/`김진수` 가 한 카드에 같이 뜨기도 했다.
// 이 파일은 그 전이 병합이 되살아나지 않는지, 그리고 판정할 수 없는 조합을
// 조용히 제안하지 않는지를 고정한다.

import {describe, expect, it} from 'vitest';

import {
    buildMergeGroupKey,
    detectMergeGroups,
    isMaskedName,
    isMaskedNameMatch,
    isReviewedPair,
    mergeSources,
    selectManualMergeTarget,
    selectMergeTarget,
    summarizeCustomerReservations,
} from './merge-suggestion';
import type {MergeSelection} from './merge-suggestion';
import type {Customer} from './model';
import type {Reservation, ReservationMap} from '../reservations/model';

function customer(id: number, name: string, tel = ''): Customer {
    return {id, name, tel};
}

describe('isMaskedName', () => {
    it('`*` 가 있으면 마스킹으로 본다', () => {
        expect(isMaskedName('김*수')).toBe(true);
        expect(isMaskedName('김민*')).toBe(true);
        expect(isMaskedName('김민수')).toBe(false);
    });
});

describe('isMaskedNameMatch', () => {
    it('마스킹 위치를 무시하고 나머지 글자가 같으면 일치', () => {
        expect(isMaskedNameMatch('김*수', '김민수')).toBe(true);
        expect(isMaskedNameMatch('김민*', '김민수')).toBe(true);
        expect(isMaskedNameMatch('김*수', '김진수')).toBe(true);
    });

    it('길이가 다르면 불일치 — 남궁민수는 김*수와 같은 사람이 아니다', () => {
        expect(isMaskedNameMatch('김*수', '남궁민수')).toBe(false);
    });

    it('마스킹 아닌 자리가 다르면 불일치', () => {
        expect(isMaskedNameMatch('김*수', '박민수')).toBe(false);
    });
});

describe('detectMergeGroups', () => {
    it('실명 1명 + 마스킹 1명이면 제안 하나', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수'),
            customer(2, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].maskedId).toBe(2);
        expect(groups[0].candidateIds).toEqual([1]);
    });

    it('후보가 여럿이면 후보 수만큼 1:1 로 쪼갠다 — 운영에서 이 조합이 통째로 사라졌다', () => {
        const groups = detectMergeGroups([
            customer(204, '이상민', '01094561234'),
            customer(329, '이승민', '01043071234'),
            customer(388, '이유민', '01044431234'),
            customer(389, '이*민'),
        ]);

        expect(groups).toHaveLength(3);
        expect(groups.map((g) => g.candidateIds[0])).toEqual([204, 329, 388]);
        expect(groups.every((g) => g.maskedId === 389)).toBe(true);
    });

    it('동명이인도 1:1 로 쪼갠다 — 라디오로 고르게 하지 않는다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김민수', '01033334444'),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(2);
        expect(groups.map((g) => g.candidateIds[0])).toEqual([1, 2]);
    });

    it('연락처는 제안 여부를 가르지 않는다 — 1:1 이라 번호로 갈릴 일이 없다', () => {
        const withTel = detectMergeGroups([customer(1, '김민수', '01011112222'), customer(2, '김*수')]);
        const withoutTel = detectMergeGroups([customer(1, '김민수'), customer(2, '김*수')]);

        expect(withTel).toHaveLength(1);
        expect(withoutTel).toHaveLength(1);
    });

    it('후보 순서는 id 오름차순 — 큐에 뜨는 순서가 매번 같아야 한다', () => {
        const groups = detectMergeGroups([
            customer(30, '김진수'),
            customer(10, '김민수'),
            customer(20, '김철수'),
            customer(99, '김*수'),
        ]);

        expect(groups.map((g) => g.candidateIds[0])).toEqual([10, 20, 30]);
    });

    it('마스킹이 2명이면 그룹도 2개로 따로 나온다 — 마스킹끼리는 묶지 않는다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수'),
            customer(2, '김민*'),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(2);
        expect(groups.map((g) => g.maskedId).sort((a, b) => a - b)).toEqual([2, 3]);
        for (const group of groups) {
            expect(group.candidateIds).toEqual([1]);
        }
    });

    it('실명 고객끼리는 절대 한 건에 들어가지 않는다 (전이 병합 방지)', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김민수', '01033334444'),
            customer(3, '김*수'),
        ]);

        // 각 건의 source 는 언제나 마스킹 1명, target 은 실명 1명이다.
        for (const g of groups) {
            expect(g.maskedId).toBe(3);
            expect(g.candidateIds).toHaveLength(1);
        }
    });

    it('후보가 전부 마스킹이면 제안하지 않는다', () => {
        expect(detectMergeGroups([
            customer(1, '김민*'),
            customer(2, '김*수'),
        ])).toEqual([]);
    });

    it('마스킹 고객이 없으면 빈 배열', () => {
        expect(detectMergeGroups([
            customer(1, '김민수'),
            customer(2, '박지훈'),
        ])).toEqual([]);
    });

    it('매칭되는 실명이 없는 마스킹 고객은 건너뛴다', () => {
        expect(detectMergeGroups([
            customer(1, '박지훈'),
            customer(2, '김*수'),
        ])).toEqual([]);
    });
});

describe('buildMergeGroupKey', () => {
    it('그룹 전체 ID를 오름차순으로 이어붙인다 (이전 구현과 같은 형식)', () => {
        expect(buildMergeGroupKey(3, [1, 2])).toBe('1-2-3');
        expect(buildMergeGroupKey(1, [3])).toBe('1-3');
    });

    it('같은 그룹이면 마스킹 ID 위치와 무관하게 같은 키', () => {
        expect(buildMergeGroupKey(2, [1])).toBe(buildMergeGroupKey(1, [2]));
    });
});

function reservation(id: number, customerId: number, date: string, startTime = '10:00'): Reservation {
    return {
        id, customerId, date, startTime,
        endTime: '11:00', service: '펌', price: 0, status: 'active',
    };
}

function map(...list: Reservation[]): ReservationMap {
    const out: ReservationMap = {};
    for (const r of list) (out[r.date] ??= []).push(r);
    return out;
}

describe('summarizeCustomerReservations', () => {
    it('요청한 고객만 집계한다', () => {
        const summary = summarizeCustomerReservations([1], map(
            reservation(1, 1, '2026-01-10'),
            reservation(2, 2, '2026-01-11'),
        ));

        expect(Object.keys(summary)).toEqual(['1']);
        expect(summary[1].count).toBe(1);
    });

    it('예약이 없는 고객도 0건으로 자리를 만든다 — 카드가 빈 값을 읽지 않도록', () => {
        const summary = summarizeCustomerReservations([1, 2], map(reservation(1, 1, '2026-01-10')));

        expect(summary[2]).toEqual({count: 0, last: null});
    });

    it('최근 예약은 날짜, 같은 날이면 시작시각으로 고른다', () => {
        const summary = summarizeCustomerReservations([1], map(
            reservation(1, 1, '2026-01-10', '09:00'),
            reservation(2, 1, '2026-01-10', '15:00'),
            reservation(3, 1, '2026-01-09', '20:00'),
        ));

        expect(summary[1].count).toBe(3);
        expect(summary[1].last?.id).toBe(2);
    });
});

describe('selectMergeTarget', () => {
    const summary = (entries: Record<number, string | null>) => Object.fromEntries(
        Object.entries(entries).map(([id, date]) => [
            id,
            {count: date ? 1 : 0, last: date ? reservation(1, Number(id), date) : null},
        ]),
    );

    it('연락처를 가진 후보가 하나뿐이면 그 고객 — 병합 시 target 의 연락처만 살아남는다', () => {
        const target = selectMergeTarget(
            [customer(1, '김민수'), customer(2, '김민수', '01011112222')],
            summary({1: '2026-01-01', 2: '2026-05-01'}),
        );

        expect(target).toBe(2);
    });

    it('연락처가 여럿이면 마지막 예약이 더 과거인 고객 (= 기존 단골)', () => {
        const target = selectMergeTarget(
            [customer(1, '김민수', '01011112222'), customer(2, '김민수', '01033334444')],
            summary({1: '2026-05-01', 2: '2026-01-01'}),
        );

        expect(target).toBe(2);
    });

    it('연락처가 아무에게도 없으면 후보 전체에서 오래된 순으로 고른다', () => {
        const target = selectMergeTarget(
            [customer(1, '김민수'), customer(2, '김민수')],
            summary({1: '2026-05-01', 2: '2026-01-01'}),
        );

        expect(target).toBe(2);
    });

    it('예약이 없는 고객은 뒤로 밀린다 — 오래된 단골로 오해하지 않는다', () => {
        const target = selectMergeTarget(
            [customer(1, '김민수'), customer(2, '김민수')],
            summary({1: null, 2: '2026-05-01'}),
        );

        expect(target).toBe(2);
    });

    it('공백뿐인 연락처는 없는 것으로 본다', () => {
        const target = selectMergeTarget(
            [customer(1, '김민수', '   '), customer(2, '김민수', '01033334444')],
            summary({1: '2026-01-01', 2: '2026-05-01'}),
        );

        expect(target).toBe(2);
    });
});

describe('selectManualMergeTarget', () => {
    const summary = (byId: Record<number, string | null>) => (
        Object.fromEntries(Object.entries(byId).map(([id, date]) => [
            id,
            {count: date ? 1 : 0, last: date ? ({date, startTime: '10:00'} as Reservation) : null},
        ]))
    );

    it('마스킹 이름은 기준에서 뺀다 — 합쳐도 `김*수` 가 남으면 병합할 이유가 없다', () => {
        const target = selectManualMergeTarget(
            [customer(1, '김*수'), customer(2, '김민수')],
            summary({1: '2026-01-01', 2: '2026-05-01'}),
        );

        expect(target).toBe(2);
    });

    it('실명이 없으면 마스킹끼리 고른다 — 고를 것이 그것뿐이다', () => {
        const target = selectManualMergeTarget(
            [customer(1, '김*수'), customer(2, '김민*')],
            summary({1: '2026-05-01', 2: '2026-01-01'}),
        );

        expect(target).toBe(2);
    });

    it('실명끼리는 자동 제안과 같은 규칙으로 고른다 — 연락처 가진 쪽', () => {
        const customers = [customer(1, '김민수'), customer(2, '김민수', '01011112222')];
        const s = summary({1: '2026-01-01', 2: '2026-05-01'});

        expect(selectManualMergeTarget(customers, s)).toBe(selectMergeTarget(customers, s));
    });
});

describe('mergeSources', () => {
    const base = (mode: MergeSelection['mode'], maskedSource: MergeSelection['maskedSource']): MergeSelection => ({
        key: 'k',
        mode,
        maskedSource,
        targetChoices: [customer(1, '김민수'), customer(2, '김민수')],
        targetId: 1,
    });

    it('자동 제안은 기준을 바꿔도 마스킹 고객 1명만 흡수한다', () => {
        const selection = base('suggestion', customer(3, '김*수'));

        expect(mergeSources(selection, 1).map((c) => c.id)).toEqual([3]);
        expect(mergeSources(selection, 2).map((c) => c.id)).toEqual([3]);
    });

    it('수동 병합은 기준으로 고르지 않은 고객이 전부 흡수된다', () => {
        const selection = base('manual', null);

        expect(mergeSources(selection, 1).map((c) => c.id)).toEqual([2]);
        expect(mergeSources(selection, 2).map((c) => c.id)).toEqual([1]);
    });
});

describe('isReviewedPair', () => {
    it('같은 키면 이미 본 것', () => {
        expect(isReviewedPair('204-389', ['204-389'])).toBe(true);
    });

    it('옛 묶음 키가 두 id 를 다 담고 있으면 이미 본 것 — 쪼개면서 기록이 날아가면 안 된다', () => {
        expect(isReviewedPair('204-389', ['204-329-388-389'])).toBe(true);
        expect(isReviewedPair('329-389', ['204-329-388-389'])).toBe(true);
        expect(isReviewedPair('388-389', ['204-329-388-389'])).toBe(true);
    });

    it('한쪽 id 만 겹치면 본 적 없는 것', () => {
        expect(isReviewedPair('204-389', ['204-500'])).toBe(false);
        expect(isReviewedPair('204-389', ['389-500'])).toBe(false);
    });

    it('기록이 비어 있으면 false', () => {
        expect(isReviewedPair('204-389', [])).toBe(false);
    });

    it('부분 문자열에 속지 않는다 — id 단위로 비교한다', () => {
        // '4-89' 는 '204-389' 의 부분 문자열이지만 id 로는 4·89 라 무관하다.
        expect(isReviewedPair('4-89', ['204-389'])).toBe(false);
    });
});
