import {buildTimelineEntries} from '../../components/calendar/views/timelineEntries';

import type {Reservation} from './model';

/** 겹침을 접지 않을 때 필요한 칸 수 — 그날 가장 많이 겹친 수. 겹침이 없으면 1. */
export function maxLanesOfDay(reservations: Reservation[]): number {
    // splitUpTo 를 올려 묶음을 접지 않고 전부 lane 으로 낸다.
    const entries = buildTimelineEntries(reservations, {splitUpTo: Number.MAX_SAFE_INTEGER});

    let max = 1;
    for (const entry of entries) {
        if (entry.kind === 'single' && entry.lane) max = Math.max(max, entry.lane.count);
    }
    return max;
}
