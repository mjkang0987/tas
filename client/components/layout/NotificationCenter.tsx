import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

import {useCalendarStore} from '../../store/calendarStore';
import {useBookingRequests} from '../../hooks/useBookingRequests';
import {useExpiringBenefits} from '../../hooks/useExpiringBenefits';
import type {SyncNotification} from '../../hooks/useNaverBookingSync';
import {groupByDate, type Reservation} from '../../utils/reservations';
import {getAssigneeColor} from '../../utils/assignees';
import {bellIndicator, untilLabel, upcomingReservations, type UpcomingReservation} from '../../features/notifications/upcoming';
import {daysUntil, dDayLabel, type ExpiringBenefit} from '../../features/notifications/expiring';
import {AssigneeLabel} from '../ui/AssigneeLabel';
import {CustomerDetail} from '../calendar/overlays/CustomerDetail';
import {LabelBadge} from '../ui/LabelBadge';
import {BookingRequestSection} from './BookingRequestSection';
import {NaverNotificationModal, NaverSyncSection, naverPanelItems} from './NaverSyncNotification';
import {
    StyledActionButton,
    StyledBody,
    StyledFooter,
    StyledHeader,
    StyledHeaderTitle,
    useDialogAccessibility,
} from '../calendar/overlays/ModalStyles';
import {
    StyledBadge,
    StyledBellButton,
    StyledContainer,
    StyledItem,
    StyledItemText,
    StyledModalBodyInner,
    StyledModalOverlay,
    StyledSection,
} from './NaverSyncNotification.styles';
import {
    StyledCallLink,
    StyledCenterDetail,
    StyledCheckLabel,
    StyledDot,
    StyledItemMain,
    StyledItemSub,
    StyledItemTop,
    StyledNameButton,
    StyledPlainItem,
    StyledSectionAction,
    StyledSectionCount,
    StyledSectionActions,
    StyledSectionEmpty,
    StyledSectionHead,
    StyledSectionList,
    StyledSectionTitle,
    StyledStrong,
    StyledTab,
    StyledTabCount,
    StyledTabs,
    StyledUntilTag,
} from './NotificationCenter.styles';

interface Props {
    /** 네이버 알림은 오너 + 네이버 연동 매장만(useNaverBookingSync 의 canUseSync) */
    canUseSync: boolean;
    notifications: SyncNotification[];
    unreadCount: number;
    markRead: (id: string) => void;
    markAllRead: () => void;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectConflict: (conflictKey: string) => void;
}

function formatMd(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

type NotificationTab = 'all' | 'benefit' | 'request' | 'naver' | 'upcoming';

/** 다른 레이어와 같은 모양 — 데스크톱은 가운데, 휴대폰은 아래 시트(ModalStyles). Esc·포커스 가두기·닫으면 종으로 포커스. */
const NotificationLayer = ({onClose, tabs, children}: {onClose: () => void; tabs: ReactNode; children: ReactNode}) => {
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);
    const modalRoot = document.getElementById('modal-root') ?? document.body;
    return createPortal(
        <StyledModalOverlay onClick={onClose}>
            <StyledCenterDetail ref={dialogRef}
                               id="notification-center-panel"
                               role="dialog"
                               aria-modal="true"
                               aria-labelledby="notification-center-title"
                               tabIndex={-1}
                               onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitle id="notification-center-title">알림</StyledHeaderTitle>
                </StyledHeader>
                {tabs}
                <StyledBody>
                    <StyledModalBodyInner>{children}</StyledModalBodyInner>
                </StyledBody>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onClose}>닫기</StyledActionButton>
                </StyledFooter>
            </StyledCenterDetail>
        </StyledModalOverlay>,
        modalRoot,
    );
};

/**
 * 알림 종 하나 — 확인할 일(쿠폰·회원권 만료 임박) · 고객 예약 요청 · 네이버 알림 · 곧 시작하는 예약.
 * 예전엔 네이버 벨·예약 요청 벨이 따로였고 휴대폰 헤더에 자리가 없어 합쳤다(2026-10-22).
 * 종은 누구나(게스트 포함) 보이고, 칸은 쓸 수 있는 것만 보인다.
 */
