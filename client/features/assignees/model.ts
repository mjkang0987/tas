export interface DaySchedule {
    enabled: boolean;
    start: string;
    end: string;
}

export type AssigneeStatus = '재직' | '휴직' | '퇴직';

export type AssigneeStatusMeta = {
    label: AssigneeStatus;
    accent: string;
    tint: string;
    border: string;
};

const DEFAULT_ASSIGNEE_COLORS = [
    '#2D7FF9',
    '#E85D75',
    '#00A896',
    '#FB8C00',
    '#6D6F78',
    '#7E57C2',
];

export interface Assignee {
    id: number;
    name: string;
    // 공개 예약 페이지 다국어 표시용(오너 입력, {en?,ja?,zh?}). 식별은 id, 표시만 번역.
    nameI18n?: {en?: string | null; ja?: string | null; zh?: string | null} | null;
    schedule: DaySchedule[];
    status?: AssigneeStatus;
    phone?: string;
    note?: string;
    color?: string;
}

export type AssigneeAvailabilityState =
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

export function getAssigneeStatus(assignee: Assignee): AssigneeStatus {
    return assignee.status ?? '재직';
}

export function getAssigneeStatusMeta(status: AssigneeStatus): AssigneeStatusMeta {
    if (status === '휴직') {
        return {
            label: status,
            accent: 'var(--warning-text)',
            tint: 'var(--warning-bg-soft)',
            border: 'var(--warning-border-soft)',
        };
    }

    if (status === '퇴직') {
        return {
            label: status,
            accent: 'var(--neutral-text)',
            tint: 'var(--neutral-bg)',
            border: 'var(--neutral-border)',
        };
    }

    return {
        label: status,
        accent: 'var(--success-text)',
        tint: 'var(--success-bg)',
        border: 'var(--success-border)',
    };
}

export function isAssigneeBookable(assignee: Assignee | null | undefined): boolean {
    return !!assignee && getAssigneeStatus(assignee) === '재직';
}

export function splitAssigneesByStatus(assignees: Assignee[]) {
    const sorted = sortAssignees(assignees);
    return {
        active: sorted.filter((assignee) => getAssigneeStatus(assignee) === '재직'),
        onLeave: sorted.filter((assignee) => getAssigneeStatus(assignee) === '휴직'),
        resigned: sorted.filter((assignee) => getAssigneeStatus(assignee) === '퇴직'),
    };
}

export function getAssigneeColor(assignee: Pick<Assignee, 'id' | 'color'> | null | undefined): string {
    if (assignee?.color) return assignee.color;
    if (!assignee) return '#8E8E93';
    return DEFAULT_ASSIGNEE_COLORS[Math.abs(assignee.id) % DEFAULT_ASSIGNEE_COLORS.length];
}

function getScheduleIndexFromDate(date: string): number | null {
    if (!date) return null;

    const parsed = new Date(`${date}T00:00:00`);
    const day = parsed.getDay();

    if (Number.isNaN(day)) return null;

    return (day + 6) % 7;
}

export function getAssigneeScheduleForDate(assignee: Assignee | undefined, date: string): DaySchedule | null {
    if (!assignee) return null;

    const scheduleIndex = getScheduleIndexFromDate(date);
    if (scheduleIndex == null) return null;

    return assignee.schedule[scheduleIndex] ?? null;
}

export function getAssigneeAvailabilityState(
    assignees: Assignee[],
    assigneeId: number | undefined,
    date: string,
    startTime: string,
    endTime: string
): AssigneeAvailabilityState {
    if (!assigneeId) return {kind: 'available'};

    const assignee = assignees.find((item) => item.id === assigneeId);
    if (!assignee) return {kind: 'available'};

    const schedule = getAssigneeScheduleForDate(assignee, date);
    if (!schedule || !schedule.enabled) {
        return {kind: 'off-day', message: `${assignee.name} 담당자 휴무일입니다.`};
    }

    if (startTime < schedule.start || endTime > schedule.end) {
        return {
            kind: 'outside-hours',
            message: `${assignee.name} 담당자 근무시간은 ${schedule.start}~${schedule.end}입니다.`,
        };
    }

    return {kind: 'available'};
}

export function getAssigneeAvailabilityError(
    assignees: Assignee[],
    assigneeId: number | undefined,
    date: string,
    startTime: string,
    endTime: string
): string {
    const availability = getAssigneeAvailabilityState(assignees, assigneeId, date, startTime, endTime);
    return availability.kind === 'available' ? '' : availability.message;
}

const assigneeNameOrder = (name: string) => /^[a-zA-Z]/.test(name) ? 0 : /^[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(name) ? 1 : 2;

export function compareAssigneeName(a: string, b: string): number {
    const oa = assigneeNameOrder(a), ob = assigneeNameOrder(b);
    return oa !== ob ? oa - ob : a.localeCompare(b, 'ko');
}

export function sortAssignees<T extends { name: string }>(list: T[]): T[] {
    return [...list].sort((a, b) => compareAssigneeName(a.name, b.name));
}

export function buildAssigneeNameMap(assignees: Assignee[], includeUnassigned?: boolean): Record<number, string> {
    const map: Record<number, string> = includeUnassigned ? {0: '미지정'} : {};
    for (const assignee of assignees) {
        map[assignee.id] = assignee.name;
    }
    return map;
}

export function buildAssigneeColorMap(assignees: Assignee[]): Record<number, string> {
    const map: Record<number, string> = {};
    for (const assignee of assignees) {
        map[assignee.id] = getAssigneeColor(assignee);
    }
    return map;
}

export const DEFAULT_ASSIGNEES: Assignee[] = [
    {
        id: 1,
        name: '담당자 1',
        schedule: createDefaultSchedule(),
        status: '재직',
        phone: '',
        note: '',
        color: getAssigneeColor({id: 1}),
    },
];
