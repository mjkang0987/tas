import React, {useState} from 'react';

import Link from 'next/link';
import {useRouter} from 'next/router';
import {signOut, useSession} from 'next-auth/react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import {roundToHalfHour, pad} from '../../utils/timeRound';
import {toDateKey} from '../../utils/reservations';

import {
    ASIDE as asides,
    ViewType
} from '../../utils/constants';

import {AuthActionIcon} from '../ui/AuthActionIcon';
import {ButtonText} from '../ui/ButtonText';
import {AdBanner} from '../ad/AdBanner';

const SETTINGS_SUBMENU = [
    {tab: 'revenue', href: '/settings/revenue', label: '매출', icon: 'revenue'},
    {tab: 'point', href: '/settings/point', label: '적립금 관리', icon: 'point'},
    {tab: 'store', href: '/settings/store', label: '매장 관리', icon: 'store'},
    {tab: 'service', href: '/settings/service', label: '서비스 관리', icon: 'service'},
    {tab: 'designer', href: '/settings/designer', label: '디자이너 관리', icon: 'designer'},
    {tab: 'customers', href: '/address', label: '고객 명단', icon: 'customers'},
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

    return (<StyledAside $isVisible={aside.isVisible}>
            <StyledBrandLink href="/"
                             onClick={closeMobile}>
                <StyledMenuIcon viewBox="0 0 24 24"
                                aria-hidden="true">
                    <path d="M3 9.5L12 4L21 9.5" />
                    <path d="M5 9.5V18.5C5 19.05 5.45 19.5 6 19.5H18C18.55 19.5 19 19.05 19 18.5V9.5" />
                </StyledMenuIcon>
                <span>TAS</span>
            </StyledBrandLink>
            {session?.user && (
                <StyledUserInfoLink href="/mypage"
                                    onClick={closeMobile}>
                    <StyledUserName>{session.user.name ?? '-'}</StyledUserName>
                    <StyledUserEmail>{session.user.email ?? ''}</StyledUserEmail>
                </StyledUserInfoLink>
            )}
            <StyledScrollArea>
                <StyledNav>
                    <StyledAccordionToggle type="button"
                                           onClick={() => setReservationOpen(!reservationOpen)}>
                        <StyledMenuContent>
                            <MenuIcon icon="calendarManage" />
                            <span>예약관리</span>
                        </StyledMenuContent>
                        <StyledToggleIcon $collapsed={!reservationOpen}
                                          aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 6L15 12L9 18" />
                            </svg>
                        </StyledToggleIcon>
                    </StyledAccordionToggle>
                    <StyledAccordionContent $open={reservationOpen}>
                        {currValue && Object.keys(asides).map((a) =>
                            <StyledSubNavLink href={`/${setAsPath(a.toLowerCase()).join('/')}`}
                                              $active={activeReservationType === a.toLowerCase()}
                                              key={asides[a].id}
                                              onClick={() => {
                                                  setChangeView({viewType: a});
                                                  closeMobile();
                                              }}>
                                <StyledMenuContent>
                                    <MenuIcon icon={asides[a].icon || 'day'} />
                                    <span>{asides[a].title}</span>
                                </StyledMenuContent>
                            </StyledSubNavLink>
                        )}
                    </StyledAccordionContent>
                    <StyledDivider />
                    <StyledCreateButton type="button"
                                        onClick={() => {
                                            handleCreateReservation();
                                            closeMobile();
                                        }}>
                        <MenuIcon icon="create" />
                        <ButtonText a11y={false}>예약추가</ButtonText>
                    </StyledCreateButton>
                    <StyledDivider />
                    <StyledAccordionToggle type="button"
                                           onClick={() => setSettingsOpen(!settingsOpen)}>
                        <StyledMenuContent>
                            <MenuIcon icon="settings" />
                            <span>설정</span>
                        </StyledMenuContent>
                        <StyledToggleIcon $collapsed={!settingsOpen}
                                          aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 6L15 12L9 18" />
                            </svg>
                        </StyledToggleIcon>
                    </StyledAccordionToggle>
                    <StyledAccordionContent $open={settingsOpen}>
                        {SETTINGS_SUBMENU.map((item) =>
                            <StyledSubNavLink href={item.href}
                                              $active={item.tab === 'my'
                                                  ? router.pathname === '/mypage'
                                                  : item.tab === 'customers'
                                                      ? router.pathname === '/address'
                                                      : isSettingsPage && activeSettingsTab === item.tab}
                                              key={item.tab}
                                              onClick={closeMobile}>
                                <StyledMenuContent>
                                    <MenuIcon icon={item.icon} />
                                    <span>{item.label}</span>
                                </StyledMenuContent>
                            </StyledSubNavLink>
                        )}
                    </StyledAccordionContent>
                </StyledNav>
                <StyledDivider />
                <StyledInquiryLink href="/inquiry"
                                   $active={router.pathname === '/inquiry'}
                                   onClick={closeMobile}>
                    <MenuIcon icon="inquiry" />
                    <span>고객센터</span>
                </StyledInquiryLink>
                <StyledLogoutButton type="button"
                                    onClick={() => isGuest ? setShowGuestLogout(true) : signOut({callbackUrl: '/login'})}>
                    <AuthActionIcon direction="logout" />
                    <span>로그아웃</span>
                </StyledLogoutButton>
                {showGuestLogout && (
                    <StyledGuestLogoutOverlay onClick={() => setShowGuestLogout(false)}>
                        <StyledGuestLogoutDialog onClick={(e) => e.stopPropagation()}>
                            <StyledGuestLogoutMsg>
                                현재 기기에서 모든 정보(예약, 서비스, 디자이너, 고객명단)가 삭제됩니다.
                                로그아웃 하시겠습니까?
                            </StyledGuestLogoutMsg>
                            <StyledGuestLogoutActions>
                                <StyledGuestLogoutCancel type="button" onClick={() => setShowGuestLogout(false)}>취소</StyledGuestLogoutCancel>
                                <StyledGuestLogoutConfirm type="button" onClick={() => {
                                    localStorage.removeItem('takeaseat.local-db.v1');
                                    router.push('/login');
                                }}>확인</StyledGuestLogoutConfirm>
                            </StyledGuestLogoutActions>
                            <StyledGuestLogoutLink href="/login">SNS 계정 연동</StyledGuestLogoutLink>
                        </StyledGuestLogoutDialog>
                    </StyledGuestLogoutOverlay>
                )}
                <StyledAsideAd>
                    <AdBanner adSlot="ASIDE_SLOT_ID"
                              adFormat="vertical" />
                </StyledAsideAd>
            </StyledScrollArea>
        </StyledAside>
    );
};

