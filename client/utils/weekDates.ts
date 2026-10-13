import {ViewType} from './constants';

/** 주·3일 뷰가 그리는 날짜들. 주는 일요일 시작 7일, 3일은 기준일부터 3일. */
export function getRangeDates(full: Date | null, type: string): Date[] {
    if (!full) return [];

    const baseDate = new Date(full);

    if (type === ViewType.Week) {
        const startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() - baseDate.getDay());

        return Array.from({length: 7}, (_, index) => {
            const nextDate = new Date(startDate);
            nextDate.setDate(startDate.getDate() + index);
            return nextDate;
        });
    }

    if (type === ViewType.Three) {
        return Array.from({length: 3}, (_, index) => {
            const nextDate = new Date(baseDate);
            nextDate.setDate(baseDate.getDate() + index);
            return nextDate;
        });
    }

    return [];
}
