import {useMemo} from 'react';

import {useCalendarStore} from '../store/calendarStore';
import {
    hourHeightForUnit,
    resolveTimelineUnit,
    type TimelineUnit,
} from '../features/reservations/timeline-scale';

export interface TimelineScale {
    /** 매장의 예약 단위(분). 눈금 간격이자 드래그 스냅 단위. */
    unit: TimelineUnit;
    hourHeight: number;
    minuteHeight: number;
}

/**
 * 타임라인 배율 — 매장이 파는 가장 짧은 시술이 읽히도록 시간축 높이를 정한다.
 *
 * 축(`TimelineTitle`)·블록(`Timeline`)·드래그·클릭생성이 **모두 이 값을 써야 한다.**
 * 한 곳만 옛 상수를 쓰면 눈금과 카드가 어긋나고, 그러면 화면이 예약 시각을 거짓말한다.
 */
export function useTimelineScale(): TimelineScale {
    const serviceCatalog = useCalendarStore((s) => s.serviceCatalog);

    return useMemo(() => {
        const unit = resolveTimelineUnit(serviceCatalog.map((service) => service.durationMinutes));
        const hourHeight = hourHeightForUnit(unit);
        return {unit, hourHeight, minuteHeight: hourHeight / 60};
    }, [serviceCatalog]);
}
