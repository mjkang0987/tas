import {useCallback, useEffect, useRef, useState} from 'react';

import styled from 'styled-components';

import {useCalendarStore} from '../../store/calendarStore';
import type {SyncNotification} from '../../hooks/useNaverBookingSync';
import type {Reservation} from '../../utils/reservations';
import type {ReservationMap} from '../../features/reservations/model';
import type {Designer} from '../../utils/designers';
import {DesignerLabel, StyledDesignerLabel} from '../ui/DesignerLabel';
import {LabelBadge} from '../ui/LabelBadge';

interface Props {
    notifications: SyncNotification[];
    unreadCount: number;
    markRead: (id: string) => void;
    markAllRead: () => void;
    reservationMap: ReservationMap;
    onSelectReservation: (reservation: Reservation) => void;
    onSelectConflict: (conflictKey: string) => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatDate(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
}

function getDesignerColor(designerName: string, designers: Designer[]): string {
    const designer = designers.find((d) => d.name === designerName);
    return designer?.color ?? '#8E8E93';
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
    const recentUnread = notifications.filter(
        (n) => !n.read && now - n.timestamp.getTime() < SEVEN_DAYS_MS,
    );

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
                            {recentUnread.length === 0 && (
                                <StyledEmpty>새 알림이 없습니다</StyledEmpty>
                            )}
                            {recentUnread.map((n) => (
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
                                            <StyledNaverTag>네이버예약</StyledNaverTag>
                                            <span className="suffix">예약 확정</span>
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
    StyledOverlay,
    StyledDetail,
    StyledHeader,
    StyledHeaderTitleGroup,
    StyledBody,
    StyledBodyInner,
    StyledFooter,
    StyledActionButton,
    useDialogAccessibility,
    OVERLAY_Z_INDEX,
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

    const unreadNotifications = notifications.filter((n) => !n.read);
    const readNotifications = notifications.filter((n) => n.read);

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

    const modalRoot = typeof document !== 'undefined'
        ? document.getElementById('modal-root')
        : null;
    if (!modalRoot) return null;

    return createPortal(
        <StyledModalOverlay onClick={onClose} role="dialog" aria-modal="true">
            <StyledModalDetail ref={dialogRef} onClick={(e) => e.stopPropagation()}>
                <StyledHeader>
                    <StyledHeaderTitleGroup>
                        <h3>전체 알림(최근 7일)</h3>
                    </StyledHeaderTitleGroup>
                    {unreadNotifications.length > 0 && (
                        <button type="button" onClick={markAllRead}>모두 읽음</button>
                    )}
                </StyledHeader>
                <StyledBody>
                    <StyledModalBodyInner>
                        {notifications.length === 0 && (
                            <StyledEmpty>알림이 없습니다</StyledEmpty>
                        )}
                        {unreadNotifications.length > 0 && (
                            <>
                                <StyledSectionLabel>미확인 알림</StyledSectionLabel>
                                {unreadNotifications.map((n) => (
                                    <StyledModalItem key={n.id}
                                                     $unread
                                                     onClick={() => handleClick(n)}>
                                        {n.type === 'conflict' ? (
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
                                        ) : (
                                            <StyledItemText>
                                                <span className="date">{formatDate(n.appointmentDate)}</span>
                                                <span className="time">{n.appointmentTime}</span>
                                                <span className="name">{n.customerName}</span>
                                                <span className="suffix">고객님</span>
                                                <StyledNaverTag>네이버예약</StyledNaverTag>
                                                <span className="suffix">완료</span>
                                            </StyledItemText>
                                        )}
                                        <StyledDesignerMeta>
                                            <span>디자이너</span>
                                            <DesignerLabel color={getDesignerColor(n.designerName, designers)}
                                                           name={n.designerName} />
                                        </StyledDesignerMeta>
                                        <StyledFlag>안읽음</StyledFlag>
                                    </StyledModalItem>
                                ))}
                            </>
                        )}
                        {readNotifications.length > 0 && (
                            <>
                                <StyledSectionLabel>확인한 알림</StyledSectionLabel>
                                {readNotifications.map((n) => (
                                    <StyledModalItem key={n.id}
                                                     $unread={false}
                                                     onClick={() => handleClick(n)}>
                                        {n.type === 'conflict' ? (
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
                                        ) : (
                                            <StyledItemText>
                                                <span className="date">{formatDate(n.appointmentDate)}</span>
                                                <span className="time">{n.appointmentTime}</span>
                                                <span className="name">{n.customerName}</span>
                                                <span className="suffix">고객님</span>
                                                <StyledNaverTag>네이버예약</StyledNaverTag>
                                                <span className="suffix">완료</span>
                                            </StyledItemText>
                                        )}
                                        <StyledDesignerMeta>
                                            <span>디자이너</span>
                                            <DesignerLabel color={getDesignerColor(n.designerName, designers)}
                                                           name={n.designerName} />
                                        </StyledDesignerMeta>
                                        <StyledFlag>읽음</StyledFlag>
                                    </StyledModalItem>
                                ))}
                            </>
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

// ── Styles ──

const StyledContainer = styled.div`
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
`;

const StyledBellButton = styled.button`
    position: relative;
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

const StyledBadge = styled.span`
    position: absolute;
    top: 2px;
    right: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    box-sizing: border-box;
    border-radius: 999px;
    color: #fff;
    background: var(--danger-color);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
`;

const StyledPanel = styled.div`
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 4px;
    width: 320px;
    max-height: 400px;
    background: var(--white-color);
    border: 1px solid var(--modal-border);
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
    display: flex;
    flex-direction: column;
    z-index: 200;
`;

const StyledPanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--light-gray-color);
    flex-shrink: 0;
`;

const StyledPanelTitle = styled.span`
    font-size: var(--font);
    font-weight: 700;
    color: var(--black-color);
`;

const StyledMarkReadButton = styled.button`
    background: none;
    border: none;
    color: var(--blue-color);
    font-size: var(--small-font);
    cursor: pointer;
    padding: 0;
`;

const StyledPanelBody = styled.div`
    overflow-y: auto;
    flex: 1;
    min-height: 0;
`;

const StyledSectionLabel = styled.div`
    position: sticky;
    top: 0;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 700;
    color: var(--dark-gray-color2);
    letter-spacing: 0.02em;
    background: rgba(255, 255, 255, .1); /* 살짝만 흰색 */
    backdrop-filter: var(--sticky-backdrop);
`;

const StyledUnreadDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--blue-color);
    flex-shrink: 0;
`;

const StyledFlag = styled.span`
    grid-row: 1 / 3;
    grid-column: 2 / 3;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--dark-gray-color);
    font-size: var(--tiny-font);
    white-space: nowrap;
`;

const StyledEmpty = styled.div`
    padding: 32px 12px;
    text-align: center;
    font-size: var(--font);
    color: var(--dark-gray-color2);
`;

const StyledItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background-color: #f0f8ff;
    border-bottom: 1px solid var(--gray-color2);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: #e3f1fc;
        }
    }

    &:last-child {
        border-bottom: none;
    }
`;

const StyledItemText = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    font-size: var(--small-font);
    color: var(--black-color);

    .date {
        font-weight: 700;
    }

    .time {
        color: var(--dark-gray-color2);
    }

    .name {
        font-weight: 600;
    }

    .suffix {
        color: var(--dark-gray-color);
    }
`;

const StyledConflictItemText = styled.div`
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 6px;
    font-size: var(--small-font);
    color: var(--black-color);

    .message {
        flex: 1;
        min-width: 0;
        line-height: 1.45;
        word-break: keep-all;
    }

    .date {
        font-weight: 800;
        color: #111827;
    }

    .time {
        color: var(--dark-gray-color2);
    }

    .name {
        font-weight: 700;
        color: #111827;
    }

    .suffix {
        color: var(--dark-gray-color);
    }
`;

const StyledNaverTag = styled(LabelBadge).attrs({
    $tone: 'brand',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

const StyledConflictTag = styled(LabelBadge).attrs({
    $tone: 'danger',
    $shape: 'soft',
    $size: 'sm',
})`
    font-size: 10px;
`;

const StyledStatusTag = styled(LabelBadge).attrs<{ $status?: SyncNotification['conflictStatus'] }>((props) => ({
    $tone: props.$status === 'deferred' ? 'warning' : props.$status === 'confirmed' ? 'success' : 'danger',
    $shape: 'soft',
    $size: 'sm',
}))<{ $status?: SyncNotification['conflictStatus'] }>`
    font-size: 10px;
`;

const StyledDesignerMeta = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--dark-gray-color2);

    ${StyledDesignerLabel} {
        gap: 4px;
    }
`;

const StyledPanelFooter = styled.div`
    display: flex;
    justify-content: center;
    padding: 8px 12px;
    border-top: 1px solid var(--light-gray-color);
    flex-shrink: 0;
`;

const StyledShowAllButton = styled.button`
    background: none;
    border: none;
    color: var(--blue-color);
    font-size: var(--small-font);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
`;

// Modal-specific styles
const StyledModalOverlay = styled(StyledOverlay)`
    z-index: ${OVERLAY_Z_INDEX.detail};
`;

const StyledModalDetail = styled(StyledDetail)`
    max-width: min(440px, 90vw);
`;

const StyledModalBodyInner = styled(StyledBodyInner)`
    padding: 0;
`;

const StyledModalItem = styled.div<{ $unread: boolean }>`
    display: grid;
    grid-template-columns: 1fr 30px;
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
    padding: 4px 8px;
    background-color: ${(props) => props.$unread ? '#f0f8ff' : 'transparent'};
    border-bottom: 1px solid var(--gray-color2);
    cursor: pointer;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background-color: ${(props) => props.$unread ? '#e3f1fc' : 'var(--gray-color2)'};
        }
    }

    &:last-child {
        border-bottom: none;
    }
`;
