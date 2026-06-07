import {useCallback, useEffect, useRef, useState} from 'react';

import {createPortal} from 'react-dom';

import styled from 'styled-components';

import {useRouter} from 'next/router';
import {signIn} from 'next-auth/react';

import {useCalendarStore} from '../../store/calendarStore';
import {useNaverBookingSync} from '../../hooks/useNaverBookingSync';
import {useCustomerMergeSuggestion} from '../../hooks/useCustomerMergeSuggestion';
import {splitDesignersByStatus} from '../../utils/designers';
import {isCalendar} from '../../utils/router';
import type {Reservation} from '../../utils/reservations';
import {formatTel} from '../../utils/customers';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {ReservationDetail} from '../calendar/overlays/ReservationDetail';
import {NaverSyncNotification} from './NaverSyncNotification';
import {NaverSyncConflictModal} from './NaverSyncConflictModal';
import {CustomerMergeSuggestionModal} from './CustomerMergeSuggestionModal';
import {formControlStyle} from '../ui/FormControls';
import {scrollHintStyle, scrollContentStyle} from '../calendar/overlays/ModalStyles';
import {CloseIconButton} from '../ui/CloseIconButton';

const PAGE_TITLES: Record<string, string> = {
    '/address': '고객 명단',
    '/mypage': '계정 정보',
    '/logout': '로그아웃',
};

const SETTINGS_TAB_TITLES: Record<string, string> = {
    revenue: '매출',
    point: '적립금 관리',
    store: '매장 관리',
    service: '서비스 관리',
    designer: '디자이너 관리',
    member: '멤버 관리',
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
    const {
        visibleNotifications,
        unreadCount,
        markRead,
        markAllRead,
        currentConflict,
        currentConflictStatus,
        advanceConflict,
        deferConflict,
        dismissConflicts,
        openConflictByKey,
        sync,
        syncing,
        isActive,
        gmailTokenExpired,
        dismissGmailTokenExpired,
    } = useNaverBookingSync();

    const {
        currentSuggestion,
        merging: mergeSuggestionMerging,
        merge: mergeSuggestion,
        skip: skipSuggestion,
        dismiss: dismissSuggestions,
        reservationMap: suggestionReservationMap,
    } = useCustomerMergeSuggestion();

    const customerMap = useCalendarStore((s) => s.customerMap);
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);
    const [headerReservations, setHeaderReservations] = useState<Reservation[]>([]);

    const handleHeaderReservationClick = useCallback((reservation: Reservation) => {
        setHeaderReservations((prev) => [...prev, reservation]);
    }, []);

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

    const unresolvedConflicts = visibleNotifications.filter(
        (n) => n.type === 'conflict' && n.conflictStatus !== 'confirmed',
    );
    const conflictCount = unresolvedConflicts.length;
    const firstConflictKey = unresolvedConflicts[0]?.conflictKey;

    return (
        <>
        <StyledHeader>
            <StyledAsideToggle type="button"
                               $open={aside.isVisible}
                               onClick={() => setAside({isVisible: !aside.isVisible})}
                               aria-label={aside.isVisible ? '사이드바 접기' : '사이드바 펼치기'}>
                <StyledAsideToggleLabel className="menu-label">{aside.isVisible ? '닫기' : '메뉴'}</StyledAsideToggleLabel>
                <svg width="18"
                     height="18"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round">
                    <rect x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2" />
                    <line x1="9"
                          y1="3"
                          x2="9"
                          y2="21" />
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
                </StyledCalendarRow>
                <StyledToolRow>
                    <StyledDesignerFilter value={calendarDesignerId ?? ''}
                                          onChange={(e) => setCalendarDesignerId(e.target.value ? Number(e.target.value) : null)}
                                          aria-label="달력 디자이너 필터">
                        <option value="">전체보기</option>
                        <option value="0"
                                data-bg-color="#8E8E93">미지정
                        </option>
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
                        <StyledSyncWrap>
                            <StyledSyncButton type="button"
                                              onClick={sync}
                                              disabled={syncing}
                                              aria-label="네이버 예약 동기화">
                                <StyledSyncIcon $syncing={syncing}
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round">
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
                    <StyledCustomerSearchButton type="button"
                                                onClick={() => setIsSearchOpen(true)}
                                                aria-label="고객검색">
                        <StyledSearchIcon viewBox="0 0 24 24"
                                          aria-hidden="true">
                            <circle cx="11"
                                    cy="11"
                                    r="5.5" />
                            <path d="M15.2 15.2L19 19" />
                        </StyledSearchIcon>
                    </StyledCustomerSearchButton>
                </StyledToolRow>
            </>}
            {!isCalendarPage && <>
                <StyledPageTitle>{pageTitle}</StyledPageTitle>
                {isActive && (
                    <StyledSyncWrap>
                        <StyledSyncButton type="button"
                                          onClick={sync}
                                          disabled={syncing}
                                          aria-label="네이버 예약 동기화">
                            <StyledSyncIcon $syncing={syncing}
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round">
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
                <StyledCustomerSearchButton type="button"
                                            onClick={() => setIsSearchOpen(true)}
                                            aria-label="고객검색">
                    <StyledSearchIcon viewBox="0 0 24 24"
                                      aria-hidden="true">
                        <circle cx="11"
                                cy="11"
                                r="5.5" />
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
            {!currentConflict && currentSuggestion && (
                <CustomerMergeSuggestionModal suggestion={currentSuggestion}
                                              reservationMap={suggestionReservationMap}
                                              merging={mergeSuggestionMerging}
                                              onMerge={mergeSuggestion}
                                              onSkip={skipSuggestion}
                                              onDismiss={dismissSuggestions}
                                              onReservationClick={handleHeaderReservationClick} />
            )}
            {headerReservations.map((reservation) => (
                <ReservationDetail key={`header-res-${reservation.id}`}
                                   reservation={reservation}
                                   customerMap={customerMap}
                                   reservationMap={reservationMap}
                                   history={[]}
                                   onClose={() => setHeaderReservations((prev) => prev.filter((r) => r.id !== reservation.id))}
                                   onCustomerClick={openCustomerDetail}
                                   onUpdate={(_prev, updated) => {
                                       setHeaderReservations((prev) => prev.map((r) => r.id === updated.id ? updated : r));
                                   }}
                                   onCancel={(res) => {
                                       setHeaderReservations((prev) => prev.filter((r) => r.id !== res.id));
                                   }}
                                   onRestore={(res) => {
                                       setHeaderReservations((prev) => prev.filter((r) => r.id !== res.id));
                                   }} />
            ))}
            {isSearchOpen && <SearchLayer onClose={() => setIsSearchOpen(false)} />}
            {gmailTokenExpired && (
                <StyledTokenExpiredToast>
                    <span>Google 인증이 만료되었습니다.</span>
                    <StyledTokenReconnect type="button" onClick={() => {
                        dismissGmailTokenExpired();
                        signIn('google');
                    }}>
                        재연결
                    </StyledTokenReconnect>
                    <StyledTokenClose type="button" onClick={dismissGmailTokenExpired}>
                        ✕
                    </StyledTokenClose>
                </StyledTokenExpiredToast>
            )}
        </StyledHeader>
        {conflictCount > 0 && firstConflictKey && (
            <StyledConflictBanner type="button" onClick={() => openConflictByKey(firstConflictKey)}>
                <span>중복예약 <strong className="count">{conflictCount}건</strong>이 있습니다</span>
                <span className="cta">확인하기 →</span>
            </StyledConflictBanner>
        )}
        </>
    );
};

const StyledConflictBanner = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 14px;
    height: 34px;
    flex-shrink: 0;
    box-sizing: border-box;
    border: none;
    border-bottom: 1px solid var(--danger-border);
    background: var(--danger-bg);
    color: var(--danger-color);
    font-size: 12px;
    cursor: pointer;
    text-align: left;

    .count { font-weight: 700; }

    .cta {
        font-weight: 600;
        white-space: nowrap;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover { filter: brightness(0.97); }
    }
`;

const StyledHeader = styled.header`
    position: relative;
    z-index: 20;
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
        padding: 0 0 0 8px;
    }
