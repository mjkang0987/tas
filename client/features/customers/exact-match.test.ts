import {describe, expect, it} from 'vitest';

import {anonymizeCustomer, findExactCustomer, mergeCustomersById} from './model';
import type {Customer} from './model';

const mom: Customer = {id: 1, name: '김민지', tel: '01012345678'};
const daughter: Customer = {id: 2, name: '이수아', tel: '01012345678'};

describe('findExactCustomer', () => {
    it('이름과 연락처가 둘 다 같으면 그 고객', () => {
        expect(findExactCustomer([mom, daughter], ' 김민지 ', '010-1234-5678')?.id).toBe(1);
    });

    it('연락처만 같으면(가족 공유번호) 같은 사람으로 보지 않는다', () => {
        expect(findExactCustomer([mom], '박서준', '01012345678')).toBeUndefined();
    });

    it('이름만 같으면(동명이인) 같은 사람으로 보지 않는다', () => {
        expect(findExactCustomer([mom], '김민지', '01099998888')).toBeUndefined();
    });

    it('연락처가 비어 있으면 찾지 않고, 삭제된 고객은 빼고 찾는다', () => {
        expect(findExactCustomer([mom], '김민지', '')).toBeUndefined();
        expect(findExactCustomer([anonymizeCustomer(mom)], '삭제된 고객', '')).toBeUndefined();
    });
});

describe('mergeCustomersById', () => {
    it('바뀐 고객만 교체하고 나머지는 그대로 둔다(추가된 고객은 뒤에)', () => {
        const edited = {...mom, points: 5000};
        const added: Customer = {id: 3, name: '박서준', tel: '01055556666'};
        expect(mergeCustomersById([mom, daughter], [edited, added])).toEqual([edited, daughter, added]);
    });
});
