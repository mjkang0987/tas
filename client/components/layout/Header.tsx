import {useCallback, useState} from 'react';

import {useRouter} from 'next/router';

import {useCalendarStore} from '../../store/calendarStore';
import {useStoreLabels} from '../../hooks/useStoreLabels';
import type {StoreLabels} from '../../features/store-settings/labels';
import {useNaverBookingSync} from '../../hooks/useNaverBookingSync';
import {useCustomerMergeSuggestion} from '../../hooks/useCustomerMergeSuggestion';
import {splitAssigneesByStatus, getAssigneeColor} from '../../utils/assignees';
import {isCalendar} from '../../utils/router';
import type {Reservation} from '../../utils/reservations';
import {toDateKey} from '../../utils/reservations';
import {roundToHalfHour, pad} from '../../utils/timeRound';

import {CalendarDirection} from '../calendar/CalendarDirection';
import {CalendarHeading} from '../calendar/CalendarHeading';
import {ReservationDetail} from '../calendar/overlays/ReservationDetail';
import {MobileViewTabs} from './MobileViewTabs';
import {NaverSyncNotification} from './NaverSyncNotification';
import {BookingRequestNotification} from './BookingRequestNotification';
import {NaverSyncConflictModal} from '../modals/NaverSyncConflictModal';
import {CustomerMergeSuggestionModal} from '../modals/CustomerMergeSuggestionModal';
import {HeaderSearchLayer} from './HeaderSearchLayer';
import {
    StyledConflictBanner,
    StyledHeader,
    StyledCalendarRow,
    StyledToolRow,
    StyledAsideToggle,
    StyledAsideToggleLabel,
    StyledPageTitle,
    StyledAssigneeFilter,
    StyledSyncWrap,
    StyledSyncToast,
    StyledSyncButton,
    StyledSyncIcon,
    StyledCustomerSearchButton,
    StyledSearchIcon,
    StyledTokenExpiredToast,
    StyledTokenReconnect,
    StyledTokenClose,
    StyledMobileAddPill,
} from './Header.styles';

const PAGE_TITLES: Record<string, string> = {
    '/address': '고객 명단',
    '/mypage': '계정 정보',
    '/logout': '로그아웃',
    '/menu': '설정',
};

function getSettingsTabTitles(labels: StoreLabels): Record<string, string> {
    return {
        revenue: '매출',
        point: '적립금 관리',
        store: '매장 관리',
        service: `${labels.service} 관리`,
        assignee: `${labels.assignee} 관리`,
        member: '멤버 관리',
        sns: 'SNS 연동',
    };
}

