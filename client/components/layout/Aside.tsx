import React, {useState} from 'react';

import {useRouter} from 'next/router';
import {signOut, useSession} from 'next-auth/react';

import {useCalendarStore} from '../../store/calendarStore';
import {roundToHalfHour, pad} from '../../utils/timeRound';
import {toDateKey} from '../../utils/reservations';

import {
    ASIDE as asides,
    ViewType
} from '../../utils/constants';

import {AuthActionIcon} from '../ui/AuthActionIcon';
import {ButtonText} from '../ui/ButtonText';
import {CustomerAddModal} from '../address/CustomerAddModal';
import {StoreSwitcher} from './StoreSwitcher';
import {AsideGuestLogout} from './AsideGuestLogout';
import {clearGuestConsentAck, clearGuestEntryResolved, clearGuestTermsAgreed} from '../../lib/local-db';
import {AsideMenuIcon, StyledMenuIcon} from './AsideMenuIcon';
import {useStoreLabels} from '../../hooks/useStoreLabels';
import {
    StyledAside,
    StyledBrandLink,
    StyledBrandLogo,
    StyledGuestInfo,
    StyledStoreNameLink,
    StyledUserInfoLink,
    StyledUserName,
    StyledUserEmail,
    StyledScrollArea,
    StyledNav,
    StyledDivider,
    StyledNavLink,
    StyledMenuContent,
    StyledCreateButton,
    StyledAccordionToggle,
    StyledAccordionContent,
    StyledSubNavLink,
    StyledLogoutButton,
    StyledHelpButton,
    StyledInquiryLink,
    StyledToggleIcon,
    StyledToggleSvg,
    StyledLegalLinks,
    StyledLegalLink,
} from './Aside.styles';

const SETTINGS_SUBMENU = [
    {tab: 'revenue', href: '/settings/revenue', label: '매출', icon: 'revenue'},
    {tab: 'point', href: '/settings/point', label: '적립금 관리', icon: 'point'},
    {tab: 'membership', href: '/settings/membership', label: '회원권 관리', icon: 'membership'},
    {tab: 'coupon', href: '/settings/coupon', label: '쿠폰 관리', icon: 'coupon'},
    {tab: 'store', href: '/settings/store', label: '매장 관리', icon: 'store'},
    {tab: 'service', href: '/settings/service', label: '서비스 관리', icon: 'service'},
    {tab: 'assignee', href: '/settings/assignee', label: '담당자 관리', icon: 'assignee'},
    {tab: 'customers', href: '/address', label: '고객 명단', icon: 'customers'},
    {tab: 'naver', href: '/settings/naver', label: '네이버예약 연동', icon: 'naver'},
    {tab: 'sns', href: '/settings/sns', label: 'SNS 연동', icon: 'sns'},
    {tab: 'member', href: '/settings/member', label: '멤버 관리', icon: 'member'},
    {tab: 'my', href: '/mypage', label: '계정 관리', icon: 'account'},
];

