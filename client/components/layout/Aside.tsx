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
import {AsideMenuIcon} from './AsideMenuIcon';
import {SETTINGS_SUBMENU, isSettingsMenuVisible} from './settingsMenu';
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
    const useOnlineBooking = useCalendarStore((s) => s.useOnlineBooking);
    const labels = useStoreLabels();
    const submenuLabel = (item: typeof SETTINGS_SUBMENU[number]) =>
        item.tab === 'assignee' ? `${labels.assignee} 관리`
            : item.tab === 'service' ? `${labels.service} 관리`
                : item.label;

    return (<StyledAside $isVisible={aside.isVisible}>
            <StyledBrandLink href="/"
                             onClick={closeMobile}>
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
                            {SETTINGS_SUBMENU.filter((item) => isSettingsMenuVisible(item, {
                                isOwner,
                                isLoggedInStaff,
                                usePointSystem,
                                useMembershipSystem,
                                useCouponSystem,
                                useOnlineBooking,
                            })).map((item) =>
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
