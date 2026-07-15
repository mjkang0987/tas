// 공개 온라인 예약 슬롯 계산 (순수 함수 — DB/네트워크 의존 없음).
// 영업시간 − 점유 예약 − 서비스 소요 − 최소 사전시간 을 반영해 예약 가능한 시작 시각을 만든다.

export interface TimeInterval {
    // 자정 기준 분(min). start < end.
    start: number;
    end: number;
}

// "HH:mm" → 자정 기준 분. 잘못된 형식이면 NaN.
export function timeToMinutes(hhmm: string): number {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return Number.NaN;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return Number.NaN;
    return h * 60 + min;
}

// 자정 기준 분 → "HH:mm".
export function minutesToTime(total: number): string {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 두 구간이 겹치는가(경계 접촉은 겹침 아님: [10:00,10:30)과 [10:30,11:00)은 공존).
export function overlaps(a: TimeInterval, b: TimeInterval): boolean {
    return a.start < b.end && b.start < a.end;
}

export interface SlotParams {
    // 해당 요일 영업 시작/종료 "HH:mm".
    openTime: string;
    closeTime: string;
    // 슬롯 간격(분). 예: 30 → 10:00, 10:30, 11:00 …
    slotIntervalMin: number;
    // 예약하려는 서비스 총 소요(분).
    serviceDurationMin: number;
    // 이미 점유된 구간(기존 예약: 네이버·수기·온라인 포함). 대상 스코프는 호출부가 결정.
    occupied: TimeInterval[];
    // 이 시각(자정 기준 분) 이전 시작은 제외. 오늘이면 (현재+minLead), 미래일이면 생략.
    minStartMinutes?: number;
}

// 예약 가능한 시작 시각 목록("HH:mm", 오름차순). 파라미터가 비정상이면 빈 배열.
export function computeAvailableSlots(p: SlotParams): string[] {
    const open = timeToMinutes(p.openTime);
    const close = timeToMinutes(p.closeTime);
    const duration = p.serviceDurationMin;
    const interval = p.slotIntervalMin;

    if (!Number.isFinite(open) || !Number.isFinite(close)) return [];
    if (!(interval > 0) || !(duration > 0)) return [];
    if (close <= open) return [];

    const minStart = p.minStartMinutes ?? -Infinity;
    const slots: string[] = [];

    // 서비스가 영업 종료 안에 끝나야 하므로 마지막 시작은 (close - duration).
    for (let start = open; start + duration <= close; start += interval) {
        if (start < minStart) continue;
        const candidate: TimeInterval = {start, end: start + duration};
        if (p.occupied.some((o) => overlaps(candidate, o))) continue;
        slots.push(minutesToTime(start));
    }
    return slots;
}
