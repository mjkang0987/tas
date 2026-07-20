// 고객 공개 예약 페이지(book.takeaseat.co.kr) 다국어 사전·포매터.
// - 번역 대상은 앱이 제공하는 UI 문구만. 매장 오너 콘텐츠(매장명·서비스명·안내문·담당자명)는 원문 유지.
// - formatDuration(features/services/model.ts)은 앱 전역에서 쓰이므로 건드리지 않고, 예약 페이지 전용 로케일 포매터를 여기 둔다.

import {CATEGORY_LABELS, getPrimaryIndustry, type ShopCategory, type StoreLabels} from '../store-settings/labels';

export type BookLang = 'ko' | 'en' | 'zh' | 'ja';

export const BOOK_LANGS: {value: BookLang; label: string}[] = [
    {value: 'ko', label: '한국어'},
    {value: 'en', label: 'English'},
    {value: 'ja', label: '日本語'},
    {value: 'zh', label: '中文'},
];

const BOOK_LANG_SET = new Set<string>(BOOK_LANGS.map((l) => l.value));

export function isBookLang(v: unknown): v is BookLang {
    return typeof v === 'string' && BOOK_LANG_SET.has(v);
}

// navigator.language('en-US'·'zh-CN'·'ja'…) → 지원 언어. 미지원은 null(기본 ko 유지).
export function detectBookLang(nav: string | null | undefined): BookLang | null {
    if (!nav) return null;
    const lower = nav.toLowerCase();
    if (lower.startsWith('ko')) return 'ko';
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('en')) return 'en';
    return null;
}

// html lang 속성값(WCAG). ko/en/ja 그대로, zh만 zh-CN.
export const HTML_LANG: Record<BookLang, string> = {
    ko: 'ko',
    en: 'en',
    zh: 'zh-CN',
    ja: 'ja',
};

// 예약 상태 라벨.
type BookStatus = 'requested' | 'active' | 'completed' | 'cancelled' | 'noshow';

const STATUS_LABELS: Record<BookLang, Record<BookStatus, string>> = {
    ko: {requested: '신청 접수 · 확정 대기', active: '예약 확정', completed: '방문 완료', cancelled: '취소됨', noshow: '노쇼'},
    en: {requested: 'Requested · Pending', active: 'Confirmed', completed: 'Visited', cancelled: 'Cancelled', noshow: 'No-show'},
    zh: {requested: '已申请 · 待确认', active: '预约确认', completed: '已到店', cancelled: '已取消', noshow: '未到店'},
    ja: {requested: '申込受付 · 確定待ち', active: '予約確定', completed: '来店済み', cancelled: 'キャンセル', noshow: 'ノーショー'},
};

export function statusLabelL(status: BookStatus, lang: BookLang): string {
    return STATUS_LABELS[lang][status];
}

// lookup 목록의 간이 상태(확정/대기).
export function lookupStatusL(status: 'active' | 'requested', lang: BookLang): string {
    if (status === 'active') return STATUS_LABELS[lang].active;
    return lang === 'ko' ? '확정 대기' : lang === 'en' ? 'Pending' : lang === 'zh' ? '待确认' : '確定待ち';
}

// 소요시간(분) → 로케일 표기. formatDuration의 로케일판.
export function formatDurationL(minutes: number, lang: BookLang): string {
    if (minutes <= 0) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    switch (lang) {
        case 'en': {
            if (h > 0 && m > 0) return `${h}h ${m}m`;
            if (h > 0) return `${h}h`;
            return `${m}m`;
        }
        case 'zh': {
            if (h > 0 && m > 0) return `${h}小时${m}分钟`;
            if (h > 0) return `${h}小时`;
            return `${m}分钟`;
        }
        case 'ja': {
            if (h > 0 && m > 0) return `${h}時間${m}分`;
            if (h > 0) return `${h}時間`;
            return `${m}分`;
        }
        default: {
            if (h > 0 && m > 0) return `${h}시간${m}분`;
            if (h > 0) return `${h}시간`;
            return `${m}분`;
        }
    }
}

