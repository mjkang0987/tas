export interface DaySchedule {
    enabled: boolean;
    start: string;
    end: string;
}

export interface Designer {
    id: number;
    name: string;
    schedule: DaySchedule[];
}

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export function createDefaultSchedule(): DaySchedule[] {
    return WEEKDAY_LABELS.map((_, index) => {
        const isWeekday = index < 5;

        return {
            enabled: isWeekday,
            start: '10:00',
            end: '20:00',
        };
    });
}

export const DEFAULT_DESIGNERS: Designer[] = [
    {
        id: 1,
        name: '디자이너 1',
        schedule: createDefaultSchedule(),
    },
];