const MenuIcon = ({icon}: { icon: string }) => {
    if (icon === 'day') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <rect x="3.5"
                      y="5"
                      width="17"
                      height="15.5"
                      rx="3" />
                <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H8.01M12 13H12.01M16 13H16.01M8 17H8.01M12 17H12.01M16 17H16.01" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'three') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <rect x="3.5"
                      y="5"
                      width="17"
                      height="15.5"
                      rx="3" />
                <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M7.5 13.5H16.5M7.5 17H14.5" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'week') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <rect x="3.5"
                      y="5"
                      width="17"
                      height="15.5"
                      rx="3" />
                <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M7.5 13H16.5M7.5 17H16.5" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'month') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <rect x="3.5"
                      y="4.5"
                      width="17"
                      height="16"
                      rx="3" />
                <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H8.01M12 13H12.01M16 13H16.01M8 17H8.01M12 17H12.01M16 17H16.01" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'year') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <rect x="3.5"
                      y="4.5"
                      width="17"
                      height="16"
                      rx="3" />
                <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H16M8 17H16" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'create') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <path d="M12 5V19M5 12H19" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'calendarManage') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <rect x="3.5"
                      y="4.5"
                      width="17"
                      height="16"
                      rx="3" />
                <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H16M8 17H13.5" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'settings') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <circle cx="12"
                        cy="12"
                        r="3.2" />
                <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.84V20.99A2 2 0 1 1 10.08 20.99V20.9A1.65 1.65 0 0 0 9 19.39A1.65 1.65 0 0 0 7.18 19.72L7.12 19.78A2 2 0 1 1 4.29 16.95L4.35 16.89A1.65 1.65 0 0 0 4.68 15.07A1.65 1.65 0 0 0 3.16 14.07H3.01A2 2 0 1 1 3.01 10.07H3.1A1.65 1.65 0 0 0 4.61 9A1.65 1.65 0 0 0 4.28 7.18L4.22 7.12A2 2 0 1 1 7.05 4.29L7.11 4.35A1.65 1.65 0 0 0 8.93 4.68A1.65 1.65 0 0 0 9.93 3.16V3.01A2 2 0 1 1 13.93 3.01V3.1A1.65 1.65 0 0 0 15 4.61A1.65 1.65 0 0 0 16.82 4.28L16.88 4.22A2 2 0 1 1 19.71 7.05L19.65 7.11A1.65 1.65 0 0 0 19.32 8.93A1.65 1.65 0 0 0 20.84 9.93H20.99A2 2 0 1 1 20.99 13.93H20.9A1.65 1.65 0 0 0 19.39 15Z" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'revenue') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <path d="M12 4V20M16 7.5C16 6.1 14.2 5 12 5C9.8 5 8 6.1 8 7.5C8 8.9 9.8 10 12 10C14.2 10 16 11.1 16 12.5C16 13.9 14.2 15 12 15C9.8 15 8 13.9 8 12.5M8.5 17C9.3 17.8 10.5 18.2 12 18.2C14.2 18.2 16 17.1 16 15.7" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'point') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <circle cx="12"
                        cy="12"
                        r="8.5" />
                <path d="M12 8.5V15.5M9.5 10.5H14.5M9.5 13.5H14" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'store') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <path d="M5 10.5H19V19.5H5V10.5ZM6.5 10.5V7.5C6.5 5.6 8.1 4 10 4H14C15.9 4 17.5 5.6 17.5 7.5V10.5M9 14H15" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'service') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <path d="M7 5.5H17M7 10.5H17M7 15.5H13M5 5.5H5.01M5 10.5H5.01M5 15.5H5.01" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'designer') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <circle cx="7"
                        cy="8"
                        r="2" />
                <circle cx="7"
                        cy="16"
                        r="2" />
                <path d="M8.7 9.2L12 12L17.5 7.2M8.7 14.8L12 12L17.5 16.8" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'customers') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <path d="M8 7H19M8 12H19M8 17H19" />
                <circle cx="5"
                        cy="7"
                        r="1"
                        fill="currentColor"
                        stroke="none" />
                <circle cx="5"
                        cy="12"
                        r="1"
                        fill="currentColor"
                        stroke="none" />
                <circle cx="5"
                        cy="17"
                        r="1"
                        fill="currentColor"
                        stroke="none" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'member') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <circle cx="9"
                        cy="7"
                        r="3" />
                <path d="M3 21V18C3 16.3 4.3 15 6 15H12C13.7 15 15 16.3 15 18V21" />
                <path d="M16 3.1C17.3 3.6 18.2 4.8 18.2 6.3C18.2 7.8 17.3 9 16 9.5M21 21V18C21 16.4 20.1 15 18.5 14.5" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'inquiry') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <rect x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="3" />
                <path d="M3 7L12 13L21 7" />
            </StyledMenuIcon>
        );
    }

    if (icon === 'history') {
        return (
            <StyledMenuIcon viewBox="0 0 24 24"
                            aria-hidden="true">
                <circle cx="12"
                        cy="12"
                        r="9" />
                <path d="M12 7V12L15 15" />
            </StyledMenuIcon>
        );
    }

    return (
        <StyledMenuIcon viewBox="0 0 24 24"
                        aria-hidden="true">
            <path d="M12 4.5L18.5 7.5V12C18.5 15.8 15.8 19 12 19.8C8.2 19 5.5 15.8 5.5 12V7.5L12 4.5Z" />
            <path d="M9.5 12H14.5M12 9.5V14.5" />
        </StyledMenuIcon>
    );
};

