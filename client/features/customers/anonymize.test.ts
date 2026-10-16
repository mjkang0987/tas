import {describe, expect, it} from 'vitest';

import {
    anonymizeCustomer,
    anonymizeCustomerReservation,
    DELETED_CUSTOMER_NAME,
    isSelectableCustomer,
} from './model';
import type {Customer} from './model';
import type {Reservation} from '../reservations/model';

const customer: Customer = {
    id: 7,
    name: '강지우',
    tel: '01077778888',
    points: 500,
    firstVisitDate: '2026-02-03',
    pointHistories: [{id: 'p1', type: 'payment_earn', delta: 500, balance: 500, description: '적립', createdAt: '2026-02-03T00:00:00.000Z'}],
    memoTags: [{text: '앞머리 짧게', color: '#000'}],
};

describe('anonymizeCustomer', () => {
    it('이름은 삭제된 고객, 개인정보·메모·적립금은 비운다', () => {
        expect(anonymizeCustomer(customer)).toEqual({
            id: 7,
            name: DELETED_CUSTOMER_NAME,
            tel: '',
            points: 0,
            firstVisitDate: null,
            pointHistories: [],
            memoTags: [],
            deleted: true,
        });
    });

    it('번호(id)는 유지한다 — 예약이 이 번호로 고객을 찾는다', () => {
        expect(anonymizeCustomer(customer).id).toBe(customer.id);
    });
});

describe('isSelectableCustomer', () => {
    it('삭제된 고객은 고르는 목록에서 뺀다', () => {
        expect(isSelectableCustomer(customer)).toBe(true);
        expect(isSelectableCustomer(anonymizeCustomer(customer))).toBe(false);
    });
});

describe('anonymizeCustomerReservation', () => {
    it('메모·네이버 예약 링크만 비우고 시술 내역은 남긴다', () => {
        const reservation = {
            id: 1, customerId: 7, date: '2026-10-13', startTime: '14:30', endTime: '16:30',
            service: '디자인펌', price: 100000, memo: '010-7777-8888 으로 연락', naverBookingId: 'N1',
            naverBookingUrl: 'https://booking.naver.com/x',
        } as unknown as Reservation;
        const result = anonymizeCustomerReservation(reservation);
        expect(result.memo).toBeUndefined();
        expect(result.naverBookingUrl).toBeUndefined();
        expect(result.naverBookingId).toBe('N1');
        expect(result.price).toBe(100000);
        expect(result.date).toBe('2026-10-13');
    });
});
