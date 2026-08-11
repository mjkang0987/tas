// aside(데스크톱 사이드바)와 /menu(모바일 설정 화면)가 공유하는 설정 메뉴 정의.
// 한 곳에서만 관리해 두 화면의 항목/게이팅이 어긋나지 않도록 한다.

export interface SettingsMenuItem {
    tab: string;
    href: string;
    label: string;
    icon: string;
}

export const SETTINGS_SUBMENU: SettingsMenuItem[] = [
    {tab: 'revenue', href: '/settings/revenue', label: '매출', icon: 'revenue'},
    {tab: 'store', href: '/settings/store', label: '매장 관리', icon: 'store'},
    {tab: 'point', href: '/settings/point', label: '적립금 관리', icon: 'point'},
    {tab: 'membership', href: '/settings/membership', label: '회원권 관리', icon: 'membership'},
    {tab: 'coupon', href: '/settings/coupon', label: '쿠폰 관리', icon: 'coupon'},
    {tab: 'booking', href: '/settings/booking', label: '고객 예약 설정', icon: 'booking'},
    {tab: 'notice', href: '/settings/notice', label: '공지사항 관리', icon: 'notice'},
    {tab: 'service', href: '/settings/service', label: '서비스 관리', icon: 'service'},
    {tab: 'assignee', href: '/settings/assignee', label: '담당자 관리', icon: 'assignee'},
    {tab: 'customers', href: '/address', label: '고객 명단', icon: 'customers'},
    {tab: 'naver', href: '/settings/naver', label: '네이버예약 연동', icon: 'naver'},
    {tab: 'sns', href: '/settings/sns', label: 'SNS 연동', icon: 'sns'},
    {tab: 'member', href: '/settings/member', label: '멤버 관리', icon: 'member'},
    {tab: 'my', href: '/mypage', label: '계정 관리', icon: 'account'},
];

export interface SettingsMenuGate {
    isOwner: boolean;
    isLoggedInStaff: boolean;
    // 미로그인(로컬 모드). 세션이 아직 안 풀린 로딩 상태도 여기에 들어온다 — 서버가 필요한 항목은
    // 확정될 때까지 감추는 쪽이 안전하다(sns·member와 같은 취급).
    isGuest: boolean;
    usePointSystem: boolean;
    useMembershipSystem: boolean;
    useCouponSystem: boolean;
    useOnlineBooking: boolean;
    // 매장 기능 토글이 아니라 서버가 정하는 공개 범위(`server/naver-access.ts`).
    naverBookingEnabled: boolean;
}

// aside의 필터 로직과 동일 — 권한·기능 토글 게이팅.
export function isSettingsMenuVisible(item: SettingsMenuItem, gate: SettingsMenuGate): boolean {
    // 네이버예약 연동은 아직 전체 공개가 아니라, 오너 중에서도 노출 대상 매장에만 보인다.
    if (item.tab === 'naver') {
        return gate.isOwner && gate.naverBookingEnabled;
    }
    // 서버 로그인(오너)이 필요한 기능은 오너에게만 노출.
    // 게스트·멤버는 물론, 세션이 아직 안 풀린 로딩 상태(isOwner=false)에서도 노출 금지.
    if (item.tab === 'sns' || item.tab === 'member') {
        return gate.isOwner;
    }
    // 멤버(staff)는 기존 노출 항목(고객 명단·계정 관리)만 유지
    if (gate.isLoggedInStaff && item.tab !== 'customers' && item.tab !== 'my') return false;
    // 쿠폰·회원권·고객예약(+그에 딸린 공지)은 서버가 있어야 동작한다(발급·차감 API, 공개 예약 페이지).
    // 게스트에겐 토글 자체를 주지 않으므로 메뉴도 함께 감춘다 — 켤 수는 있는데 못 쓰는 항목은 두지 않는다.
    // 판정을 토글 값에 맡기지 않는 이유: 예전에 켜 둔 게스트의 로컬 값이 남아 있으면 그대로 노출된다.
    if (gate.isGuest && (item.tab === 'membership' || item.tab === 'coupon' || item.tab === 'booking' || item.tab === 'notice')) {
        return false;
    }
    // 매장 기능 토글로 켠 경우에만 노출
    if (item.tab === 'point') return gate.usePointSystem;
    if (item.tab === 'membership') return gate.useMembershipSystem;
    if (item.tab === 'coupon') return gate.useCouponSystem;
    if (item.tab === 'booking') return gate.useOnlineBooking;
    if (item.tab === 'notice') return gate.useOnlineBooking;
    return true;
}
