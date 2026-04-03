export interface DaySchedule {
    enabled: boolean;
    start: string;
    end: string;
}

export type DesignerStatus = '재직' | '휴직' | '퇴직';

export interface Designer {
    id: number;
    name: string;
    schedule: DaySchedule[];
    status?: DesignerStatus;
    phone?: string;
    note?: string;
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

export function getDesignerStatus(designer: Designer): DesignerStatus {
    return designer.status ?? '재직';
}

export function splitDesignersByStatus(designers: Designer[]) {
    return {
        active: designers.filter((designer) => getDesignerStatus(designer) === '재직'),
        onLeave: designers.filter((designer) => getDesignerStatus(designer) === '휴직'),
        resigned: designers.filter((designer) => getDesignerStatus(designer) === '퇴직'),
    };
}

export const DEFAULT_DESIGNERS: Designer[] = [
    {
        id: 1,
        name: '디자이너 1',
        schedule: createDefaultSchedule(),
        status: '재직',
        phone: '',
        note: '',
    },
];
