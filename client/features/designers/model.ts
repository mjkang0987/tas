export interface DaySchedule {
    enabled: boolean;
    start: string;
    end: string;
}

export type DesignerStatus = '재직' | '휴직' | '퇴직';

export type DesignerStatusMeta = {
    label: DesignerStatus;
    accent: string;
    tint: string;
    border: string;
};

const DEFAULT_DESIGNER_COLORS = [
    '#2D7FF9',
    '#E85D75',
    '#00A896',
    '#FB8C00',
    '#6D6F78',
    '#7E57C2',
];

export interface Designer {
    id: number;
    name: string;
    schedule: DaySchedule[];
    status?: DesignerStatus;
    phone?: string;
    note?: string;
    color?: string;
}

export type DesignerAvailabilityState =
    | {kind: 'available'}
    | {kind: 'off-day'; message: string}
    | {kind: 'outside-hours'; message: string};

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

export function getDesignerStatusMeta(status: DesignerStatus): DesignerStatusMeta {
    if (status === '휴직') {
        return {
            label: status,
            accent: '#D97706',
            tint: '#FFF7ED',
            border: '#F5D0A5',
        };
    }

    if (status === '퇴직') {
        return {
            label: status,
            accent: '#6B7280',
            tint: '#F3F4F6',
            border: '#D1D5DB',
        };
    }

    return {
        label: status,
        accent: '#137333',
        tint: '#EAF7EE',
        border: '#B7E1C2',
    };
}

export function isDesignerBookable(designer: Designer | null | undefined): boolean {
    return !!designer && getDesignerStatus(designer) === '재직';
}

export function splitDesignersByStatus(designers: Designer[]) {
    const sorted = sortDesigners(designers);
    return {
        active: sorted.filter((designer) => getDesignerStatus(designer) === '재직'),
        onLeave: sorted.filter((designer) => getDesignerStatus(designer) === '휴직'),
        resigned: sorted.filter((designer) => getDesignerStatus(designer) === '퇴직'),
    };
}

export function getDesignerColor(designer: Pick<Designer, 'id' | 'color'> | null | undefined): string {
    if (designer?.color) return designer.color;
    if (!designer) return '#8E8E93';
    return DEFAULT_DESIGNER_COLORS[Math.abs(designer.id) % DEFAULT_DESIGNER_COLORS.length];
}

function getScheduleIndexFromDate(date: string): number | null {
    if (!date) return null;

    const parsed = new Date(`${date}T00:00:00`);
    const day = parsed.getDay();

    if (Number.isNaN(day)) return null;

    return (day + 6) % 7;
}

export function getDesignerScheduleForDate(designer: Designer | undefined, date: string): DaySchedule | null {
    if (!designer) return null;

    const scheduleIndex = getScheduleIndexFromDate(date);
    if (scheduleIndex == null) return null;

    return designer.schedule[scheduleIndex] ?? null;
}

export function getDesignerAvailabilityState(
    designers: Designer[],
    designerId: number | undefined,
    date: string,
    startTime: string,
    endTime: string
): DesignerAvailabilityState {
    if (!designerId) return {kind: 'available'};

    const designer = designers.find((item) => item.id === designerId);
    if (!designer) return {kind: 'available'};

    const schedule = getDesignerScheduleForDate(designer, date);
    if (!schedule || !schedule.enabled) {
        return {kind: 'off-day', message: `${designer.name} 디자이너 휴무일입니다.`};
    }

    if (startTime < schedule.start || endTime > schedule.end) {
        return {
            kind: 'outside-hours',
            message: `${designer.name} 디자이너 근무시간은 ${schedule.start}~${schedule.end}입니다.`,
        };
    }

    return {kind: 'available'};
}

export function getDesignerAvailabilityError(
    designers: Designer[],
    designerId: number | undefined,
    date: string,
    startTime: string,
    endTime: string
): string {
    const availability = getDesignerAvailabilityState(designers, designerId, date, startTime, endTime);
    return availability.kind === 'available' ? '' : availability.message;
}

const designerNameOrder = (name: string) => /^[a-zA-Z]/.test(name) ? 0 : /^[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(name) ? 1 : 2;

export function compareDesignerName(a: string, b: string): number {
    const oa = designerNameOrder(a), ob = designerNameOrder(b);
    return oa !== ob ? oa - ob : a.localeCompare(b, 'ko');
}

export function sortDesigners<T extends { name: string }>(list: T[]): T[] {
    return [...list].sort((a, b) => compareDesignerName(a.name, b.name));
}

export function buildDesignerNameMap(designers: Designer[], includeUnassigned?: boolean): Record<number, string> {
    const map: Record<number, string> = includeUnassigned ? {0: '미지정'} : {};
    for (const designer of designers) {
        map[designer.id] = designer.name;
    }
    return map;
}

export function buildDesignerColorMap(designers: Designer[]): Record<number, string> {
    const map: Record<number, string> = {};
    for (const designer of designers) {
        map[designer.id] = getDesignerColor(designer);
    }
    return map;
}

export const DEFAULT_DESIGNERS: Designer[] = [
    {
        id: 1,
        name: '디자이너 1',
        schedule: createDefaultSchedule(),
        status: '재직',
        phone: '',
        note: '',
        color: getDesignerColor({id: 1}),
    },
];
