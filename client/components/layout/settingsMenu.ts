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
    usePointSystem: boolean;
    useMembershipSystem: boolean;
    useCouponSystem: boolean;
    useOnlineBooking: boolean;
}

// aside의 필터 로직과 동일 — 권한·기능 토글 게이팅.
export function isSettingsMenuVisible(item: SettingsMenuItem, gate: SettingsMenuGate): boolean {
    // 서버 로그인(오너)이 필요한 기능은 오너에게만 노출.
    // 게스트·멤버는 물론, 세션이 아직 안 풀린 로딩 상태(isOwner=false)에서도 노출 금지.
    if (item.tab === 'naver' || item.tab === 'sns' || item.tab === 'member') {
        return gate.isOwner;
    }
    // 멤버(staff)는 기존 노출 항목(고객 명단·계정 관리)만 유지
    if (gate.isLoggedInStaff && item.tab !== 'customers' && item.tab !== 'my') return false;
    // 매장 기능 토글로 켠 경우에만 노출
    if (item.tab === 'point') return gate.usePointSystem;
    if (item.tab === 'membership') return gate.useMembershipSystem;
    if (item.tab === 'coupon') return gate.useCouponSystem;
    if (item.tab === 'booking') return gate.useOnlineBooking;
    if (item.tab === 'notice') return gate.useOnlineBooking;
    return true;
}
