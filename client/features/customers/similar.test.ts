import {describe, expect, it} from 'vitest';

import {findSimilarCustomers} from './similar';
import type {Customer} from './model';

function makeCustomer(id: number, name: string, tel: string): Customer {
    return {id, name, tel} as Customer;
}

const CUSTOMERS = [
    makeCustomer(1, '김민수', '010-1111-2222'),
    makeCustomer(2, '김민지', '010-3333-4444'),
    makeCustomer(3, '박서준', '010-1111-9999'),
    makeCustomer(4, '김*수', '01011112222'),
];

describe('findSimilarCustomers', () => {
    it('번호가 너무 짧으면 아무도 걸리지 않는다 — 010 으로 전 고객이 뜨면 추천이 아니다', () => {
        expect(findSimilarCustomers({customers: CUSTOMERS, name: '', tel: '010'})).toEqual([]);
    });

    it('이름이 한 글자면 걸리지 않는다 — 성씨만으로 무더기가 뜬다', () => {
        expect(findSimilarCustomers({customers: CUSTOMERS, name: '김', tel: ''})).toEqual([]);
    });

    it('이름·번호가 다 비면 빈 결과', () => {
        expect(findSimilarCustomers({customers: CUSTOMERS, name: '  ', tel: ' '})).toEqual([]);
    });

    it('번호 부분 일치 — 입력이 아직 완성되지 않아도 찾는다', () => {
        const found = findSimilarCustomers({customers: CUSTOMERS, name: '', tel: '01011112'});
        expect(found.map((m) => m.customer.id)).toEqual([1, 4]);
        expect(found.every((m) => m.matchedBy.tel)).toBe(true);
    });

    it('하이픈 유무와 무관하게 같은 번호로 본다', () => {
        const found = findSimilarCustomers({customers: CUSTOMERS, name: '', tel: '010-1111-2222'});
        expect(found.map((m) => m.customer.id)).toEqual([1, 4]);
    });

    it('이름 부분 일치와 초성 둘 다 걸린다', () => {
        const byPart = findSimilarCustomers({customers: CUSTOMERS, name: '김민', tel: ''});
        expect(byPart.map((m) => m.customer.id)).toEqual([1, 2]);

        const byChosung = findSimilarCustomers({customers: CUSTOMERS, name: 'ㄱㅁㅅ', tel: ''});
        expect(byChosung.map((m) => m.customer.id)).toContain(1);
    });

    it('자기 자신은 후보에서 뺀다', () => {
        const found = findSimilarCustomers({
            customers: CUSTOMERS, excludeId: 1, name: '김민수', tel: '010-1111-2222',
        });
        expect(found.map((m) => m.customer.id)).not.toContain(1);
    });

    it('번호가 이름보다 앞선다 — 둘 다 걸린 쪽이 맨 위', () => {
        const ranked = [
            makeCustomer(1, '김민수', '01011112222'),   // 이름·번호 둘 다
            makeCustomer(2, '김민수영', '01099998888'), // 이름만
            makeCustomer(3, '박서준', '010111122229'),  // 번호만(입력이 저장된 번호의 앞부분)
        ];
        const found = findSimilarCustomers({customers: ranked, name: '김민수', tel: '01011112222'});

        expect(found.map((m) => m.customer.id)).toEqual([1, 3, 2]);
        expect(found[0].matchedBy).toEqual({tel: true, name: true});
        expect(found[1].matchedBy).toEqual({tel: true, name: false});
        expect(found[2].matchedBy).toEqual({tel: false, name: true});
    });

    it('이름이 서로 부분 문자열이 아니면 걸리지 않는다 — 김민지는 김민수의 후보가 아니다', () => {
        const found = findSimilarCustomers({customers: CUSTOMERS, excludeId: 1, name: '김민수', tel: ''});
        expect(found.map((m) => m.customer.id)).not.toContain(2);
    });

    it('limit 을 넘지 않는다', () => {
        const many = Array.from({length: 20}, (_, i) => makeCustomer(i + 100, `김테스트${i}`, ''));
        const found = findSimilarCustomers({customers: many, name: '김테스트', tel: '', limit: 3});
        expect(found).toHaveLength(3);
    });

    it('번호가 없는 고객은 번호로 걸리지 않는다', () => {
        const noTel = [makeCustomer(9, '무번호', '')];
        expect(findSimilarCustomers({customers: noTel, name: '', tel: '01011112222'})).toEqual([]);
    });
});