// 금액(원) → 로케일 표기. 한국 매장이라 통화는 KRW 고정, 한국어는 '원' 접미, 그 외는 '₩' 접두.
export function formatPriceL(price: number, lang: BookLang): string {
    const n = price.toLocaleString();
    return lang === 'ko' ? `${n}원` : `₩${n}`;
}

// 요일 짧은 라벨(0=월…6=일).
const DOW_LABELS: Record<BookLang, string[]> = {
    ko: ['월', '화', '수', '목', '금', '토', '일'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    zh: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    ja: ['月', '火', '水', '木', '金', '土', '日'],
};

export function dowLabelL(dayIndex: number, lang: BookLang): string {
    return DOW_LABELS[lang][dayIndex] ?? '';
}

export function todayLabelL(lang: BookLang): string {
    return lang === 'ko' ? '오늘' : lang === 'en' ? 'Today' : lang === 'zh' ? '今天' : '今日';
}

// "YYYY-MM-DD" → "7월 20일 (월)" 로케일판(요약 바 날짜 라벨).
export function formatBookDateLabel(dateStr: string, dayIndex: number, lang: BookLang): string {
    const mm = Number(dateStr.slice(5, 7));
    const dd = Number(dateStr.slice(8, 10));
    const dow = dowLabelL(dayIndex, lang);
    switch (lang) {
        case 'en': {
            const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${MON[mm - 1] ?? mm} ${dd} (${dow})`;
        }
        case 'zh':
            return `${mm}月${dd}日 (${dow})`;
        case 'ja':
            return `${mm}月${dd}日 (${dow})`;
        default:
            return `${mm}월 ${dd}일 (${dow})`;
    }
}

// 업종 category 기준 담당자/서비스 라벨 번역. ko는 기존 CATEGORY_LABELS 재사용.
const CATEGORY_LABELS_I18N: Record<Exclude<BookLang, 'ko'>, Record<ShopCategory, StoreLabels>> = {
    en: {
        beauty: {assignee: 'Staff', service: 'Service'},
        food: {assignee: 'Table', service: 'Menu'},
        medical: {assignee: 'Doctor', service: 'Treatment'},
        fitness: {assignee: 'Instructor', service: 'Class'},
        class: {assignee: 'Teacher', service: 'Class'},
        pet: {assignee: 'Staff', service: 'Service'},
        repair: {assignee: 'Technician', service: 'Service'},
        space: {assignee: 'Room', service: 'Booking'},
        counsel: {assignee: 'Counselor', service: 'Session'},
        etc: {assignee: 'Staff', service: 'Service'},
    },
    zh: {
        beauty: {assignee: '员工', service: '服务'},
        food: {assignee: '桌位', service: '菜单'},
        medical: {assignee: '医生', service: '诊疗'},
        fitness: {assignee: '教练', service: '课程'},
        class: {assignee: '老师', service: '课程'},
        pet: {assignee: '员工', service: '服务'},
        repair: {assignee: '技师', service: '作业'},
        space: {assignee: '房间', service: '使用'},
        counsel: {assignee: '咨询师', service: '咨询'},
        etc: {assignee: '员工', service: '服务'},
    },
    ja: {
        beauty: {assignee: '担当者', service: 'サービス'},
        food: {assignee: 'テーブル', service: 'メニュー'},
        medical: {assignee: '担当医', service: '診療'},
        fitness: {assignee: 'インストラクター', service: 'レッスン'},
        class: {assignee: '先生', service: 'レッスン'},
        pet: {assignee: '担当者', service: 'サービス'},
        repair: {assignee: '技師', service: '作業'},
        space: {assignee: 'ルーム', service: '利用'},
        counsel: {assignee: 'カウンセラー', service: '相談'},
        etc: {assignee: '担当者', service: 'サービス'},
    },
};

// shopType + lang → {assignee, service} 라벨(로케일). getStoreLabels의 로케일판.
export function localizedStoreLabels(shopType: string | null | undefined, lang: BookLang): StoreLabels {
    const industry = getPrimaryIndustry(shopType);
    const category: ShopCategory = industry ? industry.category : 'etc';
    if (lang === 'ko') return CATEGORY_LABELS[category];
    return CATEGORY_LABELS_I18N[lang][category];
}

// 두 예약 페이지 전체 UI 문구. 정적 문자열 + 매장 라벨을 끼우는 템플릿 함수.
export interface BookI18n {
    // 공통
    loading: string;
    // 랜딩(home)
    homeTitle: string;
    newReservation: string;
    newReservationDesc: (service: string) => string;
    lookupReservation: string;
    lookupReservationDesc: string;
    // 조회(lookup)
    backToStart: string;
    lookupTitle: string;
    lookupGuide: string;
    name: string;
    contact: string;
    telHint: string;
    lookupSubmit: string;
    lookupSubmitting: string;
    lookupEmpty: string;
    // 신규 예약(new)
    onlineReservation: string;
    selectAssignee: (assignee: string) => string;
    anyAssignee: string;
    dayOff: string;
    dayOffTitle: string;
    selectDate: string;
    selectService: (service: string) => string;
    noServices: (service: string) => string;
    availableTime: string;
    loadingTime: string;
    dateUnavailable: string;
    noAvailableTime: string;
    legendAvailable: string;
    legendClosed: string;
    reserverInfo: string;
    memoLabel: string;
    memoPlaceholder: string;
    summaryHead: string;
    date: string;
    time: string;
    pickTime: string;
    pickService: (service: string) => string;
    total: string;
    submitting: string;
    submit: string;
    // 완료
    reserveDoneTitle: string;
    reserveDoneNoticePrefix: string;
    reserveDoneNoticeStrong: string;
    reserveDoneNoticeSuffix: string;
    manageLink: string;
    // not found
    bookNotFoundTitle: string;
    bookNotFoundDesc: string;
    // 에러(예약)
    errDuplicate: string;
    errUnavailableDate: string;
    errSlotTaken: string;
    errReserveFailed: string;
    errLookupFailed: string;
    // 관리 페이지(token)
    myReservation: string;
    resNotFoundTitle: string;
    resNotFoundDesc: string;
    pendingCancel: string;
    pendingChangePrefix: string;
    requestLabel: string;
    changeRequestBtn: string;
    cancelRequestBtn: string;
    requestedNotice: string;
    noActionAvailable: string;
    selectServiceToChange: (service: string) => string;
    selectTime: string;
    changeCancel: string;
    changeSubmit: string;
    changeSubmitting: string;
    confirmCancel: string;
    cancelRequested: string;
    changeRequested: string;
    alreadyPending: string;
    requestFailed: string;
    storeLoadFailed: string;
    // 완료화면/조회 상태 라벨은 statusLabelL/lookupStatusL 사용
}

export const BOOK_STRINGS: Record<BookLang, BookI18n> = {
    ko: {
        loading: '불러오는 중…',
        homeTitle: '예약 서비스',
        newReservation: '신규 예약',
        newReservationDesc: (s) => `${s}·날짜·시간을 골라 예약하기`,
        lookupReservation: '예약 조회 / 변경 / 취소',
        lookupReservationDesc: '이름·연락처로 내 예약 확인하기',
        backToStart: '← 처음으로',
        lookupTitle: '예약 조회',
        lookupGuide: '예약 시 입력한 이름과 연락처로 조회합니다.',
        name: '이름',
        contact: '연락처',
        telHint: '하이픈(-) 없이 숫자만 입력해 주세요.',
        lookupSubmit: '조회하기',
        lookupSubmitting: '조회 중…',
        lookupEmpty: '조회된 예약이 없습니다. 이름·연락처를 확인해 주세요.',
        onlineReservation: '온라인 예약',
        selectAssignee: (a) => `${a} 선택`,
        anyAssignee: '상관없음',
        dayOff: '휴무',
        dayOffTitle: '해당 날짜 휴무',
        selectDate: '날짜 선택',
        selectService: (s) => `${s} 선택`,
        noServices: (s) => `등록된 ${s}가 없습니다.`,
        availableTime: '예약 가능한 시간',
        loadingTime: '시간을 불러오는 중…',
        dateUnavailable: '선택하신 날짜는 예약할 수 없습니다.',
        noAvailableTime: '예약 가능한 시간이 없습니다.',
        legendAvailable: '예약가능',
        legendClosed: '마감',
        reserverInfo: '예약자 정보',
        memoLabel: '요청사항 (선택)',
        memoPlaceholder: '매장에 남길 요청사항이 있으면 적어주세요.',
        summaryHead: '예약 내용',
        date: '날짜',
        time: '시간',
        pickTime: '시간을 선택하세요',
        pickService: (s) => `${s}를 선택하세요`,
        total: '합계',
        submitting: '예약 중…',
        submit: '예약하기',
        reserveDoneTitle: '예약이 신청되었습니다',
        reserveDoneNoticePrefix: '예약 신청이 접수되었습니다. ',
        reserveDoneNoticeStrong: '매장 확인 후 확정',
        reserveDoneNoticeSuffix: '되며, 아래 링크에서 진행 상태를 확인하실 수 있어요. 링크를 저장해 두시면 편리합니다.',
        manageLink: '내 예약 확인·변경·취소',
        bookNotFoundTitle: '예약 페이지를 찾을 수 없습니다',
        bookNotFoundDesc: '주소가 올바른지 확인해 주세요.',
        errDuplicate: '이미 같은 시간에 예약이 있습니다. 다른 시간을 선택해 주세요.',
        errUnavailableDate: '선택하신 날짜는 예약할 수 없습니다. 다른 날짜를 선택해 주세요.',
        errSlotTaken: '선택하신 시간이 방금 마감되었습니다. 다른 시간을 선택해 주세요.',
        errReserveFailed: '예약에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        errLookupFailed: '조회에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        myReservation: '내 예약',
        resNotFoundTitle: '예약을 찾을 수 없습니다',
        resNotFoundDesc: '링크가 올바른지 확인해 주세요.',
        pendingCancel: '취소 요청이 접수되어 매장 확인을 기다리고 있습니다.',
        pendingChangePrefix: '변경 요청이 접수되어 매장 확인을 기다리고 있습니다.',
        requestLabel: '요청',
        changeRequestBtn: '변경 요청',
        cancelRequestBtn: '취소 요청',
        requestedNotice: '매장이 예약을 확인 중입니다. 확정 전에도 취소 요청은 하실 수 있어요.',
        noActionAvailable: '이 예약은 변경·취소 요청을 할 수 없는 상태입니다.',
        selectServiceToChange: (s) => `변경할 ${s} 선택`,
        selectTime: '시간 선택',
        changeCancel: '취소',
        changeSubmit: '변경 요청 보내기',
        changeSubmitting: '요청 중…',
        confirmCancel: '예약 취소를 요청하시겠어요? 매장 확인 후 취소됩니다.',
        cancelRequested: '취소 요청이 접수되었습니다. 매장 확인을 기다려 주세요.',
        changeRequested: '변경 요청이 접수되었습니다. 매장 확인을 기다려 주세요.',
        alreadyPending: '이미 처리 대기 중인 요청이 있습니다.',
        requestFailed: '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        storeLoadFailed: '예약 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    },
    en: {
        loading: 'Loading…',
        homeTitle: 'Book a Reservation',
        newReservation: 'New Reservation',
        newReservationDesc: (s) => `Pick a ${s}, date & time to book`,
        lookupReservation: 'View / Change / Cancel',
        lookupReservationDesc: 'Find your reservation by name & phone',
        backToStart: '← Back',
        lookupTitle: 'Find Reservation',
        lookupGuide: 'Search with the name and phone you used to book.',
        name: 'Name',
        contact: 'Phone',
        telHint: 'Enter digits only, without hyphens (-).',
        lookupSubmit: 'Search',
        lookupSubmitting: 'Searching…',
        lookupEmpty: 'No reservations found. Please check your name and phone.',
        onlineReservation: 'Online Reservation',
        selectAssignee: (a) => `Select ${a}`,
        anyAssignee: 'No preference',
        dayOff: 'Off',
        dayOffTitle: 'Off on this date',
        selectDate: 'Select Date',
        selectService: (s) => `Select ${s}`,
        noServices: (s) => `No ${s} available.`,
        availableTime: 'Available Times',
        loadingTime: 'Loading times…',
        dateUnavailable: 'The selected date is not available.',
        noAvailableTime: 'No available times.',
        legendAvailable: 'Available',
        legendClosed: 'Full',
        reserverInfo: 'Your Details',
        memoLabel: 'Request (optional)',
        memoPlaceholder: 'Leave any request for the store here.',
        summaryHead: 'Reservation Summary',
        date: 'Date',
        time: 'Time',
        pickTime: 'Select a time',
        pickService: (s) => `Select a ${s}`,
        total: 'Total',
        submitting: 'Booking…',
        submit: 'Book Now',
        reserveDoneTitle: 'Your reservation has been requested',
        reserveDoneNoticePrefix: 'Your reservation request has been received. ',
        reserveDoneNoticeStrong: 'It will be confirmed after the store reviews it',
        reserveDoneNoticeSuffix: ', and you can check the status via the link below. Save the link for easy access.',
        manageLink: 'View / Change / Cancel my reservation',
        bookNotFoundTitle: 'Reservation page not found',
        bookNotFoundDesc: 'Please check that the address is correct.',
        errDuplicate: 'There is already a reservation at this time. Please choose another time.',
        errUnavailableDate: 'The selected date is not available. Please choose another date.',
        errSlotTaken: 'The selected time was just taken. Please choose another time.',
        errReserveFailed: 'Reservation failed. Please try again shortly.',
        errLookupFailed: 'Search failed. Please try again shortly.',
        myReservation: 'My Reservation',
        resNotFoundTitle: 'Reservation not found',
        resNotFoundDesc: 'Please check that the link is correct.',
        pendingCancel: 'Your cancellation request has been received and is awaiting store review.',
        pendingChangePrefix: 'Your change request has been received and is awaiting store review.',
        requestLabel: 'Request',
        changeRequestBtn: 'Request Change',
        cancelRequestBtn: 'Request Cancel',
        requestedNotice: 'The store is reviewing your reservation. You can still request a cancellation before it is confirmed.',
        noActionAvailable: 'This reservation cannot be changed or cancelled.',
        selectServiceToChange: (s) => `Select new ${s}`,
        selectTime: 'Select Time',
        changeCancel: 'Cancel',
        changeSubmit: 'Send Change Request',
        changeSubmitting: 'Requesting…',
        confirmCancel: 'Request to cancel this reservation? It will be cancelled after store review.',
        cancelRequested: 'Your cancellation request has been received. Please await store review.',
        changeRequested: 'Your change request has been received. Please await store review.',
        alreadyPending: 'There is already a request being processed.',
        requestFailed: 'Request failed. Please try again shortly.',
        storeLoadFailed: 'Could not load reservation info. Please try again shortly.',
    },
    zh: {
        loading: '加载中…',
        homeTitle: '预约服务',
        newReservation: '新预约',
        newReservationDesc: (s) => `选择${s}、日期和时间进行预约`,
        lookupReservation: '查询 / 变更 / 取消',
        lookupReservationDesc: '用姓名和联系电话查询我的预约',
        backToStart: '← 返回首页',
        lookupTitle: '预约查询',
        lookupGuide: '请使用预约时填写的姓名和联系电话查询。',
        name: '姓名',
        contact: '联系电话',
        telHint: '请只输入数字，不含连字符(-)。',
        lookupSubmit: '查询',
        lookupSubmitting: '查询中…',
        lookupEmpty: '未找到预约。请确认姓名和联系电话。',
        onlineReservation: '在线预约',
        selectAssignee: (a) => `选择${a}`,
        anyAssignee: '不限',
        dayOff: '休息',
        dayOffTitle: '当日休息',
        selectDate: '选择日期',
        selectService: (s) => `选择${s}`,
        noServices: (s) => `暂无可预约的${s}。`,
        availableTime: '可预约时间',
        loadingTime: '正在加载时间…',
        dateUnavailable: '所选日期无法预约。',
        noAvailableTime: '暂无可预约的时间。',
        legendAvailable: '可预约',
        legendClosed: '已满',
        reserverInfo: '预约人信息',
        memoLabel: '备注（选填）',
        memoPlaceholder: '如有需要向店家说明的事项，请填写。',
        summaryHead: '预约内容',
        date: '日期',
        time: '时间',
        pickTime: '请选择时间',
        pickService: (s) => `请选择${s}`,
        total: '合计',
        submitting: '预约中…',
        submit: '立即预约',
        reserveDoneTitle: '预约申请已提交',
        reserveDoneNoticePrefix: '您的预约申请已收到。',
        reserveDoneNoticeStrong: '经店家确认后生效',
        reserveDoneNoticeSuffix: '，您可通过下方链接查看进度。建议保存该链接以便查询。',
        manageLink: '查看·变更·取消我的预约',
        bookNotFoundTitle: '找不到预约页面',
        bookNotFoundDesc: '请确认网址是否正确。',
        errDuplicate: '该时间段已有预约，请选择其他时间。',
        errUnavailableDate: '所选日期无法预约，请选择其他日期。',
        errSlotTaken: '所选时间刚刚被预约，请选择其他时间。',
        errReserveFailed: '预约失败，请稍后再试。',
        errLookupFailed: '查询失败，请稍后再试。',
        myReservation: '我的预约',
        resNotFoundTitle: '找不到该预约',
        resNotFoundDesc: '请确认链接是否正确。',
        pendingCancel: '取消申请已收到，正在等待店家确认。',
        pendingChangePrefix: '变更申请已收到，正在等待店家确认。',
        requestLabel: '申请',
        changeRequestBtn: '申请变更',
        cancelRequestBtn: '申请取消',
        requestedNotice: '店家正在确认您的预约。确认前您仍可申请取消。',
        noActionAvailable: '该预约当前无法申请变更或取消。',
        selectServiceToChange: (s) => `选择要变更的${s}`,
        selectTime: '选择时间',
        changeCancel: '取消',
        changeSubmit: '发送变更申请',
        changeSubmitting: '申请中…',
        confirmCancel: '确定要申请取消此预约吗？经店家确认后取消。',
        cancelRequested: '取消申请已收到，请等待店家确认。',
        changeRequested: '变更申请已收到，请等待店家确认。',
        alreadyPending: '已有正在处理中的申请。',
        requestFailed: '申请失败，请稍后再试。',
        storeLoadFailed: '无法加载预约信息，请稍后再试。',
    },
    ja: {
        loading: '読み込み中…',
        homeTitle: '予約サービス',
        newReservation: '新規予約',
        newReservationDesc: (s) => `${s}・日付・時間を選んで予約`,
        lookupReservation: '確認 / 変更 / キャンセル',
        lookupReservationDesc: 'お名前・連絡先で予約を確認',
        backToStart: '← 最初に戻る',
        lookupTitle: '予約確認',
        lookupGuide: '予約時に入力したお名前と連絡先で照会します。',
        name: 'お名前',
        contact: '連絡先',
        telHint: 'ハイフン(-)なしで数字のみ入力してください。',
        lookupSubmit: '照会する',
        lookupSubmitting: '照会中…',
        lookupEmpty: '予約が見つかりませんでした。お名前・連絡先をご確認ください。',
        onlineReservation: 'オンライン予約',
        selectAssignee: (a) => `${a}を選択`,
        anyAssignee: '指定なし',
        dayOff: '休み',
        dayOffTitle: 'その日は休みです',
        selectDate: '日付を選択',
        selectService: (s) => `${s}を選択`,
        noServices: (s) => `登録された${s}がありません。`,
        availableTime: '予約可能な時間',
        loadingTime: '時間を読み込み中…',
        dateUnavailable: '選択された日付は予約できません。',
        noAvailableTime: '予約可能な時間がありません。',
        legendAvailable: '予約可能',
        legendClosed: '満席',
        reserverInfo: 'ご予約者情報',
        memoLabel: 'ご要望（任意）',
        memoPlaceholder: '店舗へのご要望があればご記入ください。',
        summaryHead: '予約内容',
        date: '日付',
        time: '時間',
        pickTime: '時間を選択してください',
        pickService: (s) => `${s}を選択してください`,
        total: '合計',
        submitting: '予約中…',
        submit: '予約する',
        reserveDoneTitle: '予約を申し込みました',
        reserveDoneNoticePrefix: '予約の申し込みを受け付けました。',
        reserveDoneNoticeStrong: '店舗の確認後に確定',
        reserveDoneNoticeSuffix: 'され、下記リンクから進捗を確認できます。リンクを保存しておくと便利です。',
        manageLink: '予約の確認・変更・キャンセル',
        bookNotFoundTitle: '予約ページが見つかりません',
        bookNotFoundDesc: 'アドレスが正しいかご確認ください。',
        errDuplicate: '同じ時間に既に予約があります。別の時間を選択してください。',
        errUnavailableDate: '選択された日付は予約できません。別の日付を選択してください。',
        errSlotTaken: '選択された時間はたった今埋まりました。別の時間を選択してください。',
        errReserveFailed: '予約に失敗しました。しばらくしてから再度お試しください。',
        errLookupFailed: '照会に失敗しました。しばらくしてから再度お試しください。',
        myReservation: '私の予約',
        resNotFoundTitle: '予約が見つかりません',
        resNotFoundDesc: 'リンクが正しいかご確認ください。',
        pendingCancel: 'キャンセル申請を受け付け、店舗の確認をお待ちしています。',
        pendingChangePrefix: '変更申請を受け付け、店舗の確認をお待ちしています。',
        requestLabel: '申請',
        changeRequestBtn: '変更申請',
        cancelRequestBtn: 'キャンセル申請',
        requestedNotice: '店舗が予約を確認中です。確定前でもキャンセル申請は可能です。',
        noActionAvailable: 'この予約は変更・キャンセル申請ができない状態です。',
        selectServiceToChange: (s) => `変更する${s}を選択`,
        selectTime: '時間を選択',
        changeCancel: 'キャンセル',
        changeSubmit: '変更申請を送信',
        changeSubmitting: '申請中…',
        confirmCancel: 'この予約のキャンセルを申請しますか？店舗の確認後にキャンセルされます。',
        cancelRequested: 'キャンセル申請を受け付けました。店舗の確認をお待ちください。',
        changeRequested: '変更申請を受け付けました。店舗の確認をお待ちください。',
        alreadyPending: '既に処理待ちの申請があります。',
        requestFailed: '申請に失敗しました。しばらくしてから再度お試しください。',
        storeLoadFailed: '予約情報を読み込めませんでした。しばらくしてから再度お試しください。',
    },
};
