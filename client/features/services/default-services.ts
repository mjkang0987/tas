export type ShopType = 'hair' | 'nail' | 'waxing' | 'lash' | 'skin' | 'etc';

export const DEFAULT_SERVICES: Record<ShopType, Array<{
    category: string;
    name: string;
    durationMinutes: number;
    price: number;
}>> = {
    hair: [
        {category: '커트', name: '커트', durationMinutes: 30, price: 20000},
        {category: '펌', name: '일반펌', durationMinutes: 120, price: 80000},
        {category: '펌', name: '볼륨매직', durationMinutes: 120, price: 130000},
        {category: '염색', name: '전체염색', durationMinutes: 90, price: 80000},
        {category: '염색', name: '부분염색', durationMinutes: 45, price: 40000},
        {category: '클리닉', name: '두피/모발 클리닉', durationMinutes: 60, price: 80000},
    ],
    nail: [
        {category: '젤네일', name: '손 젤', durationMinutes: 60, price: 40000},
        {category: '젤네일', name: '발 젤', durationMinutes: 60, price: 50000},
        {category: '젤네일', name: '젤 제거', durationMinutes: 20, price: 13000},
        {category: '케어', name: '손 케어', durationMinutes: 30, price: 17000},
        {category: '케어', name: '발 케어', durationMinutes: 30, price: 22000},
        {category: '아트', name: '네일아트', durationMinutes: 30, price: 70000},
    ],
    waxing: [
        {category: '바디왁싱', name: '브라질리언', durationMinutes: 30, price: 50000},
        {category: '바디왁싱', name: '반다리', durationMinutes: 20, price: 30000},
        {category: '바디왁싱', name: '전체다리', durationMinutes: 40, price: 50000},
        {category: '바디왁싱', name: '겨드랑이', durationMinutes: 15, price: 25000},
        {category: '페이스왁싱', name: '눈썹', durationMinutes: 10, price: 15000},
        {category: '페이스왁싱', name: '코', durationMinutes: 10, price: 10000},
        {category: '페이스왁싱', name: '인중', durationMinutes: 10, price: 10000},
    ],
    lash: [
        {category: '속눈썹 연장', name: '클래식', durationMinutes: 90, price: 50000},
        {category: '속눈썹 연장', name: '볼륨', durationMinutes: 120, price: 90000},
        {category: '속눈썹 연장', name: '내추럴', durationMinutes: 90, price: 45000},
        {category: '속눈썹 펌', name: '속눈썹 펌', durationMinutes: 60, price: 40000},
        {category: '리무브', name: '전체 리무브', durationMinutes: 20, price: 15000},
        {category: '리무브', name: '부분 리무브', durationMinutes: 10, price: 10000},
    ],
    skin: [
        {category: '기본 관리', name: '기본 피부 관리', durationMinutes: 60, price: 70000},
        {category: '기본 관리', name: '수분 관리', durationMinutes: 60, price: 60000},
        {category: '스페셜 관리', name: '리프팅', durationMinutes: 90, price: 100000},
        {category: '스페셜 관리', name: '미백/화이트닝', durationMinutes: 90, price: 80000},
        {category: '클렌징', name: '딥 클렌징', durationMinutes: 30, price: 60000},
        {category: '패키지', name: '풀 케어 패키지', durationMinutes: 120, price: 150000},
    ],
    etc: [],
};

export const SHOP_CATEGORY_COLOR_MAP: Record<ShopType, Record<string, string>> = {
    hair: {
        '커트': '#2D7FF9',
        '펌': '#E53935',
        '염색': '#FB8C00',
        '클리닉': '#00A896',
    },
    nail: {
        '젤네일': '#E85D75',
        '케어': '#00A896',
        '아트': '#7E57C2',
    },
    waxing: {
        '바디왁싱': '#FB8C00',
        '페이스왁싱': '#E85D75',
    },
    lash: {
        '속눈썹 연장': '#7E57C2',
        '속눈썹 펌': '#2D7FF9',
        '리무브': '#6D6F78',
    },
    skin: {
        '기본 관리': '#00A896',
        '스페셜 관리': '#E85D75',
        '클렌징': '#2D7FF9',
        '패키지': '#FB8C00',
    },
    etc: {},
};
