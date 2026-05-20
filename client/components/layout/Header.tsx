import {useCallback} from 'react';

import styled from 'styled-components';

import {useRouter} from 'next/router';

import {useCalendarStore} from '../../store/calendarStore';
import {useNaverBookingSync} from '../../hooks/useNaverBookingSync';
import {splitDesignersByStatus} from '../../utils/designers';
import {isCalendar} from '../../utils/router';
import type {Reservation} from '../../utils/reservations';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {NaverSyncNotification} from './NaverSyncNotification';
import {NaverSyncConflictModal} from './NaverSyncConflictModal';
import {formControlStyle} from '../ui/FormControls';

const PAGE_TITLES: Record<string, string> = {
    '/address': '고객명단',
    '/mypage': '마이페이지',
    '/logout': '로그아웃',
};

const SETTINGS_TAB_TITLES: Record<string, string> = {
    revenue: '매출',
    point: '적립금관리',
    store: '매장관리',
    service: '서비스관리',
    designer: '디자이너관리',
    member: '멤버관리',
};

export const Header = () => {
    const router = useRouter();
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const currValue = useCalendarStore((s) => s.target);
    const designers = useCalendarStore((s) => s.designers);
    const calendarDesignerId = useCalendarStore((s) => s.calendarDesignerId);
    const setCalendarDesignerId = useCalendarStore((s) => s.setCalendarDesignerId);
    const pathSegments = router.asPath.split('?')[0].split('/');
    const isRootPath = pathSegments.join('').length === 0;
    const isCalendarPage = isRootPath || isCalendar(pathSegments);
    const settingsTab = typeof router.query.tab === 'string' ? router.query.tab : 'revenue';
    const isSettingsPage = router.pathname === '/settings' || router.pathname === '/settings/[tab]';
    const pageTitle = isSettingsPage
        ? `${SETTINGS_TAB_TITLES[settingsTab] ?? SETTINGS_TAB_TITLES.revenue}`
        : PAGE_TITLES[router.pathname] ?? 'TAS';
    const {
        active: activeDesigners,
        onLeave: onLeaveDesigners,
        resigned: resignedDesigners
    } = splitDesignersByStatus(designers);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const openReservationDetail = useCalendarStore((s) => s.openReservationDetail);
    const {visibleNotifications, unreadCount, markRead, markAllRead, currentConflict, currentConflictStatus, advanceConflict, deferConflict, dismissConflicts, openConflictByKey, sync, syncing, isActive} = useNaverBookingSync();

    const handleConflictReservationClick = useCallback((reservation: Reservation) => {
        const dateReservations = reservationMap[reservation.date] ?? [];
        if (!dateReservations.some((r) => r.id === reservation.id)) {
            setReservationMap({
                ...reservationMap,
                [reservation.date]: [...dateReservations, reservation],
            });
        }
        openReservationDetail(reservation);
    }, [reservationMap, setReservationMap, openReservationDetail]);

    return (
        <StyledHeader>
            <StyledAsideToggle type="button"
                              $open={aside.isVisible}
                              onClick={() => setAside({isVisible: !aside.isVisible})}
                              aria-label={aside.isVisible ? '사이드바 접기' : '사이드바 펼치기'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    {aside.isVisible
                        ? <polyline points="15,10 13,12 15,14" />
                        : <polyline points="13,10 15,12 13,14" />
                    }
                </svg>
            </StyledAsideToggle>
            {isCalendarPage && currValue.full !== null && <>
                <CalendarDirection />
                <CalendarHeading />
                <StyledDesignerFilter value={calendarDesignerId ?? ''}
                                      onChange={(e) => setCalendarDesignerId(e.target.value ? Number(e.target.value) : null)}
                                      aria-label="달력 디자이너 필터">
                    <option value="">전체보기</option>
                    <option value="0" data-bg-color="#8E8E93">미지정</option>
                    {activeDesigners.map((designer) => (
                        <option key={designer.id}
                                value={designer.id}
                                data-bg-color={designer.color}>
                            {designer.name}
                        </option>
                    ))}
                    {onLeaveDesigners.length > 0 && (
                        <optgroup label="휴직자">
                            {onLeaveDesigners.map((designer) => (
                                <option key={designer.id}
                                        value={designer.id}
                                        data-bg-color={designer.color}>{designer.name}</option>
                            ))}
                        </optgroup>
                    )}
                    {resignedDesigners.length > 0 && (
                        <optgroup label="퇴직자">
                            {resignedDesigners.map((designer) => (
                                <option key={designer.id}
                                        value={designer.id}
                                        data-bg-color={designer.color}>{designer.name}</option>
                            ))}
                        </optgroup>
                    )}
                </StyledDesignerFilter>
                {isActive && (
                    <StyledSyncButton type="button" onClick={sync} disabled={syncing} aria-label="네이버 예약 동기화">
                        <StyledSyncIcon $syncing={syncing} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                        </StyledSyncIcon>
                    </StyledSyncButton>
                )}
                <NaverSyncNotification notifications={visibleNotifications}
                                       unreadCount={unreadCount}
                                       markRead={markRead}
                                       markAllRead={markAllRead}
                                       reservationMap={reservationMap}
                                       onSelectReservation={openReservationDetail}
                                       onSelectConflict={openConflictByKey} />
            </>}
            {!isCalendarPage && <>
                <StyledPageTitle>{pageTitle}</StyledPageTitle>
                {isActive && (
                    <StyledSyncButton type="button" onClick={sync} disabled={syncing} aria-label="네이버 예약 동기화">
                        <StyledSyncIcon $syncing={syncing} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                        </StyledSyncIcon>
                    </StyledSyncButton>
                )}
                <NaverSyncNotification notifications={visibleNotifications}
                                       unreadCount={unreadCount}
                                       markRead={markRead}
                                       markAllRead={markAllRead}
                                       reservationMap={reservationMap}
                                       onSelectReservation={openReservationDetail}
                                       onSelectConflict={openConflictByKey} />
            </>}
            {currentConflict && (
                <NaverSyncConflictModal conflict={currentConflict}
                                        isConfirmed={currentConflictStatus === 'confirmed'}
                                        onAdvance={advanceConflict}
                                        onDefer={deferConflict}
                                        onDismiss={dismissConflicts}
                                        onSelectReservation={handleConflictReservationClick} />
            )}
        </StyledHeader>
    );
};

const StyledHeader = styled.header`
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 0 12px 0 0;
    height: 48px;
    box-sizing: border-box;
    background-color: var(--white-color);
    border-bottom: solid 1px var(--light-gray-color);
    flex-shrink: 0;
    @media (max-width: 640px) {
        justify-content: space-between;
        gap: 4px;
        padding: 0 4px;
    }
`;

const StyledAsideToggle = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;
    cursor: pointer;
    
    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--gray-color2);
        }
    }

    @media (max-width: 640px) {
        position: fixed;
        bottom: 20px;
        left: ${(props) => props.$open ? 'calc(8px + var(--aside-width) + 8px)' : '16px'};
        z-index: 210;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: var(--aside-bg);
        color: var(--aside-text);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        opacity: .8;
        transition: left 0.25s ease, background-color 0.1s;

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background-color: var(--aside-hover);
            }
        }
    }
