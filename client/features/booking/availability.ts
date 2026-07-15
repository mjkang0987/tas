// 공개(고객) 온라인 예약 슬롯 계산 — 순수 함수(서버 API에서 재사용).
// 영업시간 − 기존 active 예약(네이버 포함) − 담당자 스케줄 − 서비스 총소요 − 최소 사전시간,
// slotInterval 간격으로 예약 가능한 시작 시각("HH:MM")을 계산한다.

export interface SlotBusinessHour {
    openTime: string; // "HH:MM"
    closeTime: string; // "HH:MM"
    enabled: boolean;
}

export interface SlotAssigneeSchedule {
    dayIndex: number;
    enabled: boolean;
    startTime: string;
    endTime: string;
}

export interface SlotAssignee {
    id: string;
    schedules: SlotAssigneeSchedule[];
}

export interface SlotReservation {
    assigneeId: string | null;
    startTime: string;
    endTime: string;
}

export interface AvailabilityInput {
    dayIndex: number; // 0=일 … 6=토 (해당 날짜의 요일)
    businessHour: SlotBusinessHour | null;
    durationMin: number; // 선택 서비스 총 소요(분)
    slotIntervalMin: number;
    minStartMinute: number; // 이 분(자정 기준) 이전 슬롯 제외 — 최소 사전시간·오늘 현재시각 반영. 없으면 0.
    reservations: SlotReservation[]; // 해당 날짜 active 예약
    assigneeId: string | null; // 특정 담당자 선택, null=상관없음
    assignees: SlotAssignee[]; // 활성 담당자(스케줄 포함)
}

export function timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

export function minutesToTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    return aStart < bEnd && bStart < aEnd;
}

// 담당자가 [start,end)에 근무하는가. 해당 요일 스케줄 행이 없으면 영업시간대로 근무한다고 본다.
function isAssigneeWorking(a: SlotAssignee, dayIndex: number, start: number, end: number): boolean {
    const sch = a.schedules.find((s) => s.dayIndex === dayIndex);
    if (!sch) return true; // 스케줄 미설정 = 영업시간 그대로 근무
    if (!sch.enabled) return false;
    return timeToMinutes(sch.startTime) <= start && end <= timeToMinutes(sch.endTime);
}

/**
 * 예약 가능한 시작 시각 목록을 반환한다.
 *
 * 담당자 용량 모델: 한 슬롯에 겹치는 예약을 (배정 담당자별) + (미배정) 부하로 나눠,
 * "근무 중이며 배정 예약이 없는 담당자 수 > 미배정 예약 수"일 때만 가용으로 본다.
 * 미배정 예약(네이버 미매칭 등)은 어느 담당자인지 모르므로 여유 인원을 소모하는 것으로 계산.
 * 담당자가 0명인 매장은 단일 자원(1)으로 취급 — 겹치는 예약이 하나도 없을 때만 가용.
 */
export function computeAvailableSlots(input: AvailabilityInput): string[] {
    const {
        dayIndex, businessHour, durationMin, slotIntervalMin,
        minStartMinute, reservations, assigneeId, assignees,
    } = input;

    if (!businessHour || !businessHour.enabled) return [];
    if (durationMin <= 0) return [];
    const interval = slotIntervalMin > 0 ? slotIntervalMin : 30;

    const open = timeToMinutes(businessHour.openTime);
    const close = timeToMinutes(businessHour.closeTime);
    if (close <= open) return [];

    const slots: string[] = [];

    for (let start = open; start + durationMin <= close; start += interval) {
        if (start < minStartMinute) continue;
        const end = start + durationMin;

        const overlapping = reservations.filter((r) =>
            overlaps(start, end, timeToMinutes(r.startTime), timeToMinutes(r.endTime)));

        // 담당자가 없는 매장: 단일 자원으로 취급
        if (assignees.length === 0) {
            if (overlapping.length === 0) slots.push(minutesToTime(start));
            continue;
        }

        const unassignedLoad = overlapping.filter((r) => !r.assigneeId).length;
        const busyAssigneeIds = new Set(
            overlapping.map((r) => r.assigneeId).filter((id): id is string => Boolean(id)),
        );

        const workingFree = assignees.filter((a) =>
            isAssigneeWorking(a, dayIndex, start, end) && !busyAssigneeIds.has(a.id));

        if (assigneeId) {
            const chosenFree = workingFree.some((a) => a.id === assigneeId);
            if (chosenFree && workingFree.length > unassignedLoad) slots.push(minutesToTime(start));
        } else if (workingFree.length > unassignedLoad) {
            slots.push(minutesToTime(start));
        }
    }

    return slots;
}

// 상관없음(자동 배정) 시 슬롯을 실제로 맡길 담당자 하나를 고른다.
// 근무 중이며 그 슬롯에 배정 예약이 없는 첫 담당자. 없으면 null(미배정).
export function pickAssigneeForSlot(input: {
    dayIndex: number;
    durationMin: number;
    reservations: SlotReservation[];
    assignees: SlotAssignee[];
    startMinute: number;
}): string | null {
    const {dayIndex, durationMin, reservations, assignees, startMinute} = input;
    if (assignees.length === 0) return null;
    const end = startMinute + durationMin;

    const overlapping = reservations.filter((r) =>
        overlaps(startMinute, end, timeToMinutes(r.startTime), timeToMinutes(r.endTime)));
    const busyAssigneeIds = new Set(
        overlapping.map((r) => r.assigneeId).filter((id): id is string => Boolean(id)),
    );

    const free = assignees.find((a) =>
        isAssigneeWorking(a, dayIndex, startMinute, end) && !busyAssigneeIds.has(a.id));
    return free ? free.id : null;
}
