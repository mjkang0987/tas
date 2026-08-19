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
} from './merge-suggestion';
import type {Customer} from './model';

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

    it('같은 이름의 실명이 여러 명이면 후보로 모두 남긴다 — 누구인지는 사용자가 고른다', () => {
        const groups = detectMergeGroups([
            customer(1, '김민수', '01011112222'),
            customer(2, '김민수', '01033334444'),
            customer(3, '김*수'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].maskedId).toBe(3);
        expect(groups[0].candidateIds).toEqual([1, 2]);
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
    it('그룹 전체 ID를 오름차순으로 이어붙인다 (기존 검토 기록과 형식 호환)', () => {
        expect(buildMergeGroupKey(3, [1, 2])).toBe('1-2-3');
        expect(buildMergeGroupKey(1, [3])).toBe('1-3');
    });

    it('같은 그룹이면 마스킹 ID 위치와 무관하게 같은 키', () => {
        expect(buildMergeGroupKey(2, [1])).toBe(buildMergeGroupKey(1, [2]));
    });
});
