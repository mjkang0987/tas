// 매장 공지사항(공개 예약 페이지 노출). 오너 관리, id는 서버 cuid.
export type NoticeCategory = 'notice' | 'event' | 'info';

export interface NoticeI18n {
    en?: string;
    ja?: string;
    zh?: string;
}

export interface StoreNotice {
    id: string;
    category: NoticeCategory;
    title: string;
    titleI18n?: NoticeI18n | null;
    body: string;
    bodyI18n?: NoticeI18n | null;
    visible: boolean;
    pinned: boolean;
    createdAt: string; // ISO
}

// 오너 관리 화면 카테고리 라벨(한국어). 고객 페이지 라벨은 booking/i18n.ts에서 4개국어로 별도 관리.
export const NOTICE_CATEGORIES: {value: NoticeCategory; label: string}[] = [
    {value: 'notice', label: '공지'},
    {value: 'event', label: '이벤트'},
    {value: 'info', label: '안내'},
];

export function noticeCategoryLabel(category: string): string {
    return NOTICE_CATEGORIES.find((c) => c.value === category)?.label ?? '공지';
}
