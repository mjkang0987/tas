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
import {CustomerAddModal} from '../address/CustomerAddModal';
import {StoreSwitcher} from './StoreSwitcher';
import {AsideMenuIcon} from './AsideMenuIcon';
import {AsideGuestLogout} from './AsideGuestLogout';

const SETTINGS_SUBMENU = [
    {tab: 'revenue', href: '/settings/revenue', label: '매출', icon: 'revenue'},
    {tab: 'point', href: '/settings/point', label: '적립금 관리', icon: 'point'},
    {tab: 'store', href: '/settings/store', label: '매장 관리', icon: 'store'},
    {tab: 'service', href: '/settings/service', label: '서비스 관리', icon: 'service'},
    {tab: 'designer', href: '/settings/designer', label: '디자이너 관리', icon: 'designer'},
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

    const setChangeView = ({viewType}: {viewType: string}) => {
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
        if (path !== ViewType.Year) result.push(routeDate.getMonth() + 1);
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

    const settingsToggle = (
        <StyledAccordionToggle type="button" onClick={() => setSettingsOpen(!settingsOpen)}>
            <StyledMenuContent>
                <AsideMenuIcon icon="settings" />
                <span>설정</span>
            </StyledMenuContent>
            <StyledToggleIcon $collapsed={!settingsOpen} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M9 6L15 12L9 18" />
                </svg>
            </StyledToggleIcon>
        </StyledAccordionToggle>
    );

    return (
        <StyledAside $isVisible={aside.isVisible}>
            <StyledBrandLink href="/" onClick={closeMobile}>
                <StyledBrandIcon viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 9.5L12 4L21 9.5" />
                    <path d="M5 9.5V18.5C5 19.05 5.45 19.5 6 19.5H18C18.55 19.5 19 19.05 19 18.5V9.5" />
                </StyledBrandIcon>
                <span>TAS</span>
            </StyledBrandLink>

            {isGuest ? (
                storeName ? <StyledStoreNameLink href="/settings/store" onClick={closeMobile}>{storeName}</StyledStoreNameLink> : null
            ) : (
                <StoreSwitcher fallbackName={storeName} onNavigate={closeMobile} />
            )}

            {session?.user ? (
                <StyledUserInfoLink href="/mypage" onClick={closeMobile}>
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
                    {/* 예약관리 아코디언 */}
                    <StyledAccordionToggle type="button" onClick={() => setReservationOpen(!reservationOpen)}>
                        <StyledMenuContent>
                            <AsideMenuIcon icon="calendarManage" />
                            <span>예약관리</span>
                        </StyledMenuContent>
                        <StyledToggleIcon $collapsed={!reservationOpen} aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 6L15 12L9 18" />
                            </svg>
                        </StyledToggleIcon>
                    </StyledAccordionToggle>
                    <StyledAccordionContent $open={reservationOpen}>
                        {currValue && Object.keys(asides).map((a) =>
                            <StyledSubNavLink
                                href={`/${setAsPath(a.toLowerCase()).join('/')}`}
                                $active={activeReservationType === a.toLowerCase()}
                                key={asides[a].id}
                                onClick={() => { setChangeView({viewType: a}); closeMobile(); }}
                            >
                                <StyledMenuContent>
                                    <AsideMenuIcon icon={asides[a].icon || 'day'} />
                                    <span>{asides[a].title}</span>
                                </StyledMenuContent>
                            </StyledSubNavLink>
                        )}
                    </StyledAccordionContent>

                    <StyledDivider />

                    <StyledCreateButton type="button" onClick={() => { handleCreateReservation(); closeMobile(); }}>
                        <AsideMenuIcon icon="create" />
                        <ButtonText a11y={false}>예약추가</ButtonText>
                    </StyledCreateButton>
                    <StyledCreateButton type="button" onClick={() => { setShowCustomerAdd(true); closeMobile(); }}>
                        <AsideMenuIcon icon="customerAdd" />
                        <ButtonText a11y={false}>고객추가</ButtonText>
                    </StyledCreateButton>

                    <StyledDivider />

                    {/* 스태프: 설정 아코디언 (고객 명단 + 계정 관리) */}
                    {isLoggedInStaff && (<>
                        {settingsToggle}
                        <StyledAccordionContent $open={settingsOpen}>
                            <StyledSubNavLink href="/address" $active={router.pathname === '/address'} onClick={closeMobile}>
                                <StyledMenuContent>
                                    <AsideMenuIcon icon="customers" />
                                    <span>고객 명단</span>
                                </StyledMenuContent>
                            </StyledSubNavLink>
                            <StyledSubNavLink href="/mypage" $active={router.pathname === '/mypage'} onClick={closeMobile}>
                                <StyledMenuContent>
                                    <AsideMenuIcon icon="account" />
                                    <span>계정 관리</span>
                                </StyledMenuContent>
                            </StyledSubNavLink>
                        </StyledAccordionContent>
                    </>)}

                    {/* 오너/게스트: 전체 설정 아코디언 */}
                    {(isOwner || isGuest) && (<>
                        {settingsToggle}
                        <StyledAccordionContent $open={settingsOpen}>
                            {SETTINGS_SUBMENU.filter((item) => !isGuest || item.tab !== 'member').map((item) =>
                                <StyledSubNavLink
                                    href={item.href}
                                    $active={
                                        item.tab === 'my' ? router.pathname === '/mypage'
                                        : item.tab === 'customers' ? router.pathname === '/address'
                                        : isSettingsPage && activeSettingsTab === item.tab
                                    }
                                    key={item.tab}
                                    onClick={closeMobile}
                                >
                                    <StyledMenuContent>
                                        <AsideMenuIcon icon={item.icon} />
                                        <span>{item.label}</span>
                                    </StyledMenuContent>
                                </StyledSubNavLink>
                            )}
                        </StyledAccordionContent>
                    </>)}
                </StyledNav>

                <StyledDivider />

                <StyledInquiryLink href="/inquiry" $active={router.pathname === '/inquiry'} onClick={closeMobile}>
                    <AsideMenuIcon icon="inquiry" />
                    <span>고객센터</span>
                </StyledInquiryLink>
                <StyledLogoutButton type="button" onClick={() => isGuest ? setShowGuestLogout(true) : signOut({callbackUrl: '/login'})}>
                    <AuthActionIcon direction="logout" />
                    <span>로그아웃</span>
                </StyledLogoutButton>

                {showCustomerAdd && <CustomerAddModal onClose={() => setShowCustomerAdd(false)} />}
                {showGuestLogout && (
                    <AsideGuestLogout
                        onClose={() => setShowGuestLogout(false)}
                        onConfirm={() => {
                            localStorage.removeItem('takeaseat.local-db.v1');
                            router.push('/login');
                        }}
                    />
                )}

                <StyledAsideAd>
                    <AdBanner adSlot="ASIDE_SLOT_ID" adFormat="vertical" />
                </StyledAsideAd>
            </StyledScrollArea>
        </StyledAside>
    );
};

/* ── Styles ── */

const StyledAside = styled.aside<{$isVisible: boolean}>`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    width: ${(p) => p.$isVisible ? 'auto' : '0'};
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
        width: ${(p) => p.$isVisible ? 'auto' : '0'};
        box-shadow: ${(p) => p.$isVisible ? 'var(--shadow-md)' : 'none'};
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
        &:hover { opacity: 0.85; }
    }
`;

const StyledBrandIcon = styled.svg`
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

const StyledGuestInfo = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 0 10px 10px;
    width: var(--aside-width);
    box-sizing: border-box;
`;

const StyledStoreNameLink = styled(Link)`
    flex-shrink: 0;
    padding: 0 10px 6px;
    width: var(--aside-width);
    box-sizing: border-box;
    font-size: 11px;
    font-weight: 500;
    color: var(--aside-text);
    opacity: 0.6;
    word-break: break-all;
    line-height: 1.4;
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover { opacity: 0.85; }
    }
`;

const StyledUserInfoLink = styled(Link)`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 10px 10px;
    width: var(--aside-width);
    box-sizing: border-box;
    border-bottom: 1px solid var(--aside-divider);
    text-decoration: none;
    transition: opacity 0.1s;

    @media (hover: hover) and (pointer: fine) {
        &:hover { opacity: 0.85; }
    }
`;

const StyledUserName = styled.span`
    font-size: var(--small-font);
    font-weight: 600;
    color: var(--aside-text);
    word-break: break-all;
    line-height: 1.4;
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

    span { color: var(--white-color); }

    @media (hover: hover) and (pointer: fine) {
        &:hover { filter: brightness(1.18); }
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
        &:hover { filter: brightness(1.18); }
    }
`;

const StyledAccordionContent = styled.div<{$open: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
    max-height: ${(p) => p.$open ? '320px' : '0'};
    transition: max-height 0.2s ease;
`;

const StyledSubNavLink = styled(Link)<{$active?: boolean}>`
    display: flex;
    align-items: center;
    width: 100%;
    height: 32px;
    padding: 0 8px 0 20px;
    box-sizing: border-box;
    background-color: ${(p) => p.$active ? 'var(--brand-color)' : 'transparent'};
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--small-font);
    font-weight: 500;
    text-decoration: none;
    color: ${(p) => p.$active ? 'var(--brand-color)' : 'var(--aside-text)'};
    white-space: nowrap;
    opacity: ${(p) => p.$active ? 1 : 0.8};
    transition: background-color 0.1s, color 0.1s, opacity 0.1s, filter 0.1s;

    ${StyledMenuContent} {
        color: ${(p) => p.$active ? 'var(--white-color)' : 'inherit'};
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover { opacity: 1; filter: brightness(1.18); }
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
        &:hover { opacity: 1; filter: brightness(1.18); }
    }
`;

const StyledInquiryLink = styled(Link)<{$active?: boolean}>`
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
        &:hover { opacity: 1; filter: brightness(1.18); }
    }
`;

const StyledAsideAd = styled.div`
    margin-top: auto;
    padding: 8px 8px 8px 0;
    flex-shrink: 0;

    @media (max-width: 640px) { display: none; }
`;

const StyledToggleIcon = styled.span<{$collapsed: boolean}>`
    display: inline-flex;
    width: 16px;
    height: 16px;
    transform: ${(p) => p.$collapsed ? 'rotate(90deg)' : 'rotate(270deg)'};
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
