export interface Customer {
    id: number;
    name: string;
    tel: string;
    points?: number;
}

export type CustomerMap = Record<number, Customer>;

export function toCustomerMap(list: Customer[]): CustomerMap {
    const map: CustomerMap = {};

    for (const item of list) {
        map[item.id] = item;
    }

    return map;
}