`;

const StyledCalendarRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;

    @media (max-width: 640px) {
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
        padding: 4px 2px;
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

    .menu-label { display: none; }

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
        flex-direction: column;
        gap: 3px;
        width: auto;
        min-width: 44px;
        height: auto;
        padding: 8px 10px;
        border-radius: 20px;
        background-color: var(--aside-bg);
        color: var(--aside-text);
        box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        opacity: 1;
        transition: left 0.25s ease, background-color 0.1s;

        .menu-label { display: block; }

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                background-color: var(--aside-hover);
            }
        }
    }
`;

const StyledAsideToggleLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
`;

const StyledPageTitle = styled.h1`
    flex: 1;
    margin: 0;
    font-size: var(--big-font);
    font-weight: 700;
    text-align: center;
    color: var(--dark-gray-color);

    @media (max-width: 640px) {
        text-align: left;
    }
`;

const StyledDesignerFilter = styled.select`
    min-width: 128px;
    margin-right: auto;
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
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        margin-top: 4px;
        @media (max-width: 640px) {
            margin-top: 0;
        }
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
    color: var(--white-color);
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
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
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
    const openCustomerDetail = useCalendarStore((s) => s.openCustomerDetail);

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
        openCustomerDetail(id);
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
                            <StyledResultItem key={c.id}
                                              onClick={() => handleSelect(c.id)}>
                                <span>{c.name}</span>
                                <span>{formatTel(c.tel)}</span>
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
    background-color: rgba(0, 0, 0, 0.45);
    box-sizing: border-box;
`;

const StyledSearchModal = styled.div`
    width: 100%;
    max-width: 400px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background-color: var(--white-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
`;

const StyledSearchHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 8px;
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

const StyledTokenExpiredToast = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    background: var(--toast-bg);
    color: var(--white-color);
    font-size: 13px;
    box-shadow: var(--modal-shadow);
    z-index: 10000;
    white-space: nowrap;
`;

const StyledTokenReconnect = styled.button`
    padding: 0;
    border: none;
    background: none;
    color: var(--link-color-light);
    font-size: 13px;
    font-weight: 600;

    @media (hover: hover) and (pointer: fine) {
        &:hover { text-decoration: underline; }
    }
`;

const StyledTokenClose = styled.button`
    padding: 0;
    border: none;
    background: none;
    color: var(--muted-text);
    font-size: 14px;
    line-height: 1;
`;
