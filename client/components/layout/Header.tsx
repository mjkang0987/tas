import {useCallback, useEffect, useRef, useState} from 'react';

import {createPortal} from 'react-dom';

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
import {scrollHintStyle, scrollContentStyle} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';

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
    const [isSearchOpen, setIsSearchOpen] = useState(false);
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
                <StyledCalendarRow>
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
                </StyledCalendarRow>
                <StyledToolRow>
                    {isActive && (
                        <StyledSyncWrap>
                            <StyledSyncButton type="button" onClick={sync} disabled={syncing} aria-label="네이버 예약 동기화">
                                <StyledSyncIcon $syncing={syncing} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                                </StyledSyncIcon>
                            </StyledSyncButton>
                            {syncing && <StyledSyncToast>동기화 중입니다</StyledSyncToast>}
                        </StyledSyncWrap>
                    )}
                    <NaverSyncNotification notifications={visibleNotifications}
                                           unreadCount={unreadCount}
                                           markRead={markRead}
                                           markAllRead={markAllRead}
                                           reservationMap={reservationMap}
                                           onSelectReservation={openReservationDetail}
                                           onSelectConflict={openConflictByKey} />
                    <StyledCustomerSearchButton type="button" onClick={() => setIsSearchOpen(true)} aria-label="고객검색">
                        <StyledSearchIcon viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="5.5" />
                            <path d="M15.2 15.2L19 19" />
                        </StyledSearchIcon>
                    </StyledCustomerSearchButton>
                </StyledToolRow>
            </>}
            {!isCalendarPage && <>
                <StyledPageTitle>{pageTitle}</StyledPageTitle>
                {isActive && (
                    <StyledSyncWrap>
                        <StyledSyncButton type="button" onClick={sync} disabled={syncing} aria-label="네이버 예약 동기화">
                            <StyledSyncIcon $syncing={syncing} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                            </StyledSyncIcon>
                        </StyledSyncButton>
                        {syncing && <StyledSyncToast>동기화 중입니다</StyledSyncToast>}
                    </StyledSyncWrap>
                )}
                <NaverSyncNotification notifications={visibleNotifications}
                                       unreadCount={unreadCount}
                                       markRead={markRead}
                                       markAllRead={markAllRead}
                                       reservationMap={reservationMap}
                                       onSelectReservation={openReservationDetail}
                                       onSelectConflict={openConflictByKey} />
                <StyledCustomerSearchButton type="button" onClick={() => setIsSearchOpen(true)} aria-label="고객검색">
                    <StyledSearchIcon viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="5.5" />
                        <path d="M15.2 15.2L19 19" />
                    </StyledSearchIcon>
                </StyledCustomerSearchButton>
            </>}
            {currentConflict && (
                <NaverSyncConflictModal conflict={currentConflict}
                                        isConfirmed={currentConflictStatus === 'confirmed'}
                                        onAdvance={advanceConflict}
                                        onDefer={deferConflict}
                                        onDismiss={dismissConflicts}
                                        onSelectReservation={handleConflictReservationClick} />
            )}
            {isSearchOpen && <SearchLayer onClose={() => setIsSearchOpen(false)} />}
        </StyledHeader>
    );
};

const StyledHeader = styled.header`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
    padding: 0 12px 0 0;
    min-height: 48px;
    box-sizing: border-box;
    background-color: var(--white-color);
    border-bottom: solid 1px var(--light-gray-color);
    flex-shrink: 0;
    @media (max-width: 640px) {
        gap: 0;
        padding: 0 4px;
    }
`;

const StyledCalendarRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;

    @media (max-width: 640px) {
        flex-wrap: wrap;
        width: 100%;
        padding: 0 2px;
    }
`;

const StyledToolRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;

    @media (max-width: 640px) {
        width: 100%;
        height: 36px;
        justify-content: flex-end;
        padding: 0 2px;
        border-top: 1px solid var(--light-gray-color);
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
        margin-left: 0;
    }
`;

const StyledSyncWrap = styled.div`
    position: relative;
    flex-shrink: 0;
`;

const StyledSyncToast = styled.span`
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 4px;
    padding: 4px 10px;
    border-radius: var(--radius-md);
    background-color: var(--black-color);
    color: #fff;
    font-size: var(--tiny-font);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
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

const StyledCustomerSearchButton = styled.button`
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
`;

const StyledSearchIcon = styled.svg`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
`;

/* ── Customer Search Layer ── */

const SearchLayer = ({onClose}: { onClose: () => void }) => {
    const customerMap = useCalendarStore((s) => s.customerMap);
    const setSelectedCustomerId = useCalendarStore((s) => s.setSelectedCustomerId);

    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRoot = document.getElementById('modal-root');

    const customers = Object.values(customerMap).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    const filtered = query.trim()
        ? customers.filter((c) => c.name.includes(query) || c.tel.includes(query))
        : customers;

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSelect = (id: number) => {
        setSelectedCustomerId(id);
        onClose();
    };

    if (!modalRoot) return null;

    return createPortal(
        <StyledSearchOverlay onClick={onClose}
                             role="dialog"
                             aria-modal="true"
                             aria-label="고객 검색">
            <StyledSearchModal onClick={(e) => e.stopPropagation()}>
                <StyledSearchHeader>
                    <StyledSearchInput ref={inputRef}
                                       type="search"
                                       autoComplete="off"
                                       placeholder="고객명 또는 연락처 검색"
                                       value={query}
                                       onChange={(e) => setQuery(e.target.value)} />
                    <CloseIconButton onClick={onClose} />
                </StyledSearchHeader>
                <StyledResultListWrap><StyledResultList>
                    {query.trim() && filtered.length === 0 ? (
                        <StyledNoResult>검색 결과 없음</StyledNoResult>
                    ) : (
                        filtered.map((c) => (
                            <StyledResultItem key={c.id} onClick={() => handleSelect(c.id)}>
                                <span>{c.name}</span>
                                <span>{c.tel}</span>
                            </StyledResultItem>
                        ))
                    )}
                </StyledResultList></StyledResultListWrap>
            </StyledSearchModal>
        </StyledSearchOverlay>,
        modalRoot
    );
};

const StyledSearchOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background-color: rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
`;

const StyledSearchModal = styled.div`
    width: 100%;
    max-width: 400px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
`;

const StyledSearchHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 12px 16px;
    border-bottom: 1px solid var(--light-gray-color);
`;

const StyledSearchInput = styled.input`
    flex: 1;
    ${formControlStyle};
    padding: 0 10px;

    &[type="search"]::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        margin-right: 4px;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23999'/%3E%3Cpath d='M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5' stroke='%23fff' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat center / contain;
        cursor: pointer;
    }
`;

const StyledResultListWrap = styled.div`
    flex: 1;
    ${scrollHintStyle};
`;

const StyledResultList = styled.ul`
    ${scrollContentStyle};
    padding: 4px 0 30px;
    list-style: none;
`;

const StyledResultItem = styled.li`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    font-size: 14px;
    cursor: pointer;

    > span:last-child {
        font-size: 12px;
        color: var(--gray-color);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: var(--black-color-10);
        }
    }
`;

const StyledNoResult = styled.li`
    padding: 24px;
    font-size: 13px;
    color: var(--gray-color);
    text-align: center;
`;
