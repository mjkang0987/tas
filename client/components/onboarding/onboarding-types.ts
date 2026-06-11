import type {ShopType} from '../../features/services/default-services';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;
export type ExtShopType = ShopType | 'etc';

export interface LocalDesigner {
    id: number;
    name: string;
    color: string;
}

export interface AddServiceState {
    category: string;
    name: string;
    durationMinutes: string;
    price: string;
    newCategory: string;
}

export const SHOP_TYPES: {type: ExtShopType; label: string; emoji: string; desc: string}[] = [
    {type: 'hair', label: '헤어샵', emoji: '✂️', desc: '커트·펌·염색·클리닉'},
    {type: 'nail', label: '네일샵', emoji: '💅', desc: '젤네일·케어·아트'},
    {type: 'waxing', label: '왁싱샵', emoji: '🪷', desc: '바디·페이스 왁싱'},
    {type: 'lash', label: '속눈썹샵', emoji: '👁️', desc: '연장·펌·리무브'},
    {type: 'skin', label: '피부관리실', emoji: '🧴', desc: '기본·스페셜·클렌징'},
    {type: 'etc', label: '기타', emoji: '🏪', desc: '기타 업종'},
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
    0: '매장 초기 설정',
    1: '매장 정보',
    2: '서비스 설정',
    3: '디자이너 등록',
    4: '네이버 예약 연동 방식 안내',
    5: '설정 완료',
};

export const DEFAULT_DESIGNER_ID_START = 1;
