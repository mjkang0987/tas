import type {Reservation, ReservationMap} from '../reservations/model';

export type PointHistoryType = 'manual_add' | 'manual_subtract' | 'recharge' | 'payment_use' | 'payment_earn' | 'payment_adjust';

export const POINT_HISTORY_LABELS: Record<PointHistoryType, string> = {
    manual_add: '수동 적립',
    manual_subtract: '수동 차감',
    recharge: '충전',
    payment_use: '결제 사용',
    payment_earn: '결제 적립',
    payment_adjust: '적립 조정',
};

export interface PointHistoryEntry {
    id: string;
    type: PointHistoryType;
    delta: number;
    balance: number;
    description: string;
    createdAt: string;
    relatedReservationId?: number;
}

export interface CustomerMemoTag {
    text: string;
    color: string;
}

export interface Customer {
    id: number;
    name: string;
    tel: string;
    points?: number;
    firstVisitDate?: string | null;
    pointHistories?: PointHistoryEntry[];
    memoTags?: CustomerMemoTag[];
    /** 삭제(익명 처리)된 고객. 행은 예약(시술 내역·매출)을 붙들고 남고, 개인정보는 비어 있다 */
    deleted?: boolean;
}

export type CustomerMap = Record<number, Customer>;

/** 삭제(익명 처리)된 고객의 표시 이름 */
export const DELETED_CUSTOMER_NAME = '삭제된 고객';

/**
 * 고르는 목록(검색·자동완성·병합 제안·비슷한 고객·적립금)에 낼 고객인가.
 * 삭제된 고객은 customerMap 에서 **빼지 않는다** — 예약 카드가 id로 찾아 "삭제된 고객"을 보여야 하고,
 * 새 고객 번호가 (최댓값 + 1)이라 빼면 그 번호가 재사용돼 익명 행을 새 고객이 덮어쓴다.
 */
export function isSelectableCustomer(customer: Customer): boolean {
    return !customer.deleted;
}

/** 고르는 목록에 낼 고객 배열(삭제 고객 제외). 목록을 새로 만들 때는 `Object.values(customerMap)` 대신 이걸 쓴다 */
export function getSelectableCustomers(customerMap: CustomerMap): Customer[] {
    return Object.values(customerMap).filter(isSelectableCustomer);
}

/**
 * 고객 삭제 = 익명 처리. 서버 `DELETE /api/customers`와 같은 규칙(화면 즉시 반영·게스트 모드용).
 * 이름·연락처·메모·적립금은 지우고, 예약(시술 내역)은 남긴다.
 */
export function anonymizeCustomer(customer: Customer): Customer {
    return {
        id: customer.id,
        name: DELETED_CUSTOMER_NAME,
        tel: '',
        points: 0,
        firstVisitDate: null,
        pointHistories: [],
        memoTags: [],
        deleted: true,
    };
}

/** 삭제된 고객의 예약에서 개인정보가 담길 수 있는 칸(메모·네이버 예약 링크)을 비운다. 시술 내역은 그대로 */
export function anonymizeCustomerReservation(reservation: Reservation): Reservation {
    return {...reservation, memo: undefined, naverBookingUrl: undefined};
}

// 저장용 정규화: 숫자만 남긴다(DB엔 숫자만 저장). 표시는 formatTel이 담당.
export function normalizeTel(tel: string): string {
    return tel.replace(/\D/g, '');
}

/**
 * 이름과 연락처가 **둘 다** 같은 기존 고객(삭제 고객 제외). 예약 추가에서 추천을 누르지 않고 기존 고객을 그대로 입력했을 때
 * 새 고객이 또 생기지 않게 쓴다. 연락처만 같으면 가족 공유번호일 수 있어 같은 사람으로 보지 않는다(이름만 같으면 동명이인).
 */
