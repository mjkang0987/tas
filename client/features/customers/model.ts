import type {ReservationMap} from '../reservations/model';

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
}

export type CustomerMap = Record<number, Customer>;

// 저장용 정규화: 숫자만 남긴다(DB엔 숫자만 저장). 표시는 formatTel이 담당.
export function normalizeTel(tel: string): string {
    return tel.replace(/\D/g, '');
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

