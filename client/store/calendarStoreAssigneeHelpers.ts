import type {DaySchedule, Assignee, AssigneeStatus} from '../utils/assignees';
import {createDefaultSchedule, getAssigneeColor} from '../utils/assignees';

export function buildAddedAssigneeState(
    assignees: Assignee[],
    name: string,
    status: AssigneeStatus = '재직',
    phone = '',
    note = '',
    color?: string
) {
    const cleanName = name.trim();
    if (!cleanName) {
        return null;
    }

    // legacyId는 Int(32비트) 컬럼이라 Date.now()(13자리)를 쓰면 서버 저장 시 범위 초과(P2020).
    // 기존 id 최대값 + 1로 작은 정수를 부여한다(없으면 1부터).
    const assigneeId = assignees.reduce((max, a) => Math.max(max, a.id), 0) + 1;
    const nextAssignee: Assignee = {
        id: assigneeId,
        name: cleanName,
        schedule: createDefaultSchedule(),
        status,
        phone,
        note,
        color: color || getAssigneeColor({id: assigneeId}),
    };

    return [...assignees, nextAssignee];
}

export function buildUpdatedAssigneeState(
    assignees: Assignee[],
    assigneeId: number,
    patch: Partial<Pick<Assignee, 'name' | 'nameI18n' | 'status' | 'phone' | 'note' | 'color'>>
) {
    return assignees.map((assignee) =>
        assignee.id === assigneeId
            ? {
                ...assignee,
                ...(patch.name !== undefined ? {name: patch.name} : {}),
                ...(patch.nameI18n !== undefined ? {nameI18n: patch.nameI18n} : {}),
                ...(patch.status ? {status: patch.status} : {}),
                ...(patch.phone !== undefined ? {phone: patch.phone} : {}),
                ...(patch.note !== undefined ? {note: patch.note} : {}),
                ...(patch.color !== undefined ? {color: patch.color} : {}),
            }
            : assignee
    );
}

export function buildUpdatedAssigneeDayState(
    assignees: Assignee[],
    assigneeId: number,
    dayIndex: number,
    patch: Partial<DaySchedule>
) {
    if (dayIndex < 0 || dayIndex > 6) {
        return null;
    }

    return assignees.map((assignee) => {
        if (assignee.id !== assigneeId) return assignee;

        const nextSchedule = assignee.schedule.map((day, index) =>
            index === dayIndex ? {...day, ...patch} : day
        );

        return {...assignee, schedule: nextSchedule};
    });
}

export function buildDeletedAssigneeState(assignees: Assignee[], assigneeId: number) {
    return assignees.filter((assignee) => assignee.id !== assigneeId);
}
