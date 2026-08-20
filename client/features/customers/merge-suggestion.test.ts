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
    selectMergeTarget,
    summarizeCustomerReservations,
    telDigits,
} from './merge-suggestion';
import {normalizeTel} from './model';
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
    it('실명 1명 + 마스킹 1명이면 그룹 하나', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수'),
            customer(2, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].maskedId).toBe(2);
        expect(groups[0].candidateIds).toEqual([1]);
    });

    it('같은 이름의 실명이 여러 명이어도 연락처가 없으면 후보로 모두 남긴다 — 누구인지는 사용자가 고른다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수'),
            customer(2, '김민수'),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].maskedId).toBe(3);
        expect(groups[0].candidateIds).toEqual([1, 2]);
    });

    it('연락처가 2종 이상이면 제안하지 않는다 — 동명이인인지 번호를 바꾼 같은 사람인지 알 수 없다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김민수', '01033334444'),
            customer(3, '김*수'),
        ]);

        expect(groups).toEqual([]);
    });

    it('후보가 하나뿐이면 그 후보가 연락처를 가져도 제안한다 — 갈릴 여지가 없다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].candidateIds).toEqual([1]);
    });

    it('한쪽만 연락처가 있으면 제안한다 — 빈 연락처는 "다른 번호"가 아니다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김민수'),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].candidateIds).toEqual([1, 2]);
    });

    it('연락처가 모두 같으면 제안한다 — 한 사람이 두 번 등록된 경우', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김민수', '01011112222'),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].candidateIds).toEqual([1, 2]);
    });

    it('공백뿐인 연락처는 없는 것으로 본다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김민수', '   '),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].candidateIds).toEqual([1, 2]);
    });

    it('표기만 다른 같은 번호는 1종으로 센다 — 하이픈 때문에 제안이 사라지면 안 된다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '010-1111-2222'),
            customer(2, '김민수', '01011112222'),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].candidateIds).toEqual([1, 2]);
    });

    it('마스킹 고객의 번호도 함께 센다 — 실명 후보와 다르면 제안하지 않는다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김*수', '01033334444'),
        ]);

        expect(groups).toEqual([]);
    });

    it('마스킹 고객의 번호가 실명 후보와 같으면 제안한다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김*수', '010-1111-2222'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].maskedId).toBe(2);
    });

    it('실명 이름이 2종 이상이면 제안하지 않는다 — 마스킹이 누구인지 판정 불가', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수'),
            customer(2, '김진수'),
            customer(3, '김*수'),
        ]);

        expect(groups).toEqual([]);
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

    it('실명 고객끼리는 같은 그룹에 들어가지 않는다 (전이 병합 방지)', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수'),
            customer(2, '김민수'),
            customer(3, '김*수'),
        ]);

        // 후보로는 둘 다 뜨지만, 그룹의 source 는 마스킹 1명뿐이라
        // 병합해도 김민수끼리 합쳐지지 않는다.
        expect(groups[0].maskedId).toBe(3);
        expect(groups[0].candidateIds).not.toContain(3);
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

    // 자동 제안(`detectMergeGroups`)은 연락처가 2종 이상이면 그룹을 만들지 않으므로
    // 이 조합은 수동 병합(주소록에서 직접 골라 합치는 경로)에서만 들어온다.
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

// `telDigits` 는 `model.ts` 의 `normalizeTel` 사본이다 — 이 모듈을 순수하게 유지해
// 테스트 커버리지 게이트 대상으로 남기려고 일부러 import 하지 않는다.
// 두 구현이 조용히 갈리지 않도록 여기서 결과를 맞물어 둔다.
describe('telDigits', () => {
    it.each([
        '01011112222',
        '010-1111-2222',
        '010 1111 2222',
        '  ',
        '-',
        '',
        '+82 10-1111-2222',
    ])('normalizeTel 과 같은 결과: %j', (input) => {
        expect(telDigits(input)).toBe(normalizeTel(input));
    });

    it('undefined 는 빈 문자열로 본다 — `normalizeTel` 은 undefined 를 받지 않는다', () => {
        expect(telDigits(undefined)).toBe('');
    });
});