export const Header = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const router = useRouter();
    const labels = useStoreLabels();
    const aside = useCalendarStore((s) => s.aside);
    const setAside = useCalendarStore((s) => s.setAside);
    const currValue = useCalendarStore((s) => s.target);
    const assignees = useCalendarStore((s) => s.assignees);
    const calendarAssigneeId = useCalendarStore((s) => s.calendarAssigneeId);
    const setCalendarAssigneeId = useCalendarStore((s) => s.setCalendarAssigneeId);
    const setCreateReservationInitial = useCalendarStore((s) => s.setCreateReservationInitial);

    // 모바일 상단 '＋예약' 버튼 — aside의 예약추가와 동일(현재 시각 30분 반올림)
    const handleCreateReservation = () => {
        const now = new Date();
        const {hour, rounded} = roundToHalfHour(now.getHours(), now.getMinutes());
        const date = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
        setCreateReservationInitial({date, startTime: `${pad(hour)}:${pad(rounded)}`});
    };
    const pathSegments = router.asPath.split('?')[0].split('/');
    const isRootPath = pathSegments.join('').length === 0;
    const isCalendarPage = isRootPath || isCalendar(pathSegments);
    const settingsTab = typeof router.query.tab === 'string' ? router.query.tab : 'revenue';
    const isSettingsPage = router.pathname === '/settings' || router.pathname === '/settings/[tab]';
    const settingsTabTitles = getSettingsTabTitles(labels);
    const pageTitle = isSettingsPage
        ? `${settingsTabTitles[settingsTab] ?? settingsTabTitles.revenue}`
        : PAGE_TITLES[router.pathname] ?? 'TAS';
    const {
        active: activeAssignees,
        onLeave: onLeaveAssignees,
        resigned: resignedAssignees
    } = splitAssigneesByStatus(assignees);
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const {
        visibleNotifications,
        unreadCount,
        markRead,
        markAllRead,
        currentConflict,
        currentConflictStatus,
        currentConflictReason,
        advanceConflict,
        deferConflict,
        dismissConflicts,
        openConflictByKey,
        sync,
        syncing,
        canUseSync,
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
    const updateReservation = useCalendarStore((s) => s.updateReservation);
    const cancelReservation = useCalendarStore((s) => s.cancelReservation);
    const restoreReservation = useCalendarStore((s) => s.restoreReservation);
    const deleteReservation = useCalendarStore((s) => s.deleteReservation);
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
        setHeaderReservations((prev) => [...prev, reservation]);
    }, [reservationMap, setReservationMap]);

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
                    <StyledMobileAddPill type="button"
                                         onClick={handleCreateReservation}
                                         aria-label="예약 추가">
                        <svg viewBox="0 0 24 24"
                             fill="none"
                             stroke="currentColor"
                             strokeWidth="2.3"
                             strokeLinecap="round"
                             aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        예약
                    </StyledMobileAddPill>
                </StyledCalendarRow>
                <StyledToolRow>
                    <StyledAssigneeFilter value={calendarAssigneeId ?? ''}
                                          id="tour-assignee-filter"
                                          onChange={(e) => setCalendarAssigneeId(e.target.value ? Number(e.target.value) : null)}
                                          aria-label={`달력 ${labels.assignee} 필터`}>
                        <option value="">전체보기</option>
                        <option value="0" data-bg-color="#8E8E93">미지정</option>
                        {activeAssignees.map((assignee) => (
                            <option key={assignee.id} value={assignee.id} data-bg-color={getAssigneeColor(assignee)}>
                                {assignee.name}
                            </option>
                        ))}
                        {onLeaveAssignees.length > 0 && (
                            <optgroup label="휴직자">
                                {onLeaveAssignees.map((assignee) => (
                                    <option key={assignee.id} value={assignee.id} data-bg-color={getAssigneeColor(assignee)}>
                                        {assignee.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {resignedAssignees.length > 0 && (
                            <optgroup label="퇴직자">
                                {resignedAssignees.map((assignee) => (
                                    <option key={assignee.id} value={assignee.id} data-bg-color={getAssigneeColor(assignee)}>
                                        {assignee.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </StyledAssigneeFilter>
                    {isActive && (
                        <StyledSyncWrap>
                            <StyledSyncButton type="button"
                                              onClick={sync}
                                              disabled={syncing}
                                              aria-label="예약 동기화">
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
                    {canUseSync && (
                        <NaverSyncNotification notifications={visibleNotifications}
                                               unreadCount={unreadCount}
                                               markRead={markRead}
                                               markAllRead={markAllRead}
                                               reservationMap={reservationMap}
                                               onSelectReservation={handleHeaderReservationClick}
                                               onSelectConflict={openConflictByKey} />
                    )}
                    <BookingRequestNotification />
                    <StyledCustomerSearchButton type="button"
                                                id="tour-search"
                                                onClick={() => setIsSearchOpen(true)}
                                                aria-label="고객검색">
                        <StyledSearchIcon viewBox="0 0 24 24"
                                          aria-hidden="true">
                            <circle cx="10.5"
                                    cy="10.5"
                                    r="7.5" />
                            <path d="M15.8 15.8L21 21" />
                        </StyledSearchIcon>
                    </StyledCustomerSearchButton>
                </StyledToolRow>
                <MobileViewTabs />
            </>}
            {!isCalendarPage && <>
                <StyledPageTitle>{pageTitle}</StyledPageTitle>
                {isActive && (
                    <StyledSyncWrap>
                        <StyledSyncButton type="button"
                                          onClick={sync}
                                          disabled={syncing}
                                          aria-label="예약 동기화">
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
                {canUseSync && (
                    <NaverSyncNotification notifications={visibleNotifications}
                                           unreadCount={unreadCount}
                                           markRead={markRead}
                                           markAllRead={markAllRead}
                                           reservationMap={reservationMap}
                                           onSelectReservation={handleHeaderReservationClick}
                                           onSelectConflict={openConflictByKey} />
                )}
                <BookingRequestNotification />
                <StyledCustomerSearchButton type="button"
                                            onClick={() => setIsSearchOpen(true)}
                                            aria-label="고객검색">
                    <StyledSearchIcon viewBox="0 0 24 24"
                                      aria-hidden="true">
                        <circle cx="10.5"
                                cy="10.5"
                                r="7.5" />
                        <path d="M15.8 15.8L21 21" />
                    </StyledSearchIcon>
                </StyledCustomerSearchButton>
            </>}
            {canUseSync && currentConflict && (
                <NaverSyncConflictModal conflict={currentConflict}
                                        isConfirmed={currentConflictStatus === 'confirmed'}
                                        reason={currentConflictReason}
                                        onAdvance={advanceConflict}
                                        onDefer={deferConflict}
                                        onDismiss={dismissConflicts}
                                        onSelectReservation={handleConflictReservationClick} />
            )}
            {!(canUseSync && currentConflict) && currentSuggestion && (
                <CustomerMergeSuggestionModal key={currentSuggestion.key}
                                              suggestion={currentSuggestion}
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
                                   onUpdate={(prev, updated) => {
                                       updateReservation(prev, updated);
                                       setHeaderReservations((list) => list.map((r) => r.id === updated.id ? updated : r));
                                   }}
                                   onCancel={(res, status) => {
                                       cancelReservation(res, status);
                                       setHeaderReservations((list) => list.filter((r) => r.id !== res.id));
                                   }}
                                   onRestore={(res) => {
                                       restoreReservation(res);
                                       setHeaderReservations((list) => list.filter((r) => r.id !== res.id));
                                   }}
                                   onDelete={(res) => deleteReservation(res)} />
            ))}
            {isSearchOpen && <HeaderSearchLayer onClose={() => setIsSearchOpen(false)} />}
            {gmailTokenExpired && (
                <StyledTokenExpiredToast>
                    <span>Google 인증이 만료되었습니다.</span>
                    <StyledTokenReconnect type="button" onClick={() => {
                        dismissGmailTokenExpired();
                        window.location.href = '/api/gmail/connect';
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
