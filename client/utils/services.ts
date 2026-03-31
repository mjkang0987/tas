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

export const SERVICE_COLOR_MAP: Record<string, string> = {
    '남성커트': '#4285F4',
    '여성커트': '#5B9BD5',
    '주니어커트': '#7CB9E8',

    '일반펌': '#E53935',
    '디자인펌': '#D81B60',
    '디지털/셋팅': '#EC407A',
    '매직': '#43A047',
    '매직셋팅': '#2E7D32',
    '볼륨매직': '#81C784',

    '뿌리염색': '#FF6D00',
    '전체염색': '#F9A825',
    '탈색': '#FFB300',

    '크리닉': '#009688',
    '크리닉 3단계': '#00897B',
    '하오니코': '#26A69A',

    '남자 드라이': '#78909C',
    '여자 드라이': '#90A4AE',

    '기장추가': '#BDBDBD',
    '숱추가': '#9E9E9E',

    // 하위호환 (기존 예약 데이터)
    '남자 일반펌': '#E53935',
    '남자 디자인펌': '#D81B60',
    '여자 일반펌': '#F06292',
    '여자 디자인펌': '#EC407A',
    '셋팅펌': '#AD1457',
    '남자 매직': '#43A047',
    '여자 매직': '#66BB6A',
    '다운펌+커트': '#7B1FA2',
    '펌 롤': '#9C27B0',
    '펌 매직': '#BA68C8',
    '뿌리/전체(멋내기)': '#FF6D00',
    '뿌리/전체(새치)': '#F9A825',
};

const SERVICE_NAMES_BY_LENGTH = Object.keys(SERVICE_COLOR_MAP).sort((a, b) => b.length - a.length);

const FALLBACK_COLOR = '#999';

export function getServiceColor(service: string): string {
    const direct = SERVICE_COLOR_MAP[service];
    if (direct) return direct;

    for (const name of SERVICE_NAMES_BY_LENGTH) {
        if (service.includes(name)) return SERVICE_COLOR_MAP[name];
    }

    return FALLBACK_COLOR;
}

const catalogMap = new Map<string, ServiceItem>(
    SERVICE_CATALOG.map((s) => [s.name, s])
);

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

for (const [legacy, current] of Object.entries(LEGACY_NAME_MAP)) {
    const item = catalogMap.get(current);
    if (item && !catalogMap.has(legacy)) {
        catalogMap.set(legacy, item);
    }
}

export function getGroupedCatalog(): Map<string, ServiceItem[]> {
    const grouped = new Map<string, ServiceItem[]>();

    for (const item of SERVICE_CATALOG) {
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

export function sumDurationMinutes(names: string[]): number {
    let total = 0;

    for (const name of names) {
        const item = catalogMap.get(name);

        if (item) {
            total += item.durationMinutes;
        }
    }

    return total;
}

export function sumPrice(names: string[]): number {
    let total = 0;

    for (const name of names) {
        const item = catalogMap.get(name);

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
