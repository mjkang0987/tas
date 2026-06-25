import {ViewType} from './constants';
import type {StoreBusinessHours} from '../features/store-settings/model';

// 뷰별 시간축 패딩(시간 단위). 영업시간 설정 1개를 기준으로 뷰마다 코드 규칙으로 범위를 파생한다.
// 현재 정책: 모든 뷰가 영업시간 그대로(패딩 0). Day 시작 패딩은 영업 전 시간대에 클릭/드래그 영역이
// 열려 담당자 근무시간 판정과 어긋나는 문제가 있어 제거했다.
// 뷰별로 범위를 다르게 하고 싶으면 이 맵만 조정한다(예: Day 종료를 +1h).
const VIEW_PADDING_HOURS: Record<string, number> = {
    [ViewType.Day]: 0,
    [ViewType.Three]: 0,
    [ViewType.Week]: 0,
};

// 영업시간 기본값(설정 미로드/비정상 값 폴백). store-settings 기본과 동일.
const DEFAULT_OPEN_HOUR = 10;
const DEFAULT_CLOSE_HOUR = 20;

// "HH:MM" → 소수 시(예: "10:30" → 10.5). 파싱 실패 시 fallback.
function parseHour(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h)) return fallback;
    return h + (Number.isNaN(m) ? 0 : m / 60);
}

// 영업시간(businessHours) + 뷰 종류로 타임라인 시간축 범위[start, end)를 파생한다.
// 축은 시 단위라 시작은 floor(open), 종료는 ceil(close)로 시 경계에 맞춘 뒤 뷰 패딩을 적용하고 0~24로 클램프한다.
export function getTimelineRange(
    viewType: string,
    businessHours: StoreBusinessHours | undefined
): {start: number; end: number} {
    const openHour = parseHour(businessHours?.start, DEFAULT_OPEN_HOUR);
    const closeHour = parseHour(businessHours?.end, DEFAULT_CLOSE_HOUR);

    let start = Math.floor(openHour);
    let end = Math.ceil(closeHour);

    const padding = VIEW_PADDING_HOURS[viewType] ?? 0;
    start = Math.max(0, start - padding);
    end = Math.min(24, end + padding);

    // 비정상 영업시간(종료 ≤ 시작)일 때 최소 1시간 폭을 보장해 축이 깨지지 않게 한다.
    if (end <= start) {
        end = Math.min(24, start + 1);
    }

    return {start, end};
}
