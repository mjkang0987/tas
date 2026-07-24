import React, {useState} from 'react';

import type {NextPage} from 'next';
import Link from 'next/link';

import {signOut, useSession} from 'next-auth/react';

import styled from 'styled-components';

import {useCalendarStore} from '../store/calendarStore';
import {useStoreLabels} from '../hooks/useStoreLabels';
import {SeoHead} from '../components/ui/SeoHead';
import {AsideMenuIcon} from '../components/layout/AsideMenuIcon';
import {AuthActionIcon} from '../components/ui/AuthActionIcon';
import {AsideGuestLogout} from '../components/layout/AsideGuestLogout';
import {SETTINGS_SUBMENU, isSettingsMenuVisible, type SettingsMenuItem} from '../components/layout/settingsMenu';
import {clearGuestConsentAck, clearGuestEntryResolved, clearGuestTermsAgreed} from '../lib/local-db';

// 하단 탭바에 이미 있는 항목(매출·고객 명단)은 설정 리스트에서 제외해 중복을 없앤다.
const HIDDEN_IN_MENU = new Set(['revenue', 'customers']);

const Menu: NextPage = () => {
    const {data: session} = useSession();
    const [showGuestLogout, setShowGuestLogout] = useState(false);
    const storeName = useCalendarStore((s) => s.storeName);
    const usePointSystem = useCalendarStore((s) => s.usePointSystem);
    const useMembershipSystem = useCalendarStore((s) => s.useMembershipSystem);
    const useCouponSystem = useCalendarStore((s) => s.useCouponSystem);
    const useOnlineBooking = useCalendarStore((s) => s.useOnlineBooking);
    const labels = useStoreLabels();

    const isGuest = !session;
    const isOwner = session?.user?.role === 'owner';
    const isLoggedInStaff = !!session?.user && !isOwner;

    const gate = {
        isOwner,
        isLoggedInStaff,
        usePointSystem,
        useMembershipSystem,
        useCouponSystem,
        useOnlineBooking,
    };

    const items = SETTINGS_SUBMENU.filter(
        (item) => !HIDDEN_IN_MENU.has(item.tab) && isSettingsMenuVisible(item, gate)
    );

    const submenuLabel = (item: SettingsMenuItem) =>
        item.tab === 'assignee' ? `${labels.assignee} 관리`
            : item.tab === 'service' ? `${labels.service} 관리`
                : item.label;

    const startTour = () => {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('tas:start-tour'));
    };

    return (
        <StyledPage>
            <SeoHead title="설정" />

            <StyledHeaderCard>
                {storeName && <StyledStoreName>{storeName}</StyledStoreName>}
                <StyledUserName>{isGuest ? '게스트' : (session?.user?.name ?? '-')}</StyledUserName>
                {!isGuest && session?.user?.email && (
                    <StyledUserEmail>{session.user.email}</StyledUserEmail>
                )}
            </StyledHeaderCard>

            <StyledGroup>
                {items.map((item) => (
                    <StyledRow key={item.tab} href={item.href}>
                        <StyledRowIcon>
                            <AsideMenuIcon icon={item.icon} />
                        </StyledRowIcon>
                        <StyledRowLabel>{submenuLabel(item)}</StyledRowLabel>
                        <StyledChevron viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 6l6 6-6 6" />
                        </StyledChevron>
                    </StyledRow>
                ))}
            </StyledGroup>

            <StyledGroup>
                <StyledRow href="/inquiry">
                    <StyledRowIcon><AsideMenuIcon icon="inquiry" /></StyledRowIcon>
                    <StyledRowLabel>고객센터</StyledRowLabel>
                    <StyledChevron viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></StyledChevron>
                </StyledRow>
                <StyledButtonRow type="button" onClick={startTour}>
                    <StyledRowIcon><AsideMenuIcon icon="guide" /></StyledRowIcon>
                    <StyledRowLabel>사용 안내</StyledRowLabel>
                    <StyledChevron viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></StyledChevron>
                </StyledButtonRow>
                <StyledButtonRow type="button"
                                 onClick={() => isGuest ? setShowGuestLogout(true) : signOut({callbackUrl: '/login'})}>
                    <StyledRowIcon><AuthActionIcon direction="logout" /></StyledRowIcon>
                    <StyledRowLabel>로그아웃</StyledRowLabel>
                </StyledButtonRow>
            </StyledGroup>

            <StyledLegalLinks>
                <StyledLegalLink href="/terms">이용약관</StyledLegalLink>
                <StyledLegalLink href="/privacy">개인정보처리방침</StyledLegalLink>
                {!isGuest && <StyledLegalLink href="/dpa">개인정보 처리위탁</StyledLegalLink>}
            </StyledLegalLinks>

            {showGuestLogout && (
                <AsideGuestLogout onClose={() => setShowGuestLogout(false)}
                                  onConfirm={() => {
                                      localStorage.removeItem('takeaseat.local-db.v1');
                                      clearGuestTermsAgreed();
                                      clearGuestEntryResolved();
                                      clearGuestConsentAck();
                                      window.location.href = '/login';
                                  }} />
            )}
        </StyledPage>
    );
};

export default Menu;

/* ── Styles ── */

const StyledPage = styled.div`
    flex: 1;
    align-self: flex-start;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding: 12px 12px 24px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const StyledHeaderCard = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 14px 16px;
    background-color: var(--white-color);
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-lg);
`;

const StyledStoreName = styled.span`
    font-size: var(--xsmall-font);
    font-weight: 600;
    color: var(--dark-gray-color2);
    word-break: break-all;
`;

const StyledUserName = styled.span`
    font-size: var(--big-font);
    font-weight: 700;
    color: var(--black-color);
`;

const StyledUserEmail = styled.span`
    font-size: var(--small-font);
    color: var(--dark-gray-color2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StyledGroup = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background-color: var(--white-color);
    border: 1px solid var(--light-gray-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
`;

const rowBase = `
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 0 14px;
    box-sizing: border-box;
    background-color: var(--white-color);
    border: none;
    border-top: 1px solid var(--light-gray-color);
    text-align: left;
    text-decoration: none;

    &:first-child {
        border-top: none;
    }

    &:active {
        background-color: var(--gray-color2);
    }
`;

const StyledRow = styled(Link)`
    ${rowBase}
`;

const StyledButtonRow = styled.button`
    ${rowBase}
`;

const StyledRowIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    background-color: var(--brand-color-bg);
    color: var(--brand-color);

    svg {
        width: 18px;
        height: 18px;
    }
`;

const StyledRowLabel = styled.span`
    flex: 1;
    min-width: 0;
    font-size: var(--font);
    font-weight: 600;
    color: var(--black-color);
`;

const StyledChevron = styled.svg`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke: var(--dark-gray-color2);
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

const StyledLegalLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    padding: 4px 6px 0;
`;

const StyledLegalLink = styled(Link)`
    font-size: var(--xsmall-font);
    color: var(--dark-gray-color2);
    text-decoration: none;

    &:active {
        text-decoration: underline;
    }
`;
