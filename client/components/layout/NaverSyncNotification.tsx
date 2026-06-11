import {useCallback, useEffect, useRef, useState} from 'react';

import {useCalendarStore} from '../../store/calendarStore';
import type {SyncNotification} from '../../hooks/useNaverBookingSync';
import type {Reservation} from '../../utils/reservations';
import type {ReservationMap} from '../../features/reservations/model';
import type {Designer} from '../../utils/designers';
import {DesignerLabel} from '../ui/DesignerLabel';
import {
    StyledContainer,
    StyledBellButton,
    StyledBadge,
    StyledPanel,
    StyledPanelHeader,
    StyledPanelTitle,
    StyledMarkReadButton,
    StyledPanelBody,
    StyledSection,
    StyledSectionLabel,
    StyledUnreadDot,
    StyledFlag,
    StyledEmpty,
    StyledItem,
    StyledItemText,
    StyledConflictItemText,
    StyledNaverTag,
    StyledCancelTag,
    StyledConflictTag,
    StyledStatusTag,
    StyledDesignerMeta,
    StyledPanelFooter,
    StyledShowAllButton,
    StyledModalOverlay,
    StyledModalDetail,
    StyledModalBodyInner,
    StyledModalItem,
} from './NaverSyncNotification.styles';

interface Props {
    notifications: SyncNotification[];
    unreadCount: number;
    markRead: (id: string) => void;
    markAllRead: () => void;
    reservationMap: ReservationMap;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectConflict: (conflictKey: string) => void;
}
const SEVEN_DAYS_MS  = 7  * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function formatDate(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
}

function getDesignerColor(designerName: string, designers: Designer[]): string {
    const designer = designers.find((d) => d.name === designerName);
    return designer?.color ?? 'var(--unassigned-color)';
}

function getConflictStatusLabel(status?: SyncNotification['conflictStatus']): string {
    if (status === 'deferred') return '보류';
    if (status === 'confirmed') return '확인';
    return '대기';
}

