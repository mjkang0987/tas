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

function toMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return (hour * 60) + minute;
}

/**
 * @param splitUpTo 이 수 이하로 겹친 묶음은 접지 않고 좌우로 나눠 낸다(각 `single`에
 *   `lane`이 붙는다). 기본 0 — 겹치면 무조건 접는 기존 동작(데스크톱).
 *   모바일 일 뷰만 2로 올린다. 3칸이면 칸 하나가 110px 아래로 떨어져 고객명조차 잘린다.
 */
export function buildTimelineEntries(
    reservations: Reservation[],
    {splitUpTo = 0}: {splitUpTo?: number} = {}
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

        // Math.max(1, …) 가 "1건짜리는 언제나 낱개" 를 흡수한다.
        if (current.length > Math.max(1, splitUpTo)) {
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
            // 적게 겹친 묶음은 접지 않고 좌우로 나눠 둘 다 보이게 한다.
            // 묶음은 겹침으로 이어져 있으므로 칸 수 = 묶음 크기다.
            // ponytail: splitUpTo 를 3 이상으로 올리면 그리디 칸 재사용(끝난 칸을 뒤 예약이
            // 물려받기, 앱 DayTimelineView.positioned)을 되살릴 것 — 사슬 겹침 3건이
            // 2칸으로 충분한데 3칸으로 쪼개져 폭이 1/3 이 된다.
            const count = current.length;
            current.forEach((reservation, index) => {
                entries.push(count > 1
                    ? {kind: 'single', reservation, lane: {index, count}}
                    : {kind: 'single', reservation});
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
