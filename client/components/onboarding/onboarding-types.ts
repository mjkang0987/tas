import type {ShopType} from '../../features/services/default-services';
import {SHOP_INDUSTRIES} from '../../features/store-settings/labels';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;
export type ExtShopType = ShopType | 'etc';

export interface LocalAssignee {
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

// 업종 마스터 목록(features/store-settings/labels)에서 파생 — 신규 업종 자동 반영.
export const SHOP_TYPES: {type: ExtShopType; label: string; emoji: string; desc: string}[] =
    SHOP_INDUSTRIES.map(({value, label, emoji, desc}) => ({type: value, label, emoji, desc}));

export const STEP_LABELS: Record<OnboardingStep, string> = {
    0: '매장 초기 설정',
    1: '매장 정보',
    2: '서비스 설정',
    3: '담당자 등록',
    4: '네이버 예약 연동 방식 안내',
    5: '설정 완료',
};

export const DEFAULT_ASSIGNEE_ID_START = 1;
