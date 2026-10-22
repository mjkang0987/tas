import {toDateKey, type Reservation, type ReservationMap} from '../reservations/model';

/** '곧 시작하는 예약'으로 보여 주는 범위(분). */
export const UPCOMING_WINDOW_MINUTES = 60;

export interface UpcomingReservation {
    reservation: Reservation;
    /** 지금부터 시작까지 남은 분(0 = 지금 시작) */
    minutesUntil: number;
}

/** 진행 중인 예약만 — 취소·노쇼·완료는 끝났고, 확정대기는 아직 오는지 모른다(앱 예약 알림과 같은 규칙). */
const isUpcomingCandidate = (r: Reservation) => !r.status || r.status === 'active';

function minutesOf(hhmm: string): number | null {
    const [h, m] = hhmm.split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/**
 * 오늘 예약 중 지금부터 [windowMinutes] 안에 시작하는 것(이른 순)과, 그 뒤 오늘의 다음 예약 하나.
 * 날짜는 기기 로컬 날짜(캘린더와 같은 기준).
 */
export function upcomingReservations(
    reservationMap: ReservationMap,
    now: Date,
    windowMinutes = UPCOMING_WINDOW_MINUTES,
): {soon: UpcomingReservation[]; next: UpcomingReservation | null} {
    const today = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const later = (reservationMap[today] ?? [])
        .filter(isUpcomingCandidate)
        .map((reservation) => ({reservation, start: minutesOf(reservation.startTime)}))
        .filter((x): x is {reservation: Reservation; start: number} => x.start !== null && x.start >= nowMinutes)
        .sort((a, b) => a.start - b.start || a.reservation.id - b.reservation.id)
        .map(({reservation, start}) => ({reservation, minutesUntil: start - nowMinutes}));
    const soon = later.filter((x) => x.minutesUntil <= windowMinutes);
    return {soon, next: later.find((x) => x.minutesUntil > windowMinutes) ?? null};
}

/** "지금" · "20분 후" · "1시간 후" · "2시간 30분 후". */
export function untilLabel(minutes: number): string {
    if (minutes <= 0) return '지금';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}분 후`;
    return m === 0 ? `${h}시간 후` : `${h}시간 ${m}분 후`;
}

/**
 * 종 표시 — 처리할 것(안 읽은 네이버 알림·대기 중 예약 요청·확인 안 한 만료 임박)은 빨간 숫자,
 * 곧 시작하는 예약만 있으면 보라 점. 곧 시작은 숫자에 넣지 않는다 — 영업 중엔 늘 있어 처리할 일이 묻힌다.
 */
export function bellIndicator(counts: {todo: number; soon: number}): {count: number; dot: boolean} {
    return {count: counts.todo, dot: counts.todo === 0 && counts.soon > 0};
}
