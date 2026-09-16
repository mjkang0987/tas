import type {Reservation} from '../../../utils/reservations';

export interface ReservationCluster {
    id: string;
    reservations: Reservation[];
    startMinutes: number;
    endMinutes: number;
}

/** 겹친 예약을 나란히 놓을 때의 세로 칸 — `index`번째 칸, 전체 `count`칸. */
export interface TimelineLane {
    index: number;
    count: number;
}

export type TimelineEntry =
    | { kind: 'single'; reservation: Reservation; lane?: TimelineLane }
    | { kind: 'cluster'; cluster: ReservationCluster };

export interface BuildTimelineEntriesOptions {
    /**
     * 이 수 이하로 겹친 묶음은 접지 않고 좌우로 나눠 낸다(각 `single`에 `lane`이 붙는다).
     * 기본 0 — 겹치면 무조건 접는 기존 동작(데스크톱).
     *
     * 모바일에서만 2로 올린다. 좁은 화면에서 3칸으로 쪼개면 칸 하나가 110px 아래로
     * 떨어져 고객명조차 잘리므로, 그 이상은 접어서 목록 모달로 보내는 편이 낫다.
     */
    splitUpTo?: number;
}

function toMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return (hour * 60) + minute;
}

/**
 * 겹친 예약에 칸을 배정한다 — 끝난 칸을 뒤 예약이 물려받는 그리디 방식이라
 * (앱 `DayTimelineView.positioned`와 동일) 서로 안 겹치는 예약까지 칸을 늘리지 않는다.
 */
function assignLanes(group: Reservation[]): TimelineLane[] {
    const laneEnds: number[] = [];
    const laneOf: number[] = [];

    group.forEach((reservation) => {
        const startMinutes = toMinutes(reservation.startTime);
        const endMinutes = toMinutes(reservation.endTime);
        const reusable = laneEnds.findIndex((end) => end <= startMinutes);

        if (reusable >= 0) {
            laneEnds[reusable] = endMinutes;
            laneOf.push(reusable);
            return;
        }
        laneEnds.push(endMinutes);
        laneOf.push(laneEnds.length - 1);
    });

    const count = Math.max(1, laneEnds.length);
    return laneOf.map((index) => ({index, count}));
}

export function buildTimelineEntries(
    reservations: Reservation[],
    {splitUpTo = 0}: BuildTimelineEntriesOptions = {}
): TimelineEntry[] {
    const sorted = [...reservations].sort((a, b) => (
        a.startTime.localeCompare(b.startTime) ||
        a.endTime.localeCompare(b.endTime) ||
        a.id - b.id
    ));
    const entries: TimelineEntry[] = [];
    let current: Reservation[] = [];
    let currentStart = 0;
    let currentEnd = 0;

    const flush = () => {
        if (current.length === 0) return;

        if (current.length > 1 && current.length <= splitUpTo) {
            // 적게 겹친 묶음은 접지 않고 좌우로 나눠 둘 다 보이게 한다.
            const lanes = assignLanes(current);
            current.forEach((reservation, index) => {
                entries.push({kind: 'single', reservation, lane: lanes[index]});
            });
        } else if (current.length > 1) {
            entries.push({
                kind: 'cluster',
                cluster: {
                    id: `${current[0].date}-${currentStart}-${currentEnd}-${current.map((reservation) => reservation.id).join('-')}`,
                    reservations: current,
                    startMinutes: currentStart,
                    endMinutes: currentEnd,
                }
            });
        } else {
            current.forEach((reservation) => {
                entries.push({kind: 'single', reservation});
            });
        }

        current = [];
        currentStart = 0;
        currentEnd = 0;
    };

    sorted.forEach((reservation) => {
        const startMinutes = toMinutes(reservation.startTime);
        const endMinutes = toMinutes(reservation.endTime);

        if (current.length === 0) {
            current = [reservation];
            currentStart = startMinutes;
            currentEnd = endMinutes;
            return;
        }

        if (startMinutes < currentEnd) {
            current.push(reservation);
            currentStart = Math.min(currentStart, startMinutes);
            currentEnd = Math.max(currentEnd, endMinutes);
            return;
        }

        flush();
        current = [reservation];
        currentStart = startMinutes;
        currentEnd = endMinutes;
    });

    flush();

    return entries;
}
