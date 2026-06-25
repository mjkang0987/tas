import type {ShopType} from '../services/default-services';

// 업종 라벨 시스템.
// - 업종(ShopType)은 category 로 묶이고, category 가 "담당자"/"서비스" 표시 라벨을 결정한다.
// - 기존 뷰티 매장은 라벨 변화가 없도록 beauty = {담당자, 서비스}(현행) 로 둔다. 신규 업종만 맞춤 라벨.

export type ShopCategory =
    | 'beauty' | 'food' | 'medical' | 'fitness' | 'class'
    | 'pet' | 'repair' | 'space' | 'counsel' | 'etc';

export interface StoreLabels {
    assignee: string; // "담당자" 자리에 쓰는 말 (예: 테이블, 담당의, 강사)
    service: string;  // "서비스" 자리에 쓰는 말 (예: 메뉴, 진료, 수업)
}

// 업종 선택 UI(optgroup)용 카테고리 한글명.
export const CATEGORY_NAMES: Record<ShopCategory, string> = {
    beauty: '뷰티',
    food: '음식',
    medical: '의료',
    fitness: '피트니스',
    class: '교육·클래스',
    pet: '반려',
    repair: '정비·수리',
    space: '공간대여',
    counsel: '상담',
    etc: '기타',
};

export const CATEGORY_LABELS: Record<ShopCategory, StoreLabels> = {
    beauty: {assignee: '담당자', service: '서비스'},
    food: {assignee: '테이블', service: '메뉴'},
    medical: {assignee: '담당의', service: '진료'},
    fitness: {assignee: '강사', service: '수업'},
    class: {assignee: '선생님', service: '수업'},
    pet: {assignee: '담당자', service: '서비스'},
    repair: {assignee: '기사', service: '작업'},
    space: {assignee: '룸', service: '이용'},
    counsel: {assignee: '상담사', service: '상담'},
    etc: {assignee: '담당자', service: '서비스'},
};

export interface ShopIndustry {
    value: ShopType;
    label: string;
    emoji: string;
    desc: string;
    category: ShopCategory;
}

// 업종 마스터 목록 (온보딩·매장관리·라벨의 단일 출처).
export const SHOP_INDUSTRIES: ShopIndustry[] = [
    // 뷰티
    {value: 'hair', label: '헤어샵', emoji: '✂️', desc: '커트·펌·염색·클리닉', category: 'beauty'},
    {value: 'nail', label: '네일샵', emoji: '💅', desc: '젤네일·케어·아트', category: 'beauty'},
    {value: 'waxing', label: '왁싱샵', emoji: '🪷', desc: '바디·페이스 왁싱', category: 'beauty'},
    {value: 'lash', label: '속눈썹샵', emoji: '👁️', desc: '연장·펌·리무브', category: 'beauty'},
    {value: 'skin', label: '피부관리실', emoji: '🧴', desc: '기본·스페셜·클렌징', category: 'beauty'},
    {value: 'makeup', label: '메이크업', emoji: '💄', desc: '메이크업·헤어메이크업', category: 'beauty'},
    {value: 'tattoo', label: '반영구·타투', emoji: '🖋️', desc: '눈썹·아이라인·타투', category: 'beauty'},
    // 음식
    {value: 'restaurant', label: '음식점', emoji: '🍽️', desc: '식당·레스토랑', category: 'food'},
    {value: 'cafe', label: '카페', emoji: '☕', desc: '카페·디저트', category: 'food'},
    {value: 'bar', label: '주점·바', emoji: '🍺', desc: '바·펍·주점', category: 'food'},
    // 의료
    {value: 'clinic', label: '병원·의원', emoji: '🏥', desc: '진료·검진', category: 'medical'},
    {value: 'dental', label: '치과', emoji: '🦷', desc: '치과 진료', category: 'medical'},
    {value: 'oriental', label: '한의원', emoji: '🌿', desc: '한방 진료', category: 'medical'},
    {value: 'vet', label: '동물병원', emoji: '🐾', desc: '반려동물 진료', category: 'medical'},
    // 피트니스
    {value: 'gym', label: '헬스·PT', emoji: '💪', desc: '헬스·퍼스널 트레이닝', category: 'fitness'},
    {value: 'yoga', label: '요가·필라테스', emoji: '🧘', desc: '요가·필라테스', category: 'fitness'},
    {value: 'golf', label: '골프', emoji: '⛳', desc: '골프 레슨·연습', category: 'fitness'},
    {value: 'dance', label: '댄스', emoji: '🕺', desc: '댄스 레슨', category: 'fitness'},
    // 교육·클래스
    {value: 'academy', label: '학원', emoji: '📚', desc: '학원·교습', category: 'class'},
    {value: 'craft', label: '공방·클래스', emoji: '🎨', desc: '원데이·정기 클래스', category: 'class'},
    {value: 'tutoring', label: '과외', emoji: '✏️', desc: '개인·그룹 과외', category: 'class'},
    // 반려
    {value: 'petgroom', label: '애견미용', emoji: '🐩', desc: '미용·목욕', category: 'pet'},
    // 정비·수리
    {value: 'carwash', label: '세차', emoji: '🚗', desc: '세차·디테일링', category: 'repair'},
    {value: 'repair', label: '정비·수리', emoji: '🔧', desc: '정비·A/S', category: 'repair'},
    // 공간 대여
    {value: 'rentalspace', label: '공간대여', emoji: '🏢', desc: '회의실·파티룸 등', category: 'space'},
    {value: 'practice', label: '연습실', emoji: '🎵', desc: '합주·연습실', category: 'space'},
    // 상담
    {value: 'counseling', label: '상담', emoji: '💬', desc: '심리·코칭 상담', category: 'counsel'},
    // 기타
    {value: 'etc', label: '기타', emoji: '🏪', desc: '기타 업종', category: 'etc'},
];

export const SHOP_TYPE_VALUES: ShopType[] = SHOP_INDUSTRIES.map((s) => s.value);

const INDUSTRY_BY_VALUE = new Map<string, ShopIndustry>(SHOP_INDUSTRIES.map((s) => [s.value, s]));

const DEFAULT_LABELS: StoreLabels = CATEGORY_LABELS.etc;

// shopType 은 콤마조인 문자열일 수 있다(온보딩 다중선택). 라벨은 첫 유효 업종의 category 로 결정.
export function getPrimaryIndustry(shopType: string | null | undefined): ShopIndustry | null {
    if (!shopType) return null;
    for (const token of shopType.split(',')) {
        const found = INDUSTRY_BY_VALUE.get(token.trim());
        if (found) return found;
    }
    return null;
}

export function getStoreLabels(shopType: string | null | undefined): StoreLabels {
    const industry = getPrimaryIndustry(shopType);
    return industry ? CATEGORY_LABELS[industry.category] : DEFAULT_LABELS;
}

// 저장 전 정규화: 콤마조인에서 유효 업종 토큰만 남겨 재조인. 하나도 없으면 null.
// (서버 onboarding·migrate-local·store PATCH 검증 공용)
export function sanitizeShopType(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const valid = raw.split(',').map((t) => t.trim()).filter((t) => INDUSTRY_BY_VALUE.has(t));
    return valid.length > 0 ? valid.join(',') : null;
}
