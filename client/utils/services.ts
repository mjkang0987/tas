export interface ServiceItem {
    name: string;
    durationMinutes: number;
    category: string;
    price: number;
}

export const SERVICE_CATALOG: ServiceItem[] = [
    // 커트
    {name: '남성커트', durationMinutes: 30, category: '커트', price: 18000},
    {name: '여성커트', durationMinutes: 30, category: '커트', price: 20000},
    {name: '주니어커트', durationMinutes: 30, category: '커트', price: 15000},

    // 펌
    {name: '일반펌', durationMinutes: 90, category: '펌', price: 50000},
    {name: '디자인펌', durationMinutes: 120, category: '펌', price: 70000},
    {name: '디지털/셋팅', durationMinutes: 150, category: '펌', price: 80000},
    {name: '매직', durationMinutes: 120, category: '펌', price: 100000},
    {name: '매직셋팅', durationMinutes: 180, category: '펌', price: 150000},
    {name: '볼륨매직', durationMinutes: 180, category: '펌', price: 150000},

    // 컬러
    {name: '뿌리염색', durationMinutes: 90, category: '컬러', price: 45000},
    {name: '전체염색', durationMinutes: 90, category: '컬러', price: 65000},
    {name: '탈색', durationMinutes: 120, category: '컬러', price: 80000},

    // 크리닉
    {name: '크리닉', durationMinutes: 30, category: '크리닉', price: 30000},
    {name: '크리닉 3단계', durationMinutes: 60, category: '크리닉', price: 50000},
    {name: '하오니코', durationMinutes: 60, category: '크리닉', price: 100000},

    // 드라이
    {name: '남자 드라이', durationMinutes: 20, category: '드라이', price: 18000},
    {name: '여자 드라이', durationMinutes: 30, category: '드라이', price: 20000},

    // 기타
    {name: '기장추가', durationMinutes: 0, category: '기타', price: 0},
    {name: '숱추가', durationMinutes: 0, category: '기타', price: 10000},
];

export const CATEGORY_BASE_COLOR_MAP: Record<string, string> = {
    '커트': '#2D7FF9',
    '펌': '#E53935',
    '컬러': '#FB8C00',
    '크리닉': '#00A896',
    '드라이': '#6D6F78',
    '기타': '#8E8E93',
};

// 하위호환: 기존 예약 데이터의 옛 시술명 → 현재 카탈로그 매핑
const LEGACY_NAME_MAP: Record<string, string> = {
    '남자 일반펌': '일반펌',
    '남자 디자인펌': '디자인펌',
    '여자 일반펌': '일반펌',
    '여자 디자인펌': '디자인펌',
    '셋팅펌': '디지털/셋팅',
    '남자 매직': '매직',
    '여자 매직': '매직',
    '다운펌+커트': '디자인펌',
    '펌 롤': '일반펌',
    '펌 매직': '매직',
    '뿌리/전체(멋내기)': '전체염색',
    '뿌리/전체(새치)': '뿌리염색',
};

const FALLBACK_COLOR = '#999';
const SHADE_STEPS = [0, 14, -14, 26, -26, 36, -36, 46, -46];

function clampColor(v: number): number {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return Math.round(v);
}

function adjustHexColor(hex: string, delta: number): string {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) return FALLBACK_COLOR;

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);

    if ([r, g, b].some((v) => Number.isNaN(v))) return FALLBACK_COLOR;

    const toHex = (v: number) => clampColor(v).toString(16).padStart(2, '0');
    return `#${toHex(r + delta)}${toHex(g + delta)}${toHex(b + delta)}`;
}

function getShadeDelta(index: number): number {
    const base = SHADE_STEPS[index % SHADE_STEPS.length];
    const cycle = Math.floor(index / SHADE_STEPS.length);
    return base + (cycle * 8 * (cycle % 2 === 0 ? 1 : -1));
}

function hslToHex(h: number, s: number, l: number): string {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };

    return `#${f(0)}${f(8)}${f(4)}`;
}