export const NotificationCenter = ({
    canUseSync,
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    onSelectReservation,
    onSelectConflict,
}: Props) => {
    const reservationMap = useCalendarStore((s) => s.reservationMap);
    const setReservationMap = useCalendarStore((s) => s.setReservationMap);
    const setReservationHistory = useCalendarStore((s) => s.setReservationHistory);
    const customerMap = useCalendarStore((s) => s.customerMap);
    const assignees = useCalendarStore((s) => s.assignees);
    const useOnlineBooking = useCalendarStore((s) => s.useOnlineBooking);
    const {requests, loading: requestsLoading, refetch: refetchRequests, decide} = useBookingRequests();
    const {benefits, refetch: refetchBenefits, setChecked} = useExpiringBenefits();

    const [open, setOpen] = useState(false);
    const [showAllNaver, setShowAllNaver] = useState(false);
    const [tab, setTab] = useState<NotificationTab>('all');
    // 서버 렌더와 어긋나지 않게 첫 화면 뒤에 시각을 잡고, 1분마다 '곧 시작'을 다시 센다. null = 아직 마운트 전.
    const [now, setNow] = useState<Date | null>(null);
    // 고객 이름을 누르면 종이 직접 고객 상세를 띄운다 — 페이지마다 고객 레이어가 있는지와 무관하게 그 자리에서 열린다.
    const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);

    useEffect(() => {
        const tick = () => setNow(new Date());
        const first = setTimeout(tick, 0);
        const id = setInterval(tick, 60_000);
        return () => { clearTimeout(first); clearInterval(id); };
    }, []);

    const close = useCallback(() => setOpen(false), []);

    const openLayer = () => {
        // 열 때마다 새로 — 다른 직원이 처리했거나 새로 들어온 것
        refetchRequests();
        refetchBenefits();
        setTab('all');
        setOpen(true);
    };

    const openCustomer = (customerId: number) => {
        setDetailCustomerId(customerId);
        setOpen(false);
    };

    // 요청을 누르면 그 예약 상세 — 맵에 없으면(로드 뒤 들어온 신규 예약) 다시 불러와 찾는다.
    const openRequestReservation = useCallback(async (legacyId: number) => {
        const inMap = Object.values(reservationMap).flat().find((r) => r.id === legacyId);
        if (inMap) { onSelectReservation(inMap); setOpen(false); return; }
        try {
            const res = await fetch('/api/reservations');
            if (!res.ok) return;
            const data = await res.json();
            const list: Reservation[] = Array.isArray(data.reservations) ? data.reservations : [];
            setReservationMap(groupByDate(list));
            if (Array.isArray(data.history)) setReservationHistory(data.history);
            const found = list.find((r) => r.id === legacyId);
            if (found) { onSelectReservation(found); setOpen(false); }
        } catch { /* 네트워크 실패 무시 */ }
    }, [reservationMap, onSelectReservation, setReservationMap, setReservationHistory]);

    const naverCount = canUseSync ? unreadCount : 0;
    const requestCount = useOnlineBooking ? requests.length : 0;
    const uncheckedBenefits = benefits.filter((b) => !b.checked).length;
    const upcoming = now ? upcomingReservations(reservationMap, now) : {soon: [], next: null};
    const indicator = now
        ? bellIndicator({todo: naverCount + requestCount + uncheckedBenefits, soon: upcoming.soon.length})
        : {count: 0, dot: false};
    const hasNaverUnread = notifications.some((n) => n.type !== 'conflict' && !n.read);
    const naverHasItems = naverPanelItems(notifications, now?.getTime() ?? 0).length > 0;

    // 탭 — 쓸 수 있는 칸만. 전체에선 빈 칸을 숨기고, 칸 탭에선 빈 문구를 보인다.
    const tabs: {key: NotificationTab; label: string; count: number}[] = [
        {key: 'all', label: '전체', count: indicator.count},
        ...(benefits.length > 0 ? [{key: 'benefit' as const, label: '쿠폰·회원권', count: uncheckedBenefits}] : []),
        ...(requestCount > 0 ? [{key: 'request' as const, label: '요청', count: requestCount}] : []),
        ...(canUseSync ? [{key: 'naver' as const, label: '네이버', count: naverCount}] : []),
        {key: 'upcoming', label: '곧 시작', count: 0},
    ];
    const activeTab = tabs.some((t) => t.key === tab) ? tab : 'all';
    const shows = (key: Exclude<NotificationTab, 'all'>, hasContent: boolean) =>
        activeTab === key || (activeTab === 'all' && hasContent);

    const bellLabel = indicator.count > 0
        ? `알림, 처리할 일 ${indicator.count}건`
        : indicator.dot ? '알림, 곧 시작하는 예약 있음' : '알림';

    const renderUpcoming = ({reservation, minutesUntil}: UpcomingReservation) => {
        const assignee = assignees.find((a) => a.id === reservation.assigneeId);
        const customerName = customerMap[reservation.customerId]?.name || `고객 #${reservation.customerId}`;
        return (
            <StyledItem key={reservation.id}
                        type="button"
                        onClick={() => { onSelectReservation(reservation); setOpen(false); }}>
                {/* 네이버 알림 줄과 같은 글씨(StyledItemText) — 크기·굵기를 맞춘다 */}
                <StyledItemText>
                    <StyledUntilTag>{untilLabel(minutesUntil)}</StyledUntilTag>
                    <span className="date">{reservation.startTime}</span>
                    <span className="name">{customerName}</span>
                    {reservation.service && <span className="suffix">{reservation.service}</span>}
                </StyledItemText>
                {assignee && <AssigneeLabel color={getAssigneeColor(assignee)} name={assignee.name} />}
            </StyledItem>
        );
    };

    const renderBenefit = (b: ExpiringBenefit) => {
        const days = now ? daysUntil(b.expiresAt, now) : 0;
        return (
            <StyledPlainItem key={`${b.kind}-${b.id}`} $done={b.checked}>
                <StyledItemMain>
                    <StyledItemTop>
                        {b.customerId != null
                            ? <StyledNameButton type="button" onClick={() => openCustomer(b.customerId as number)}>
                                {b.customerName || '고객'}
                            </StyledNameButton>
                            : <StyledStrong>{b.customerName || '고객'}</StyledStrong>}
                        <LabelBadge $tone={days <= 1 ? 'danger' : 'warning'} $shape="soft" $size="sm">{dDayLabel(days)}</LabelBadge>
                    </StyledItemTop>
                    <StyledItemSub>
                        {b.kind === 'coupon' ? '쿠폰' : '회원권'} · {b.name}
                        {b.remainingCount != null && ` · 남은 ${b.remainingCount}회`} · {formatMd(b.expiresAt)} 만료
                    </StyledItemSub>
                </StyledItemMain>
                {b.customerTel && (
                    <StyledCallLink href={`tel:${b.customerTel}`} aria-label={`${b.customerName || '고객'}에게 전화`}>전화</StyledCallLink>
                )}
                <StyledCheckLabel>
                    <input type="checkbox" checked={b.checked} onChange={(e) => setChecked(b, e.target.checked)} />
                    확인
                </StyledCheckLabel>
            </StyledPlainItem>
        );
    };

    return (
        <>
            <StyledContainer>
                <StyledBellButton type="button"
                                  id="tour-notify"
                                  onClick={openLayer}
                                  aria-haspopup="dialog"
                                  aria-label={bellLabel}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {indicator.count > 0 && <StyledBadge aria-hidden="true">{indicator.count > 9 ? '9+' : indicator.count}</StyledBadge>}
                    {indicator.dot && <StyledDot aria-hidden="true" />}
                </StyledBellButton>

            </StyledContainer>

                {open && (
                    <NotificationLayer onClose={close}
                                       tabs={tabs.length > 2 && (
                                           <StyledTabs aria-label="알림 종류">
                                               {tabs.map((t) => (
                                                   <StyledTab key={t.key} $active={activeTab === t.key}>
                                                       <input type="radio"
                                                              className="a11y"
                                                              name="notification-tab"
                                                              value={t.key}
                                                              checked={activeTab === t.key}
                                                              onChange={() => setTab(t.key)} />
                                                       {t.label}
                                                       {t.count > 0 && <StyledTabCount>{t.count}</StyledTabCount>}
                                                   </StyledTab>
                                               ))}
                                           </StyledTabs>
                                       )}>
                            {shows('benefit', benefits.length > 0) && (
                                <StyledSection>
                                    <StyledSectionHead>
                                        <StyledSectionTitle>쿠폰·회원권 만료 임박{uncheckedBenefits > 0 && <> <StyledSectionCount>{uncheckedBenefits}</StyledSectionCount></>}</StyledSectionTitle>
                                    </StyledSectionHead>
                                    {benefits.length > 0
                                        ? <StyledSectionList>{benefits.map(renderBenefit)}</StyledSectionList>
                                        : <StyledSectionEmpty>7일 안에 끝나는 쿠폰·회원권이 없습니다</StyledSectionEmpty>}
                                </StyledSection>
                            )}

                            {useOnlineBooking && shows('request', requests.length > 0) && (
                                <StyledSection>
                                    <StyledSectionHead>
                                        <StyledSectionTitle>고객 예약 요청 <StyledSectionCount>{requests.length}</StyledSectionCount></StyledSectionTitle>
                                    </StyledSectionHead>
                                    <StyledSectionList>
                                        <BookingRequestSection requests={requests}
                                                               loading={requestsLoading}
                                                               refetch={refetchRequests}
                                                               decide={decide}
                                                               onOpenReservation={openRequestReservation} />
                                    </StyledSectionList>
                                </StyledSection>
                            )}

                            {canUseSync && shows('naver', true) && (
                                <StyledSection>
                                    <StyledSectionHead>
                                        <StyledSectionTitle>네이버 알림{naverCount > 0 && <> <StyledSectionCount>{naverCount}</StyledSectionCount></>}</StyledSectionTitle>
                                        <StyledSectionActions>
                                            {hasNaverUnread && (
                                                <StyledSectionAction type="button" onClick={markAllRead}>모두 읽음</StyledSectionAction>
                                            )}
                                            {notifications.length > 0 && (
                                                <StyledSectionAction type="button" onClick={() => { setOpen(false); setShowAllNaver(true); }}>
                                                    전체 보기
                                                </StyledSectionAction>
                                            )}
                                        </StyledSectionActions>
                                    </StyledSectionHead>
                                    {naverHasItems ? (
                                        <StyledSectionList>
                                            <NaverSyncSection notifications={notifications}
                                                              markRead={markRead}
                                                              reservationMap={reservationMap}
                                                              onSelectReservation={onSelectReservation}
                                                              onSelectConflict={onSelectConflict}
                                                              onNavigate={close}
                                                              now={now?.getTime() ?? 0} />
                                        </StyledSectionList>
                                    ) : <StyledSectionEmpty>새 알림이 없습니다</StyledSectionEmpty>}
                                </StyledSection>
                            )}

                            {shows('upcoming', true) && <StyledSection>
                                <StyledSectionHead>
                                    <StyledSectionTitle>{upcoming.soon.length === 0 && upcoming.next ? '다음 예약' : '곧 시작하는 예약'}</StyledSectionTitle>
                                </StyledSectionHead>
                                {upcoming.soon.length > 0 || upcoming.next ? (
                                    <StyledSectionList>
                                        {upcoming.soon.map(renderUpcoming)}
                                        {upcoming.soon.length === 0 && upcoming.next && renderUpcoming(upcoming.next)}
                                    </StyledSectionList>
                                ) : <StyledSectionEmpty>오늘 남은 예약이 없습니다</StyledSectionEmpty>}
                            </StyledSection>}
                    </NotificationLayer>
                )}

            {detailCustomerId !== null && customerMap[detailCustomerId] && (
                <CustomerDetail customer={customerMap[detailCustomerId]}
                                reservationMap={reservationMap}
                                onReservationClick={onSelectReservation}
                                onClose={() => setDetailCustomerId(null)} />
            )}

            {showAllNaver && (
                <NaverNotificationModal notifications={notifications}
                                        assignees={assignees}
                                        reservationMap={reservationMap}
                                        markRead={markRead}
                                        markAllRead={markAllRead}
                                        onSelectReservation={onSelectReservation}
                                        onSelectConflict={onSelectConflict}
                                        onClose={() => setShowAllNaver(false)} />
            )}
        </>
    );
};
