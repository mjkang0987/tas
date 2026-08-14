// 타임라인 배율 — 매장이 파는 **가장 짧은 시술**이 읽히도록 시간축 높이를 정한다.
//
// 시간당 100px 고정이던 시절엔 10분 예약이 16.7px, 5분이 8.3px라 글자 한 줄(약 17px)도 들어가지 않았다.
// 배율만 키우면 하루가 길어지고, 내용만 줄이면 길이=시간이 깨진다. 그래서 둘을 같이 움직인다 —
// 단위가 짧을수록 배율을 올리되, 카드에 넣는 것을 줄여 필요한 배율 자체를 낮춘다.

export const TIMELINE_UNITS = [5, 10, 15, 20, 30, 60] as const;
export type TimelineUnit = (typeof TIMELINE_UNITS)[number];

// 서비스가 하나도 없는 매장(온보딩 직후 등)의 기본값. 현행 화면과 같은 배율이 나온다.
export const DEFAULT_TIMELINE_UNIT: TimelineUnit = 30;

// 카드에 이름 한 줄이라도 들어가는 최소 높이. 배율로 안 잡히는 예약(오너가 소요시간을 직접 줄인 건)의 바닥.
// 근거: 카드 최소 글꼴 `--tiny-font`(10px) × 줄높이 1.2 = 12px + 상하 패딩 2px씩 = 16px.
// 이 값과 `hourHeightForUnit`은 한 쌍이다 — 단위 한 칸이 이 높이보다 낮으면 배율을 올려도 안 읽힌다(테스트가 강제).
export const MIN_CARD_HEIGHT = 16;

// 카드 높이별로 넣을 수 있는 내용.
// - full   : 서비스 + 고객명 (현행 두 줄)
// - compact: 한 줄 — 고객명 · 서비스 (말줄임)
// - name   : 고객명만. 서비스는 왼쪽 색 막대가 이미 말해준다.
export type CardDetail = 'full' | 'compact' | 'name';

const FULL_MIN_HEIGHT = 36;
const COMPACT_MIN_HEIGHT = 20;

/**
 * 서비스 소요시간 목록에서 매장의 타임라인 단위를 정한다.
 *
 * 가장 짧은 시술 **이하**의 가장 큰 단위로 내린다. 올림하면 카드가 눈금 한 칸보다 짧아져
 * 눈금이 거짓말을 한다(7분 시술인데 10분 눈금이면 카드가 칸을 못 채운다).
 */
export function resolveTimelineUnit(durations: readonly number[]): TimelineUnit {
    const usable = durations.filter((d) => Number.isFinite(d) && d > 0);
    if (usable.length === 0) return DEFAULT_TIMELINE_UNIT;

    const shortest = Math.min(...usable);
    // 뒤에서부터(큰 단위부터) 찾아 첫 번째로 들어맞는 것 = 이하의 최대 단위.
    const unit = [...TIMELINE_UNITS].reverse().find((candidate) => candidate <= shortest);

    // 5분보다 짧은 시술(1~4분)은 5분 단위로 본다 — 더 잘게 쪼개면 하루가 감당이 안 된다.
    return unit ?? TIMELINE_UNITS[0];
}

/** 단위별 시간축 높이(px/시간). 15분 이상은 현행 100px 그대로라 대부분의 매장은 변화가 없다. */
export function hourHeightForUnit(unit: TimelineUnit): number {
    if (unit <= 5) return 200;
    if (unit <= 10) return 120;
    return 100;
}

/** 실제로 그려질 카드 높이. 배율로 부족한 만큼은 최소 높이가 받는다. */
export function cardHeightFor(minutes: number, minuteHeight: number): number {
    return Math.max(MIN_CARD_HEIGHT, minutes * minuteHeight);
}

/**
 * 카드 높이로 내용 수준을 정한다.
 *
 * 매장 단위가 아니라 **그 카드의 높이**로 판정하는 이유: 예약은 소요시간을 건별로 바꿀 수 있어
 * (`isDurationManual`) 30분 단위 매장에도 10분짜리 예약이 존재한다. 단위로 정하면 그 카드가 넘친다.
 */
export function cardDetailForHeight(heightPx: number): CardDetail {
    if (heightPx >= FULL_MIN_HEIGHT) return 'full';
    if (heightPx >= COMPACT_MIN_HEIGHT) return 'compact';
    return 'name';
}

/**
 * 클릭한 지점을 단위 격자에 맞춘다(반올림).
 *
 * 예전엔 30분 고정(`roundToHalfHour`)이라 10분 단위 매장에서 10:10을 눌러도 10:00·10:30으로만 잡혔다.
 * 상한(영업 종료) 클램프는 호출부 책임 — 여기선 격자 정렬만 한다.
 */
export function roundToUnit(hour: number, minute: number, unit: TimelineUnit): {hour: number; minute: number} {
    const snapped = Math.round((hour * 60 + minute) / unit) * unit;
    return {hour: Math.floor(snapped / 60), minute: snapped % 60};
}