const StyledAside = styled.aside<{ $isVisible: boolean }>`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    width: ${props => props.$isVisible ? 'auto' : '0'};
    min-height: 0;
    overflow: hidden;
    background-color: var(--aside-bg);
    transition: width 0.25s ease;
    box-sizing: border-box;

    @media (max-width: 640px) {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        z-index: 200;
        width: ${props => props.$isVisible ? 'auto' : '0'};
        box-shadow: ${props => props.$isVisible ? 'var(--shadow-md)' : 'none'};
        padding-left: 8px;
    }
`;

const StyledBrandLink = styled(Link)`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 0 10px;
    min-width: var(--aside-width);
    box-sizing: border-box;
    font-size: 16px;
    font-weight: 700;
    color: var(--aside-text);
    letter-spacing: 1px;
    white-space: nowrap;
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

const StyledUserInfoLink = styled(Link)`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 10px 10px;
    min-width: var(--aside-width);
    box-sizing: border-box;
    border-bottom: 1px solid var(--aside-divider);
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 0.85;
        }
    }
`;

const StyledUserName = styled.span`
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--aside-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StyledUserEmail = styled.span`
    font-size: 11px;
    color: var(--aside-text);
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StyledScrollArea = styled.div`
    display: flex;
    flex-direction: column;
    min-width: var(--aside-width);
    height: 100%;
    overflow-y: auto;
`;

const StyledNav = styled.nav`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px 0 0;
    box-sizing: border-box;
`;

const StyledDivider = styled.hr`
    border: none;
    border-top: 1px solid var(--aside-divider);
    margin: 8px 0;