export const Aside = () => {
    const router = useRouter();
    const {data: session} = useSession();
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const setView = useCalendarStore((s) => s.setView);
    const currValue = useCalendarStore((s) => s.target);
    const setCurr = useCalendarStore((s) => s.setTargetFromDate);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);
    const [reservationOpen, setReservationOpen] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(true);
    const [showGuestLogout, setShowGuestLogout] = useState(false);
    const [showCustomerAdd, setShowCustomerAdd] = useState(false);
    const storeName = useCalendarStore((s) => s.storeName);
    const isGuest = !session;

    const todayMidnight = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };

    const setChangeView = ({viewType}: { viewType: string }) => {
        const type = viewType.toLowerCase();
        setView({type});

        const today = todayMidnight();
        if (type === ViewType.Week) {
            today.setDate(today.getDate() - today.getDay());
        }
        setCurr(today);
    };

    const setAsPath = (path: string) => {
        const routeDate = todayMidnight();

        if (path === ViewType.Week) {
            routeDate.setDate(routeDate.getDate() - routeDate.getDay());
        }

        const result: (string | number)[] = [path, routeDate.getFullYear()];

        if (path !== ViewType.Year) {
            result.push(routeDate.getMonth() + 1);
        }

        if (path === ViewType.Day || path === ViewType.Week || path === ViewType.Three) {
            result.push(routeDate.getDate());
        }

        return result;
    };

    const handleCreateReservation = () => {
        const now = new Date();
        const {hour, rounded} = roundToHalfHour(now.getHours(), now.getMinutes());
        const date = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
        const startTime = `${pad(hour)}:${pad(rounded)}`;

        setCreateReservationInitial({date, startTime});
    };

    const closeMobile = () => {
        if (window.matchMedia('(max-width: 640px)').matches) {
            setAside({isVisible: false});
        }
    };

    const activeReservationType = router.asPath.split('?')[0].split('/')[1] || '';
    const activeSettingsTab = typeof router.query.tab === 'string' ? router.query.tab : 'revenue';
    const isSettingsPage = router.pathname === '/settings' || router.pathname === '/settings/[tab]';
    const userRole = session?.user?.role;
    const isOwner = userRole === 'owner';
    const isLoggedInStaff = !!session?.user && !isOwner;
    const usePointSystem = useCalendarStore((s) => s.usePointSystem);
    const useMembershipSystem = useCalendarStore((s) => s.useMembershipSystem);
    const useCouponSystem = useCalendarStore((s) => s.useCouponSystem);
    const labels = useStoreLabels();
    const submenuLabel = (item: typeof SETTINGS_SUBMENU[number]) =>
        item.tab === 'assignee' ? `${labels.assignee} 관리`
            : item.tab === 'service' ? `${labels.service} 관리`
                : item.label;

    return (<StyledAside $isVisible={aside.isVisible}>
            <StyledBrandLink href="/"
                             onClick={closeMobile}>
                <StyledMenuIcon viewBox="0 0 24 24"
                                aria-hidden="true">
                    <path d="M3 9.5L12 4L21 9.5" />
                    <path d="M5 9.5V18.5C5 19.05 5.45 19.5 6 19.5H18C18.55 19.5 19 19.05 19 18.5V9.5" />
                </StyledMenuIcon>
                <StyledBrandLogo src="/logo/logo.svg" alt="TAS" />
            </StyledBrandLink>
            {isGuest ? (
                storeName ? <StyledStoreNameLink href="/settings/store" onClick={closeMobile}>{storeName}</StyledStoreNameLink> : null
            ) : (
                <StoreSwitcher fallbackName={storeName} onNavigate={closeMobile} />
            )}
            {session?.user ? (
                <StyledUserInfoLink href="/mypage"
                                    onClick={closeMobile}>
                    <StyledUserName>{session.user.name ?? '-'}</StyledUserName>
                    <StyledUserEmail>{session.user.email ?? ''}</StyledUserEmail>
                </StyledUserInfoLink>
            ) : (
                <StyledGuestInfo>
                    <StyledUserName>게스트</StyledUserName>
                </StyledGuestInfo>
            )}
            <StyledScrollArea>
                <StyledNav>
                    <StyledAccordionToggle type="button"
                                           onClick={() => setReservationOpen(!reservationOpen)}>
                        <StyledMenuContent>
                            <AsideMenuIcon icon="calendarManage" />
                            <span>예약관리</span>
                        </StyledMenuContent>
                        <StyledToggleIcon $collapsed={!reservationOpen}
                                          aria-hidden="true">
                            <StyledToggleSvg viewBox="0 0 24 24">
                                <path d="M9 6L15 12L9 18" />
                            </StyledToggleSvg>
                        </StyledToggleIcon>
                    </StyledAccordionToggle>
                    <StyledAccordionContent $open={reservationOpen} id="tour-views">
                        {currValue && Object.keys(asides).map((a) =>
                            <StyledSubNavLink href={`/${setAsPath(a.toLowerCase()).join('/')}`}
                                              $active={activeReservationType === a.toLowerCase()}
                                              key={asides[a].id}
                                              onClick={() => {
                                                  setChangeView({viewType: a});
                                                  closeMobile();
                                              }}>
                                <StyledMenuContent>
                                    <AsideMenuIcon icon={asides[a].icon || 'day'} />
                                    <span>{asides[a].title}</span>
                                </StyledMenuContent>
                            </StyledSubNavLink>
                        )}
                    </StyledAccordionContent>
                    <StyledDivider />
                    <StyledCreateButton type="button"
                                        id="tour-add-reservation"
                                        onClick={() => {
                                            handleCreateReservation();
                                            closeMobile();
                                        }}>
                        <AsideMenuIcon icon="create" />
                        <ButtonText a11y={false}>예약추가</ButtonText>
                    </StyledCreateButton>
                    <StyledCreateButton type="button"
                                        onClick={() => {
                                            setShowCustomerAdd(true);
                                            closeMobile();
                                        }}>
                        <AsideMenuIcon icon="customerAdd" />
                        <ButtonText a11y={false}>고객추가</ButtonText>
                    </StyledCreateButton>
                    <StyledDivider />
                    <>
                        <StyledAccordionToggle type="button"
                                               id="tour-settings"
                                               onClick={() => setSettingsOpen(!settingsOpen)}>
                            <StyledMenuContent>
                                <AsideMenuIcon icon="settings" />
                                <span>설정</span>
                            </StyledMenuContent>
                            <StyledToggleIcon $collapsed={!settingsOpen}
                                              aria-hidden="true">
                                <StyledToggleSvg viewBox="0 0 24 24">
                                    <path d="M9 6L15 12L9 18" />
                                </StyledToggleSvg>
                            </StyledToggleIcon>
                        </StyledAccordionToggle>
                        <StyledAccordionContent $open={settingsOpen}>
                            {SETTINGS_SUBMENU.filter((item) => {
                                // 서버 로그인(오너)이 필요한 기능은 오너에게만 노출.
                                // 게스트·멤버는 물론, 세션이 아직 안 풀린 로딩 상태(isOwner=false)에서도
                                // 절대 노출되지 않도록 isOwner 기준으로 명시 게이팅한다.
                                if (item.tab === 'naver' || item.tab === 'sns' || item.tab === 'member') {
                                    return isOwner;
                                }
                                // 멤버(staff)는 기존 노출 항목(고객 명단·계정 관리)만 유지
                                if (isLoggedInStaff && item.tab !== 'customers' && item.tab !== 'my') return false;
                                // 매장 기능 토글로 켠 경우에만 노출
                                if (item.tab === 'point') return usePointSystem;
                                if (item.tab === 'membership') return useMembershipSystem;
                                if (item.tab === 'coupon') return useCouponSystem;
                                return true;
                            }).map((item) =>
                                <StyledSubNavLink href={item.href}
                                                  $active={item.tab === 'my'
                                                      ? router.pathname === '/mypage'
                                                      : item.tab === 'customers'
                                                          ? router.pathname === '/address'
                                                          : isSettingsPage && activeSettingsTab === item.tab}
                                                  key={item.tab}
                                                  onClick={closeMobile}>
                                    <StyledMenuContent>
                                        <AsideMenuIcon icon={item.icon} />
                                        <span>{submenuLabel(item)}</span>
                                    </StyledMenuContent>
                                </StyledSubNavLink>
                            )}
                        </StyledAccordionContent>
                    </>
                </StyledNav>
                <StyledDivider />
                <StyledInquiryLink href="/inquiry"
                                   $active={router.pathname === '/inquiry'}
                                   onClick={closeMobile}>
                    <AsideMenuIcon icon="inquiry" />
                    <span>고객센터</span>
                </StyledInquiryLink>
                <StyledHelpButton type="button"
                                  onClick={() => {
                                      if (typeof window !== 'undefined') window.dispatchEvent(new Event('tas:start-tour'));
                                      closeMobile();
                                  }}>
                    <AsideMenuIcon icon="guide" />
                    <span>사용 안내</span>
                </StyledHelpButton>
                <StyledLogoutButton type="button"
                                    onClick={() => isGuest ? setShowGuestLogout(true) : signOut({callbackUrl: '/login'})}>
                    <AuthActionIcon direction="logout" />
                    <span>로그아웃</span>
                </StyledLogoutButton>
                <StyledLegalLinks>
                    <StyledLegalLink href="/terms" onClick={closeMobile}>이용약관</StyledLegalLink>
                    <StyledLegalLink href="/privacy" onClick={closeMobile}>개인정보처리방침</StyledLegalLink>
                    {!isGuest && (
                        <StyledLegalLink href="/dpa" onClick={closeMobile}>개인정보 처리위탁</StyledLegalLink>
                    )}
                </StyledLegalLinks>
                {showCustomerAdd && (
                    <CustomerAddModal onClose={() => setShowCustomerAdd(false)} />
                )}
                {showGuestLogout && (
                    <AsideGuestLogout onClose={() => setShowGuestLogout(false)}
                                      onConfirm={() => {
                                          localStorage.removeItem('takeaseat.local-db.v1');
                                          // 데이터와 함께 게스트 약관 동의·진입 플래그도 초기화 (다음 게스트 시작 시 재동의)
                                          clearGuestTermsAgreed();
                                          clearGuestEntryResolved();
                                          clearGuestConsentAck();
                                          // 하드 리로드로 인메모리 store까지 초기화 (router.push는 모듈 store가 남아 데이터가 보임)
                                          window.location.href = '/login';
                                      }} />
                )}
            </StyledScrollArea>
        </StyledAside>
    );
};
