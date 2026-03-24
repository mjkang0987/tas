import type {MousePositionType} from '../store/calendarStore';

import {
    TIMELINE_DAY_TOP,
    TIMELINE_TOP,
    ViewType
} from './constants';

type Params = {
    event: React.MouseEvent<HTMLDivElement>;
    type: string;
    setPosition: (v: MousePositionType | null) => void;
    fullYear: number;
    month: number;
    date: number;
    start: number;
    end: number;
};

/**
 * 타임라인 영역 클릭 위치를 시·분으로 환산해 상태에 반영합니다.
 */
export function calcTimelinePosition({
    event,
    type,
    setPosition,
    fullYear,
    month,
    date,
    start,
    end
}: Params): void {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const paddingTop = type === ViewType.Day ? TIMELINE_DAY_TOP : TIMELINE_TOP;
    const relativeY = event.clientY - rect.top - paddingTop;
    const full = (end - start - 1) * 2 * 60;
    const clampedY = Math.max(0, Math.min(relativeY, full));
    const totalMinutesFromStart = clampedY / 2;
    let hour = start + Math.floor(totalMinutesFromStart / 60);
    const minute = Math.floor(totalMinutesFromStart % 60);

    hour = Math.min(Math.max(hour, start), end - 1);

    setPosition({
        hour,
        minute,
        fullYear,
        month,
        date
    });
}