`;

const StyledPageTitle = styled.h1`
    flex: 1;
    margin: 0;
    font-size: var(--big-font);
    font-weight: 700;
    text-align: center;
    color: var(--dark-gray-color);
`;

const StyledDesignerFilter = styled.select`
    min-width: 128px;
    margin-left: auto;
    padding: 0 10px;
    ${formControlStyle};
    cursor: pointer;
    @media (max-width: 640px) {
        padding: 0 4px;
    }

    option {
        gap: 2px;

        &::checkmark {
            display: none;
        }
        &[value]:not([value=""]) {
            padding-left: 14px;
        }
        &[data-bg-color]::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 2px;
            border-radius: 50%;
            vertical-align: middle;
            background-color: attr(data-bg-color type(<color>), transparent);
        }
    }

    &,
    &::picker(select) {
        appearance: base-select;
        align-items: center;
        border: 1px solid #e0e0e0;
        border-radius: var(--radius-md);
        margin-top: 4px;
    }

    @media (max-width: 640px) {
        min-width: 96px;
    }
`;

const StyledSyncButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background-color: transparent;
    border: none;
    color: var(--dark-gray-color);
    flex-shrink: 0;
    cursor: pointer;

    &:disabled {
        cursor: default;
        opacity: 0.5;
    }

    @media (hover: hover) and (pointer: fine) {
        &:not(:disabled):hover {
            background-color: var(--gray-color2);
        }
    }
`;

const StyledSyncIcon = styled.svg<{ $syncing: boolean }>`
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    ${(props) => props.$syncing && 'animation: spin 1s linear infinite;'}
`;