function generateCategoryBaseColor(category: string): string {
    let hash = 0;

    for (let i = 0; i < category.length; i += 1) {
        hash = ((hash * 31) + category.charCodeAt(i)) >>> 0;
    }

    const hue = hash % 360;
    return hslToHex(hue, 0.62, 0.5);
}

export function getCategoryBaseColor(
    category: string,
    categoryBaseColorMap: Record<string, string> = CATEGORY_BASE_COLOR_MAP
): string {
    return categoryBaseColorMap[category] || generateCategoryBaseColor(category);
}

export function buildServiceColorMap(
    catalog: ServiceItem[] = SERVICE_CATALOG,
    categoryBaseColorMap: Record<string, string> = CATEGORY_BASE_COLOR_MAP
): Record<string, string> {
    const grouped = getGroupedCatalog(catalog);
    const colorMap: Record<string, string> = {};

    for (const [category, items] of grouped.entries()) {
        const baseColor = getCategoryBaseColor(category, categoryBaseColorMap);

        items.forEach((item, index) => {
            colorMap[item.name] = adjustHexColor(baseColor, getShadeDelta(index));
        });
    }

    // Legacy names should resolve to the same color as their mapped current names.
    for (const [legacy, current] of Object.entries(LEGACY_NAME_MAP)) {
        const currentColor = colorMap[current];
        if (currentColor && !colorMap[legacy]) {
            colorMap[legacy] = currentColor;
        }
    }

    return colorMap;
}

export const SERVICE_COLOR_MAP: Record<string, string> = buildServiceColorMap(SERVICE_CATALOG);

export function getServiceColor(service: string, colorMap: Record<string, string> = SERVICE_COLOR_MAP): string {
    const direct = colorMap[service];
    if (direct) return direct;

    const serviceNames = Object.keys(colorMap).sort((a, b) => b.length - a.length);

    for (const name of serviceNames) {
        if (service.includes(name)) return colorMap[name];
    }

    return FALLBACK_COLOR;
}

export function buildCatalogMap(catalog: ServiceItem[]): Map<string, ServiceItem> {
    const map = new Map<string, ServiceItem>(catalog.map((s) => [s.name, s]));

    for (const [legacy, current] of Object.entries(LEGACY_NAME_MAP)) {
        const item = map.get(current);
        if (item && !map.has(legacy)) {
            map.set(legacy, item);
        }
    }

    return map;
}

const defaultCatalogMap = buildCatalogMap(SERVICE_CATALOG);

export function getGroupedCatalog(catalog: ServiceItem[] = SERVICE_CATALOG): Map<string, ServiceItem[]> {
    const grouped = new Map<string, ServiceItem[]>();

    for (const item of catalog) {
        const group = grouped.get(item.category);

        if (group) {
            group.push(item);
        } else {
            grouped.set(item.category, [item]);
        }
    }

    return grouped;
}

export function parseServiceString(str: string): string[] {
    if (!str.trim()) return [];
    return str.split('+').map((s) => s.trim()).filter(Boolean);
}

export function joinServiceNames(names: string[]): string {
    return names.join('+');
}

export function sumDurationMinutes(names: string[], catalogMap?: Map<string, ServiceItem>): number {
    const map = catalogMap ?? defaultCatalogMap;
    let total = 0;

    for (const name of names) {
        const item = map.get(name);

        if (item) {
            total += item.durationMinutes;
        }
    }

    return total;
}

export function getServicePrice(name: string, catalogMap?: Map<string, ServiceItem>): number {
    const map = catalogMap ?? defaultCatalogMap;
    return map.get(name)?.price ?? 0;
}

export function sumPrice(names: string[], catalogMap?: Map<string, ServiceItem>): number {
    const map = catalogMap ?? defaultCatalogMap;
    let total = 0;

    for (const name of names) {
        const item = map.get(name);

        if (item) {
            total += item.price;
        }
    }

    return total;
}

export function formatPrice(price: number): string {
    return price.toLocaleString('ko-KR') + '원';
}

export function calcEndTime(startTime: string, durationMinutes: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
    if (minutes <= 0) return '';

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h > 0 && m > 0) return `${h}시간${m}분`;
    if (h > 0) return `${h}시간`;
    return `${m}분`;
}