export const NaverSyncNotification = ({
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    reservationMap,
    onSelectReservation,
    onSelectConflict,
}: Props) => {
    const [open, setOpen] = useState(false);
    const [showAllModal, setShowAllModal] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const designers = useCalendarStore((s) => s.designers);

    const toggle = useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;

        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const now = Date.now();
    // 미해결 중복예약: read 여부·날짜 무관
    const pendingConflicts = notifications.filter(
        (n) => n.type === 'conflict' && n.conflictStatus !== 'confirmed',
    );
    // 안읽은 일반 알림: 30일 이내
    const recentUnread = notifications.filter(
        (n) => n.type !== 'conflict' && !n.read && now - n.timestamp.getTime() <= THIRTY_DAYS_MS,
    );
    const panelItems = [...pendingConflicts, ...recentUnread];

    const handleNotificationClick = (n: SyncNotification) => {
        markRead(n.id);
        if (n.type === 'conflict' && n.conflictKey) {
            onSelectConflict(n.conflictKey);
            setOpen(false);
            return;
        }
        const dateReservations = Object.values(reservationMap).flat();
        const reservation = dateReservations.find((r) => r.id === n.reservationId);
        if (reservation) {
            onSelectReservation(reservation);
            setOpen(false);
        }
    };

    const handleShowAll = () => {
        setOpen(false);
        setShowAllModal(true);
    };
    const displayUnreadCount = hasMounted ? unreadCount : 0;

    return (
        <>
            <StyledContainer ref={containerRef}>
                <StyledBellButton type="button" onClick={toggle} aria-label="알림">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {displayUnreadCount > 0 && <StyledBadge>{displayUnreadCount > 9 ? '9+' : displayUnreadCount}</StyledBadge>}
                </StyledBellButton>

                {open && (
                    <StyledPanel>
                        <StyledPanelHeader>
                            <StyledPanelTitle>알림</StyledPanelTitle>
                            {recentUnread.length > 0 && (
                                <StyledMarkReadButton type="button" onClick={markAllRead}>
                                    모두 읽음
                                </StyledMarkReadButton>
                            )}
                        </StyledPanelHeader>

                        <StyledPanelBody>
                            {panelItems.length === 0 && (
                                <StyledEmpty>새 알림이 없습니다</StyledEmpty>
                            )}
                            {panelItems.map((n) => (
                                <StyledItem key={n.id}
                                            onClick={() => handleNotificationClick(n)}>
                                    {n.type === 'conflict' ? (
                                        <StyledConflictItemText>
                                            <StyledUnreadDot />
                                            <span className="message">
                                                <span className="date">{formatDate(n.appointmentDate)}</span>{' '}
                                                <span className="time">{n.appointmentTime}</span>{' '}
                                                <span className="name">{n.customerName || '고객'}</span>{' '}
                                                <span className="suffix">고객님</span>{' '}
                                                <span className="name">{n.designerName || '미지정'}</span>{' '}
                                                <span className="suffix">디자이너로 중복 예약 발생했습니다.</span>{' '}
                                                <StyledConflictTag>중복예약</StyledConflictTag>{' '}
                                                <StyledStatusTag $status={n.conflictStatus}>{getConflictStatusLabel(n.conflictStatus)}</StyledStatusTag>
                                            </span>
                                        </StyledConflictItemText>
                                    ) : (
                                        <StyledItemText>
                                            <StyledUnreadDot />
                                            <span className="date">{formatDate(n.appointmentDate)}</span>
                                            <span className="time">{n.appointmentTime}</span>
                                            <span className="name">{n.customerName}</span>
                                            <span className="suffix">고객님</span>
                                            {n.type === 'cancel'
                                                ? <StyledCancelTag>취소</StyledCancelTag>
                                                : <><StyledNaverTag>네이버예약</StyledNaverTag><span className="suffix">확정</span></>
                                            }
                                        </StyledItemText>
                                    )}
                                    <StyledDesignerMeta>
                                        <span>디자이너</span>
                                        <DesignerLabel color={getDesignerColor(n.designerName, designers)}
                                                       name={n.designerName} />
                                    </StyledDesignerMeta>
                                </StyledItem>
                            ))}
                        </StyledPanelBody>

                        {notifications.length > 0 && (
                            <StyledPanelFooter>
                                <StyledShowAllButton type="button" onClick={handleShowAll}>
                                    전체알림보기
                                </StyledShowAllButton>
                            </StyledPanelFooter>
                        )}
                    </StyledPanel>
                )}
            </StyledContainer>

            {showAllModal && (
                <NotificationModal
                    notifications={notifications}
                    designers={designers}
                    reservationMap={reservationMap}
                    markRead={markRead}
                    markAllRead={markAllRead}
                    onSelectReservation={onSelectReservation}
                    onSelectConflict={onSelectConflict}
                    onClose={() => setShowAllModal(false)} />
            )}
        </>
    );
};

// ── Notification Modal (Full) ──

import {createPortal} from 'react-dom';

import {
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledBody,
    StyledFooter,
    StyledActionButton,
    useDialogAccessibility,
} from '../calendar/overlays/ModalStyles';

interface ModalProps {
    notifications: SyncNotification[];
    designers: Designer[];
    reservationMap: ReservationMap;
    markRead: (id: string) => void;
    markAllRead: () => void;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectConflict: (conflictKey: string) => void;
    onClose: () => void;
}