`;

const StyledNavLink = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    height: 36px;
    padding: 0 8px;
    box-sizing: border-box;
    background-color: ${(props) => props.$active ? 'var(--brand-color)' : 'transparent'};
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    text-decoration: none;
    color: ${(props) => props.$active ? 'var(--white-color)' : 'var(--aside-text)'};
    white-space: nowrap;
    opacity: ${(props) => props.$active ? 1 : 0.8};
    transition: background-color 0.1s, color 0.1s, opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

const StyledMenuContent = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

const StyledCreateButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 36px;
    padding: 0 8px;
    box-sizing: border-box;
    background-color: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    text-decoration: none;
    color: var(--white-color);
    white-space: nowrap;
    transition: opacity 0.1s, filter 0.1s;

    span {
        color: var(--white-color);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            filter: brightness(1.18);
        }
    }
`;

const StyledAccordionToggle = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 36px;
    padding: 0 8px;
    box-sizing: border-box;
    background-color: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    color: var(--aside-text);
    white-space: nowrap;
    transition: opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            filter: brightness(1.18);
        }
    }
`;

const StyledMenuIcon = styled.svg`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

const StyledAccordionContent = styled.div<{ $open: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
    max-height: ${props => props.$open ? '320px' : '0'};
    transition: max-height 0.2s ease;
`;

const StyledSubNavLink = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    height: 32px;
    padding: 0 8px 0 20px;
    box-sizing: border-box;
    background-color: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    text-decoration: none;
    color: ${(props) => props.$active ? 'var(--brand-color)' : 'var(--aside-text)'};
    white-space: nowrap;
    opacity: ${(props) => props.$active ? 1 : 0.8};
    background-color: ${(props) => props.$active ? 'var(--brand-color)' : 'transparent'};
    transition: background-color 0.1s, color 0.1s, opacity 0.1s, filter 0.1s;

    ${StyledMenuContent} {
        color: ${(props) => props.$active ? 'var(--white-color)' : 'inherit'};
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;


const StyledLogoutButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0 10px;
    min-height: 36px;
    flex-shrink: 0;
    border: none;
    text-align: left;
    border-radius: var(--radius-md);
    background-color: transparent;
    box-sizing: border-box;
    font-size: var(--small-font);
    font-weight: 500;
    color: var(--aside-text);
    text-decoration: none;
    white-space: nowrap;
    opacity: 0.7;
    transition: background-color 0.1s, opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

const StyledInquiryLink = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0 10px;
    min-height: 36px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    box-sizing: border-box;
    font-size: var(--small-font);
    font-weight: 500;
    color: ${(p) => p.$active ? 'var(--white-color)' : 'var(--aside-text)'};
    background-color: ${(p) => p.$active ? 'var(--brand-color)' : 'transparent'};
    text-decoration: none;
    white-space: nowrap;
    opacity: ${(p) => p.$active ? 1 : 0.7};
    transition: background-color 0.1s, opacity 0.1s, filter 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            opacity: 1;
            filter: brightness(1.18);
        }
    }
`;

const StyledAsideAd = styled.div`
    margin-top: auto;
    padding: 8px 8px 8px 0;
    flex-shrink: 0;

    @media (max-width: 640px) {
        display: none;
    }
`;

const StyledGuestLogoutOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
`;

const StyledGuestLogoutDialog = styled.div`
    background: var(--white-color);
    border-radius: var(--radius-lg);
    padding: 24px 20px 20px;
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-md);
`;

const StyledGuestLogoutMsg = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--dark-gray-color);
    word-break: keep-all;
`;

const StyledGuestLogoutActions = styled.div`
    display: flex;
    gap: 8px;

    button { flex: 1; }
`;

const StyledGuestLogoutCancel = styled.button`
    padding: 9px 0;
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-md);
    background: var(--white-color);
    font-size: 13px;
    font-weight: 600;
    color: var(--dark-gray-color);
    cursor: pointer;
`;

const StyledGuestLogoutConfirm = styled.button`
    padding: 9px 0;
    border: none;
    border-radius: var(--radius-md);
    background: var(--danger-color);
    font-size: 13px;
    font-weight: 600;
    color: var(--white-color);
    cursor: pointer;
`;

const StyledGuestLogoutLink = styled(Link)`
    font-size: 12px;
    color: var(--blue-color);
    text-align: center;
    text-decoration: underline;
`;

const StyledToggleIcon = styled.span<{ $collapsed: boolean }>`
    display: inline-flex;
    width: 16px;
    height: 16px;
    transform: ${props => props.$collapsed ? 'rotate(90deg)' : 'rotate(270deg)'};
    transition: transform 0.2s;
    flex-shrink: 0;

    svg {
        width: 100%;
        height: 100%;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
`;