export function findExactCustomer(customers: Customer[], name: string, tel: string): Customer | undefined {
    const trimmedName = name.trim();
    const normalizedTel = normalizeTel(tel);
    if (!trimmedName || !normalizedTel) return undefined;
    return customers.find((c) => isSelectableCustomer(c) && c.name.trim() === trimmedName && normalizeTel(c.tel) === normalizedTel);
}

export function formatTel(tel: string): string {
    const digits = tel.replace(/\D/g, '');
    if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    return tel;
}

// 고객명 정렬 기준(한글 가나다순). `Intl.Collator('ko')`가 한글·라틴·숫자를 한 규칙으로
// 비교하므로 코드포인트 비교(`<`)처럼 '가' 앞에 'Z'가 끼는 문제가 없다.
const customerNameCollator = new Intl.Collator('ko', {numeric: true});

// 이름이 같으면(동명이인) id로 갈라 정렬을 안정화한다.
export function compareCustomerName(a: Customer, b: Customer): number {
    return customerNameCollator.compare(a.name, b.name) || a.id - b.id;
}

// 원본을 건드리지 않고 이름 오름차순 사본을 돌려준다.
export function sortCustomersByName(list: Customer[]): Customer[] {
    return [...list].sort(compareCustomerName);
}

export function toCustomerMap(list: Customer[]): CustomerMap {
    const map: CustomerMap = {};

    for (const item of list) {
        map[item.id] = item;
    }

    return map;
}

export function syncCustomerFirstVisitDates(customerMap: CustomerMap, reservationMap: ReservationMap): CustomerMap {
    const firstVisitByCustomer = new Map<number, string>();

    for (const [dateKey, reservations] of Object.entries(reservationMap)) {
        for (const reservation of reservations) {
            if (reservation.status === 'cancelled' || reservation.status === 'noshow') continue;
            const existingDate = firstVisitByCustomer.get(reservation.customerId);
            if (!existingDate || dateKey < existingDate) {
                firstVisitByCustomer.set(reservation.customerId, dateKey);
            }
        }
    }

    return Object.fromEntries(
        Object.entries(customerMap).map(([id, customer]) => {
            const customerId = Number(id);
            return [
                customerId,
                {
                    ...customer,
                    firstVisitDate: firstVisitByCustomer.get(customerId) ?? null,
                },
            ];
        })
    );
}

export function syncCustomerFirstVisitDateList(customers: Customer[], reservationMap: ReservationMap): Customer[] {
    const nextCustomerMap = syncCustomerFirstVisitDates(toCustomerMap(customers), reservationMap);
    return customers.map((customer) => nextCustomerMap[customer.id] ?? customer);
}

export function isNewCustomerVisit(firstVisitDate: string | null | undefined, reservationDate?: string): boolean {
    if (!firstVisitDate) return false;
    if (!reservationDate) return false;
    return firstVisitDate === reservationDate;
}

export function appendPointHistories(
    customer: Customer,
    histories: Array<Omit<PointHistoryEntry, 'id' | 'balance' | 'createdAt'>>
): Customer {
    if (histories.length === 0) return customer;

    let currentBalance = customer.points ?? 0;
    const nextHistories = [...(customer.pointHistories ?? [])];

    histories.forEach((history, index) => {
        currentBalance += history.delta;
        nextHistories.push({
            ...history,
            id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            balance: currentBalance,
            createdAt: new Date().toISOString(),
        });
    });

    return {
        ...customer,
        pointHistories: nextHistories,
    };
}

/** 바뀐 고객만 받아 전체 목록에 반영(같은 번호는 교체, 없으면 추가). 게스트 저장소에 일부 고객만 넘겨도 나머지를 지우지 않게 */
export function mergeCustomersById(current: Customer[], updates: Customer[]): Customer[] {
    const byId = new Map(updates.map((c) => [c.id, c]));
    const merged = current.map((c) => byId.get(c.id) ?? c);
    const existing = new Set(current.map((c) => c.id));
    return [...merged, ...updates.filter((c) => !existing.has(c.id))];
}