const NotificationModal = ({notifications, designers, reservationMap, markRead, markAllRead, onSelectReservation, onSelectConflict, onClose}: ModalProps) => {
    const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

    const now = Date.now();
    // 중복예약: 미해결은 항상, 확인된 건 7일 이내
    const conflictNotifications = notifications.filter((n) =>
        n.type === 'conflict' && (
            n.conflictStatus !== 'confirmed' ||
            now - n.timestamp.getTime() <= SEVEN_DAYS_MS
        ),
    );
    // 안읽은 일반: 30일 이내
    const unreadNotifications = notifications.filter((n) =>
        !n.read && n.type !== 'conflict' && now - n.timestamp.getTime() <= THIRTY_DAYS_MS,
    );
    // 읽은 일반: 7일 이내
    const readNotifications = notifications.filter((n) =>
        n.read && n.type !== 'conflict' && now - n.timestamp.getTime() <= SEVEN_DAYS_MS,
    );
    const isEmpty = conflictNotifications.length === 0 && unreadNotifications.length === 0 && readNotifications.length === 0;

    const handleClick = (n: SyncNotification) => {
        markRead(n.id);
        if (n.type === 'conflict' && n.conflictKey) {
            onSelectConflict(n.conflictKey);
            onClose();
            return;
        }
        const dateReservations = Object.values(reservationMap).flat();
        const reservation = dateReservations.find((r) => r.id === n.reservationId);
        if (reservation) {
            onSelectReservation(reservation);
        }
    };

    const renderConflictItem = (n: SyncNotification) => (
        <StyledModalItem key={n.id}
                         $unread={n.conflictStatus !== 'confirmed'}
                         $isConflict
                         onClick={() => handleClick(n)}>
            <StyledConflictItemText>
                <span className="message">
                    <span className="date">{formatDate(n.appointmentDate)}</span>{' '}
                    <span className="time">{n.appointmentTime}</span>{' '}
                    <span className="name">{n.customerName || '고객'}</span>{' '}
                    <span className="suffix">고객님</span>{' '}
                    <span className="name">{n.designerName || '미지정'}</span>{' '}
                    <span className="suffix">디자이너로 중복 예약 발생했습니다.</span>{' '}
                    <StyledConflictTag>중복예약</StyledConflictTag>{' '}
                    <StyledStatusTag $status={n.conflictStatus}>{getConflictStatusLabel(n.conflictStatus)}</StyledStatusTag>
                </span>
            </StyledConflictItemText>
            <StyledDesignerMeta>
                <span>디자이너</span>
                <DesignerLabel color={getDesignerColor(n.designerName, designers)} name={n.designerName} />
            </StyledDesignerMeta>
        </StyledModalItem>
    );

    const renderRegularItem = (n: SyncNotification, flag: string) => (
        <StyledModalItem key={n.id}
                         $unread={!n.read}
                         onClick={() => handleClick(n)}>
            <StyledItemText>
                <span className="date">{formatDate(n.appointmentDate)}</span>
                <span className="time">{n.appointmentTime}</span>
                <span className="name">{n.customerName}</span>
                <span className="suffix">고객님</span>
                {n.type === 'cancel'
                    ? <StyledCancelTag>취소</StyledCancelTag>
                    : <><StyledNaverTag>네이버예약</StyledNaverTag><span className="suffix">확정</span></>
                }
            </StyledItemText>
            <StyledDesignerMeta>
                <span>디자이너</span>
                <DesignerLabel color={getDesignerColor(n.designerName, designers)} name={n.designerName} />
            </StyledDesignerMeta>
            <StyledFlag>{flag}</StyledFlag>
        </StyledModalItem>
    );

    const modalRoot = typeof document !== 'undefined'
        ? document.getElementById('modal-root')
        : null;
    if (!modalRoot) return null;

    return createPortal(
        <StyledModalOverlay onClick={onClose} role="dialog" aria-modal="true">
            <StyledModalDetail ref={dialogRef} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <h3>전체 알림</h3>
                    </StyledHeaderTitleGroup>
                    {unreadNotifications.length > 0 && (
                        <button type="button" onClick={markAllRead}>모두 읽음</button>
                    )}
                </StyledHeader>
                <StyledBody>
                    <StyledModalBodyInner>
                        {isEmpty && (
                            <StyledEmpty>알림이 없습니다</StyledEmpty>
                        )}

                        {conflictNotifications.length > 0 && (
                            <StyledSection>
                                <StyledSectionLabel>중복예약</StyledSectionLabel>
                                {conflictNotifications.map(renderConflictItem)}
                            </StyledSection>
                        )}

                        {unreadNotifications.length > 0 && (
                            <StyledSection>
                                <StyledSectionLabel>미확인 알람</StyledSectionLabel>
                                {unreadNotifications.map((n) => renderRegularItem(n, '안읽음'))}
                            </StyledSection>
                        )}

                        {readNotifications.length > 0 && (
                            <StyledSection>
                                <StyledSectionLabel>확인 알람</StyledSectionLabel>
                                {readNotifications.map((n) => renderRegularItem(n, '읽음'))}
                            </StyledSection>
                        )}
                    </StyledModalBodyInner>
                </StyledBody>
                <StyledFooter>
                    <StyledActionButton type="button" onClick={onClose}>닫기</StyledActionButton>
                </StyledFooter>
            </StyledModalDetail>
        </StyledModalOverlay>,
        modalRoot,
    );
};
