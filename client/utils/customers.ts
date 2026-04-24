import type {ReservationMap} from './reservations';

export type PointHistoryType = 'manual_add' | 'manual_subtract' | 'recharge' | 'payment_use' | 'payment_earn' | 'payment_adjust';

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
    allergyNote?: string;
    claimNote?: string;
    preferenceNote?: string;
}

export type CustomerAlertTone = 'danger' | 'warning' | 'info';

export interface CustomerAlertItem {
    key: 'allergy' | 'claim' | 'preference';
    label: string;
    value: string;
    tone: CustomerAlertTone;
}

export type CustomerMap = Record<number, Customer>;

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

export function getCustomerAlertItems(customer?: Customer | null): CustomerAlertItem[] {
    if (!customer) return [];

    const items: CustomerAlertItem[] = [];

    if (customer.allergyNote?.trim()) {
        items.push({
            key: 'allergy',
            label: '알레르기',
            value: customer.allergyNote.trim(),
            tone: 'danger',
        });
    }

    if (customer.claimNote?.trim()) {
        items.push({
            key: 'claim',
            label: '클레임',
            value: customer.claimNote.trim(),
            tone: 'warning',
        });
    }

    if (customer.preferenceNote?.trim()) {
        items.push({
            key: 'preference',
            label: '선호사항',
            value: customer.preferenceNote.trim(),
            tone: 'info',
        });
    }

    return items;
}
