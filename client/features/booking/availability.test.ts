import {describe, expect, it} from 'vitest';

import {
    assigneeWorksOnDay,
    computeAvailableSlots,
    computeSlotCapacities,
    minutesToTime,
    pickAssigneeForSlot,
    timeToMinutes,
    type AvailabilityInput,
    type SlotAssignee,
    type SlotReservation,
} from './availability';

const HOURS = {openTime: '09:00', closeTime: '18:00', enabled: true};

// dayIndex 0 = 월요일 (AssigneeSchedule.dayIndex 규칙)
const MON = 0;

function assignee(id: string, schedules: SlotAssignee['schedules'] = []): SlotAssignee {
    return {id, schedules};
}

function reservation(startTime: string, endTime: string, assigneeId: string | null = null): SlotReservation {
    return {assigneeId, startTime, endTime};
}

function input(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
    return {
        dayIndex: MON,
        businessHour: HOURS,
        durationMin: 60,
        slotIntervalMin: 60,
        minStartMinute: 0,
        reservations: [],
        assigneeId: null,
        assignees: [assignee('a1')],
        ...over,
    };
}

describe('timeToMinutes / minutesToTime', () => {
    it('자정 기준 분으로 변환한다', () => {
        expect(timeToMinutes('00:00')).toBe(0);
        expect(timeToMinutes('09:30')).toBe(570);
        expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('두 자리로 0을 채워 되돌린다', () => {
        expect(minutesToTime(0)).toBe('00:00');
        expect(minutesToTime(570)).toBe('09:30');
        expect(minutesToTime(1439)).toBe('23:59');
    });

    it('왕복 변환이 값을 보존한다', () => {
        for (const t of ['00:00', '07:05', '12:00', '18:45', '23:59']) {
            expect(minutesToTime(timeToMinutes(t))).toBe(t);
        }
    });
});

describe('computeAvailableSlots — 영업시간 경계', () => {
    it('영업시간이 없으면 빈 배열', () => {
        expect(computeAvailableSlots(input({businessHour: null}))).toEqual([]);
    });

    it('휴무일(enabled=false)이면 빈 배열', () => {
        expect(computeAvailableSlots(input({
            businessHour: {...HOURS, enabled: false},
        }))).toEqual([]);
    });

    it('마감이 개점보다 이르거나 같으면 빈 배열', () => {
        expect(computeAvailableSlots(input({
            businessHour: {openTime: '18:00', closeTime: '09:00', enabled: true},
        }))).toEqual([]);
        expect(computeAvailableSlots(input({
            businessHour: {openTime: '09:00', closeTime: '09:00', enabled: true},
        }))).toEqual([]);
    });

    it('소요시간이 0 이하면 빈 배열', () => {
        expect(computeAvailableSlots(input({durationMin: 0}))).toEqual([]);
        expect(computeAvailableSlots(input({durationMin: -30}))).toEqual([]);
    });

    it('마감을 넘기는 시작 시각은 제외한다 (start + duration <= close)', () => {
        // 09:00~18:00, 90분 서비스, 60분 간격 → 16:30 시작은 18:00 종료로 가능, 17:00은 불가
        const slots = computeAvailableSlots(input({durationMin: 90, slotIntervalMin: 30}));
        expect(slots).toContain('16:30');
        expect(slots).not.toContain('17:00');
        expect(slots.at(-1)).toBe('16:30');
    });

    it('slotInterval이 0 이하면 30분으로 폴백한다', () => {
        const slots = computeAvailableSlots(input({durationMin: 30, slotIntervalMin: 0}));
        expect(slots.slice(0, 3)).toEqual(['09:00', '09:30', '10:00']);
    });

    it('minStartMinute 이전 슬롯을 제외한다 (최소 사전시간·오늘 현재시각)', () => {
        const slots = computeAvailableSlots(input({minStartMinute: timeToMinutes('13:00')}));
        expect(slots).not.toContain('12:00');
        expect(slots[0]).toBe('13:00');
    });
});

describe('computeAvailableSlots — 담당자 용량 모델', () => {
    it('담당자가 없는 매장은 단일 자원으로 취급한다', () => {
        const slots = computeAvailableSlots(input({
            assignees: [],
            reservations: [reservation('10:00', '11:00')],
        }));
        expect(slots).not.toContain('10:00');
        expect(slots).toContain('11:00');
    });

    it('겹치지 않는 예약은 슬롯을 막지 않는다', () => {
        const slots = computeAvailableSlots(input({
            assignees: [],
            reservations: [reservation('10:00', '11:00')],
        }));
        expect(slots).toContain('09:00');
    });

    it('담당자 2명 중 1명이 차 있으면 남은 1명으로 예약 가능하다', () => {
        const slots = computeAvailableSlots(input({
            assignees: [assignee('a1'), assignee('a2')],
            reservations: [reservation('10:00', '11:00', 'a1')],
        }));
        expect(slots).toContain('10:00');
    });

    it('담당자 전원이 차 있으면 그 시간은 불가하다', () => {
        const slots = computeAvailableSlots(input({
            assignees: [assignee('a1'), assignee('a2')],
            reservations: [
                reservation('10:00', '11:00', 'a1'),
                reservation('10:00', '11:00', 'a2'),
            ],
        }));
        expect(slots).not.toContain('10:00');
    });

    it('미배정 예약(네이버 미매칭 등)이 여유 인원을 소모한다', () => {
        // 담당자 2명, 미배정 예약 1건 → 여유 1명이라 아직 가능
        expect(computeAvailableSlots(input({
            assignees: [assignee('a1'), assignee('a2')],
            reservations: [reservation('10:00', '11:00', null)],
        }))).toContain('10:00');

        // 미배정 2건이면 여유가 없어 불가
        expect(computeAvailableSlots(input({
            assignees: [assignee('a1'), assignee('a2')],
            reservations: [
                reservation('10:00', '11:00', null),
                reservation('10:00', '11:00', null),
            ],
        }))).not.toContain('10:00');
    });

    it('특정 담당자를 지정하면 그 담당자가 비어 있어야 한다', () => {
        const common = {
            assignees: [assignee('a1'), assignee('a2')],
            reservations: [reservation('10:00', '11:00', 'a1')],
        };
        expect(computeAvailableSlots(input({...common, assigneeId: 'a1'}))).not.toContain('10:00');
        expect(computeAvailableSlots(input({...common, assigneeId: 'a2'}))).toContain('10:00');
    });
});

describe('computeAvailableSlots — 담당자 스케줄', () => {
    it('해당 요일 스케줄이 없으면 영업시간 그대로 근무로 본다', () => {
        const slots = computeAvailableSlots(input({
            assignees: [assignee('a1', [{dayIndex: 1, enabled: true, startTime: '09:00', endTime: '18:00'}])],
        }));
        expect(slots).toContain('09:00');
    });

    it('스케줄이 비활성(휴무)이면 하루 전체가 불가하다', () => {
        const slots = computeAvailableSlots(input({
            assignees: [assignee('a1', [{dayIndex: MON, enabled: false, startTime: '09:00', endTime: '18:00'}])],
        }));
        expect(slots).toEqual([]);
    });

    it('근무 시간을 벗어나는 블록은 제외한다 (블록 전체가 근무시간 안에 들어와야 함)', () => {
        const slots = computeAvailableSlots(input({
            durationMin: 60,
            assignees: [assignee('a1', [{dayIndex: MON, enabled: true, startTime: '13:00', endTime: '17:00'}])],
        }));
        expect(slots).not.toContain('12:00'); // 근무 시작 전
        expect(slots).toContain('13:00');
        expect(slots).toContain('16:00'); // 17:00 종료 = 근무 끝과 일치
        expect(slots).not.toContain('17:00'); // 18:00 종료 = 근무 밖
    });
});

describe('assigneeWorksOnDay', () => {
    it('스케줄이 없으면 근무로 본다', () => {
        expect(assigneeWorksOnDay(assignee('a1'), MON)).toBe(true);
    });

    it('다른 요일 스케줄만 있으면 해당 요일은 근무로 본다', () => {
        const a = assignee('a1', [{dayIndex: 3, enabled: false, startTime: '09:00', endTime: '18:00'}]);
        expect(assigneeWorksOnDay(a, MON)).toBe(true);
    });

    it('해당 요일 스케줄이 있으면 enabled를 따른다', () => {
        const off = assignee('a1', [{dayIndex: MON, enabled: false, startTime: '09:00', endTime: '18:00'}]);
        const on = assignee('a2', [{dayIndex: MON, enabled: true, startTime: '09:00', endTime: '18:00'}]);
        expect(assigneeWorksOnDay(off, MON)).toBe(false);
        expect(assigneeWorksOnDay(on, MON)).toBe(true);
    });
});

describe('pickAssigneeForSlot', () => {
    const base = {
        dayIndex: MON,
        durationMin: 60,
        startMinute: timeToMinutes('10:00'),
    };

    it('담당자가 없으면 null', () => {
        expect(pickAssigneeForSlot({...base, reservations: [], assignees: []})).toBeNull();
    });

    it('겹치는 예약이 없으면 첫 담당자를 배정한다', () => {
        expect(pickAssigneeForSlot({
            ...base,
            reservations: [],
            assignees: [assignee('a1'), assignee('a2')],
        })).toBe('a1');
    });

    it('이미 배정된 담당자는 건너뛴다', () => {
        expect(pickAssigneeForSlot({
            ...base,
            reservations: [reservation('10:00', '11:00', 'a1')],
            assignees: [assignee('a1'), assignee('a2')],
        })).toBe('a2');
    });

    it('미배정 예약 수만큼 앞쪽 담당자를 남겨둔다', () => {
        expect(pickAssigneeForSlot({
            ...base,
            reservations: [reservation('10:00', '11:00', null)],
            assignees: [assignee('a1'), assignee('a2')],
        })).toBe('a2');
    });

    it('여유가 없으면 null을 반환한다', () => {
        expect(pickAssigneeForSlot({
            ...base,
            reservations: [
                reservation('10:00', '11:00', null),
                reservation('10:00', '11:00', null),
            ],
            assignees: [assignee('a1'), assignee('a2')],
        })).toBeNull();
    });

    it('computeAvailableSlots의 가용 판정과 항상 일치한다', () => {
        // 불변식: 슬롯이 가용이면 배정할 담당자가 있고, 불가면 없어야 한다.
        // 한쪽만 맞는 케이스로는 어긋남을 못 잡으므로 여러 조합을 훑는다.
        const cases: Array<Pick<AvailabilityInput, 'assignees' | 'reservations'>> = [
            {assignees: [assignee('a1')], reservations: []},
            {assignees: [assignee('a1')], reservations: [reservation('10:00', '11:00', 'a1')]},
            {assignees: [assignee('a1'), assignee('a2')], reservations: [reservation('10:00', '11:00', 'a1')]},
            {assignees: [assignee('a1'), assignee('a2')], reservations: [reservation('10:00', '11:00', null)]},
            {
                assignees: [assignee('a1'), assignee('a2')],
                reservations: [reservation('10:00', '11:00', 'a1'), reservation('10:00', '11:00', null)],
            },
            {
                assignees: [assignee('a1', [{dayIndex: MON, enabled: false, startTime: '09:00', endTime: '18:00'}])],
                reservations: [],
            },
        ];

        for (const args of cases) {
            const available = computeAvailableSlots(input(args)).includes('10:00');
            const picked = pickAssigneeForSlot({...base, ...args});
            expect(picked !== null, JSON.stringify(args)).toBe(available);
        }
    });
});

describe('computeSlotCapacities', () => {
    it('예약이 없으면 마감까지의 전체 시간이 최대치다', () => {
        const caps = computeSlotCapacities(input({slotIntervalMin: 60}));
        expect(caps[0]).toEqual({time: '09:00', maxDurationMin: 540}); // 09:00~18:00
        expect(caps.at(-1)).toEqual({time: '17:00', maxDurationMin: 60});
    });

    it('예약이 다음 경계를 만들어 최대 연속 시간을 줄인다', () => {
        const caps = computeSlotCapacities(input({
            slotIntervalMin: 60,
            assignees: [],
            reservations: [reservation('12:00', '13:00')],
        }));
        expect(caps.find((c) => c.time === '09:00')?.maxDurationMin).toBe(180); // 09:00~12:00
        expect(caps.find((c) => c.time === '12:00')?.maxDurationMin).toBe(0); // 예약 중
        expect(caps.find((c) => c.time === '13:00')?.maxDurationMin).toBe(300); // 13:00~18:00
    });

    it('minStartMinute 이전 슬롯은 용량 0으로 내려간다', () => {
        const caps = computeSlotCapacities(input({
            slotIntervalMin: 60,
            minStartMinute: timeToMinutes('12:00'),
        }));
        expect(caps.find((c) => c.time === '09:00')?.maxDurationMin).toBe(0);
        expect(caps.find((c) => c.time === '12:00')?.maxDurationMin).toBe(360);
    });

    it('단조성 — 용량 안에 드는 서비스는 슬롯 목록에도 나타난다', () => {
        const args = {
            slotIntervalMin: 60,
            assignees: [],
            reservations: [reservation('12:00', '13:00')],
        };
        const caps = computeSlotCapacities(input(args));
        const slots = computeAvailableSlots(input({...args, durationMin: 60}));

        const fits = caps.filter((c) => c.maxDurationMin >= 60);
        expect(fits.length).toBeGreaterThan(0); // 아무것도 검사 못 하고 통과하는 것 방지

        for (const {time} of fits) expect(slots).toContain(time);
        // 역방향: 용량이 모자란 시각은 슬롯에 없어야 한다
        for (const {time} of caps.filter((c) => c.maxDurationMin < 60)) {
            expect(slots).not.toContain(time);
        }
    });
});
