import {TERMS_BODY} from './terms';
import {PRIVACY_BODY} from './privacy';
import {DPA_BODY} from './dpa';
import {BOOKING_CONSENT_BODY} from './booking-consent';
import {STORE_PRIVACY_BODY} from './store-privacy';

// 정책 문서 레지스트리. 본문은 각 문서 파일이 단일 소스이고,
// 여기서는 제목 등 메타데이터만 모은다.
// - navTitle: 앱 인라인 페이지의 PageHero 제목 / 브라우저 탭 제목
// - docTitle: 풀페이지(독립 HTML)의 <h1> 제목
export const POLICIES = {
    terms: {navTitle: '이용약관', docTitle: 'TAS 이용약관', body: TERMS_BODY},
    privacy: {navTitle: '개인정보처리방침', docTitle: 'TAS 개인정보 처리방침', body: PRIVACY_BODY},
    dpa: {navTitle: '개인정보 처리 위탁계약', docTitle: '개인정보 처리 위탁계약 (DPA)', body: DPA_BODY},
    // 아래 둘은 당사자가 다르다 — 위 3개가 "TAS ↔ 매장 오너"라면, 이 둘은
    // "매장(개인정보처리자) ↔ 고객(정보주체)"이다. 주어가 매장이라 본문에 매장명이 들어간다.
    'booking-consent': {
        navTitle: '개인정보 수집·이용 안내',
        docTitle: '개인정보 수집·이용 안내',
        body: BOOKING_CONSENT_BODY,
    },
    'store-privacy': {
        navTitle: '개인정보처리방침',
        docTitle: '매장 개인정보 처리방침',
        body: STORE_PRIVACY_BODY,
    },
} as const;

export type PolicySlug = keyof typeof POLICIES;

export const POLICY_SLUGS = Object.keys(POLICIES) as PolicySlug[];

export const isPolicySlug = (value: unknown): value is PolicySlug =>
    typeof value === 'string' && value in POLICIES;

// 본문의 치환 토큰 기본값. 매장명을 모르는 경로(풀페이지 등)에서도 문서가 읽히도록
// 일반 표현으로 폴백한다 — 토큰이 화면에 그대로 노출되는 일이 없어야 한다.
const POLICY_VAR_FALLBACK = {
    storeName: '예약하신 매장',
    // 연락처는 매장이 예약 설정에서 등록한다(온라인 예약 사용 시 필수). 미등록 매장(구 데이터)이나
    // 매장 컨텍스트가 없는 풀페이지에서도 문장이 성립하도록 일반 표현으로 폴백한다.
    storeContact: '매장에 직접 문의',
} as const;

export type PolicyVars = Partial<Record<keyof typeof POLICY_VAR_FALLBACK, string>>;

// 본문의 {{token}}을 실제 값으로 치환한다.
// 모든 렌더 경로(레이어·풀페이지·인라인)가 이 함수를 통과해야 토큰이 새지 않는다.
export function applyPolicyVars(body: string, vars?: PolicyVars): string {
    return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        const supplied = vars?.[key as keyof PolicyVars];
        if (supplied && supplied.trim()) return supplied;
        return POLICY_VAR_FALLBACK[key as keyof typeof POLICY_VAR_FALLBACK] ?? match;
    });
}
